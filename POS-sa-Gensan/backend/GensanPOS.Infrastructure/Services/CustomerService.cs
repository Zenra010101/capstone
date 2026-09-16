using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using CustomerLedgerEntryDto = GensanPOS.Application.DTOs.Customers.CustomerLedgerEntryDto;
using GensanPOS.Application.DTOs.Customers;
using GensanPOS.Application.DTOs.Receivables;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly IReceivableRepository _receivableRepository;
    private readonly AppDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public CustomerService(
        ICustomerRepository customerRepository,
        IReceivableRepository receivableRepository,
        AppDbContext context,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _customerRepository = customerRepository;
        _receivableRepository = receivableRepository;
        _context = context;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<CustomersSummaryDto> GetSummaryAsync(
        string? search,
        bool includeInactive,
        CancellationToken cancellationToken = default)
    {
        var customers = BuildFilteredCustomersQuery(search, includeInactive);
        var today = DateTime.UtcNow.Date;

        var totalCount = await customers.CountAsync(cancellationToken);

        var receivableQuery = _context.CustomerReceivables.AsNoTracking()
            .Where(r => r.RemainingBalance > 0 && customers.Any(c => c.Id == r.CustomerId));

        var totalOutstanding = await receivableQuery.SumAsync(r => (decimal?)r.RemainingBalance, cancellationToken) ?? 0;
        var withBalanceCount = await receivableQuery.Select(r => r.CustomerId).Distinct().CountAsync(cancellationToken);
        var overdueCustomers = await receivableQuery
            .Where(r => r.DueDate.Date < today)
            .Select(r => r.CustomerId)
            .Distinct()
            .CountAsync(cancellationToken);

        return new CustomersSummaryDto
        {
            TotalCount = totalCount,
            WithBalanceCount = withBalanceCount,
            TotalOutstanding = totalOutstanding,
            OverdueCustomersCount = overdueCustomers
        };
    }

    public async Task<PagedResult<CustomerDto>> GetPagedAsync(
        CustomerListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);

        var (customers, totalCount) = await _customerRepository.SearchPagedAsync(
            query.Search, query.IncludeInactive, page, pageSize, cancellationToken);

        var metrics = await LoadBatchMetricsAsync(customers.Select(c => c.Id).ToList(), cancellationToken);
        var items = customers.Select(c => MapCustomerDto(c, metrics.GetValueOrDefault(c.Id))).ToList();

        return new PagedResult<CustomerDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllAsync(
        string? search,
        bool includeInactive,
        CancellationToken cancellationToken = default)
    {
        var customers = await _customerRepository.SearchAsync(search, includeInactive, cancellationToken);
        var metrics = await LoadBatchMetricsAsync(customers.Select(c => c.Id).ToList(), cancellationToken);
        return customers.Select(c => MapCustomerDto(c, metrics.GetValueOrDefault(c.Id))).ToList();
    }

    public async Task<CustomerDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var c = await _customerRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Customer not found");
        return MapCustomerDto(c, await LoadSingleMetricsAsync(c.Id, cancellationToken));
    }

    public async Task<CustomerProfileDto> GetProfileAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Customer not found");

        var customerDto = MapCustomerDto(customer, await LoadSingleMetricsAsync(customer.Id, cancellationToken));
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;

        var receivables = await _receivableRepository.GetListAsync(
            filterUserId, id, null, null, null, false, null, null, null, cancellationToken);

        var today = DateTime.UtcNow.Date;
        var open = receivables.Where(r => r.RemainingBalance > 0).ToList();
        var overdue = open.Where(r => r.DueDate.Date < today).ToList();

        var recentPayments = receivables
            .SelectMany(r => r.Payments
                .Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending)
                .Select(p => (r, p)))
            .OrderByDescending(x => x.p.PaymentDate)
            .Take(15)
            .Select(x => MapPayment(x.p, x.r.Sale?.SaleNumber))
            .ToList();

        var salesQuery = _context.Sales.AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Cheque)
            .Where(s => s.CustomerId == id && s.Status == SaleStatus.Completed);

        if (filterUserId.HasValue)
            salesQuery = salesQuery.Where(s => s.UserId == filterUserId.Value);

        var recentSales = await salesQuery
            .OrderByDescending(s => s.CreatedAt)
            .Take(15)
            .Select(s => new CustomerSaleSummaryDto
            {
                Id = s.Id,
                SaleNumber = s.SaleNumber,
                CreatedAt = s.CreatedAt,
                TotalAmount = s.TotalAmount,
                PaymentMethod = s.PaymentMethod,
                Status = s.Status,
                CashierName = s.User != null ? s.User.FullName : ""
            })
            .ToListAsync(cancellationToken);

        var chequesQuery = _context.Sales.AsNoTracking()
            .Include(s => s.Cheque)
            .Where(s => s.CustomerId == id && s.Status == SaleStatus.Completed && s.Cheque != null);
        if (filterUserId.HasValue)
            chequesQuery = chequesQuery.Where(s => s.UserId == filterUserId.Value);

        var cheques = await chequesQuery
            .OrderByDescending(s => s.Cheque!.MaturityDate)
            .Take(10)
            .Select(s => new CustomerChequeSummaryDto
            {
                SaleNumber = s.SaleNumber,
                BankName = s.Cheque!.BankName,
                ChequeNumber = s.Cheque.ChequeNumber,
                MaturityDate = s.Cheque.MaturityDate,
                Status = s.Cheque.Status,
                SaleTotal = s.TotalAmount
            })
            .ToListAsync(cancellationToken);

        return new CustomerProfileDto
        {
            Customer = customerDto,
            TotalOutstanding = open.Sum(r => r.RemainingBalance),
            OverdueAmount = overdue.Sum(r => r.RemainingBalance),
            OpenReceivableCount = open.Count,
            Receivables = receivables.Select(MapReceivable).OrderByDescending(r => r.CreatedAt).ToList(),
            RecentPayments = recentPayments,
            RecentSales = recentSales,
            Cheques = cheques,
            BouncedCheques = await LoadBouncedHistoryAsync(id, cancellationToken)
        };
    }

    private async Task<IReadOnlyList<BouncedChequeHistoryDto>> LoadBouncedHistoryAsync(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var list = await _context.BouncedChequeHistories.AsNoTracking()
            .Include(h => h.ProcessedByUser)
            .Where(h => h.CustomerId == customerId)
            .OrderByDescending(h => h.BouncedDate)
            .Take(50)
            .ToListAsync(cancellationToken);

        return list.Select(h => new BouncedChequeHistoryDto
        {
            Id = h.Id,
            SaleChequeId = h.SaleChequeId,
            ChequeNumber = h.ChequeNumber,
            BankName = h.BankName,
            Branch = h.Branch,
            CustomerName = h.CustomerName,
            CustomerId = h.CustomerId,
            InvoiceNumber = h.InvoiceNumber,
            Amount = h.Amount,
            MaturityDate = h.MaturityDate,
            BouncedDate = h.BouncedDate,
            Reason = h.Reason,
            PenaltyAmount = h.PenaltyAmount,
            ProcessedByName = h.ProcessedByUser?.FullName ?? "",
            CreatedAt = h.CreatedAt
        }).ToList();
    }

    public async Task<CustomerLedgerDetailDto> GetLedgerAsync(
        Guid customerId,
        CustomerLedgerQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(customerId, cancellationToken)
            ?? throw new NotFoundException("Customer not found");

        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var receivables = await _receivableRepository.GetListAsync(
            filterUserId, customerId, null, null, null, false, null, null, null, cancellationToken);

        var today = DateTime.UtcNow.Date;
        var rawEntries = new List<(DateTime SortDate, CustomerLedgerEntryDto Entry)>();

        foreach (var r in receivables)
        {
            var invoice = r.Sale?.SaleNumber ?? "";
            var isOverdue = r.RemainingBalance > 0 && r.DueDate.Date < today;

            if (query.UnpaidOnly && r.RemainingBalance <= 0) continue;
            if (query.OverdueOnly && !isOverdue) continue;
            if (!string.IsNullOrWhiteSpace(query.Invoice) &&
                !invoice.Contains(query.Invoice.Trim(), StringComparison.OrdinalIgnoreCase))
                continue;

            if (ShouldIncludeDate(r.CreatedAt, query))
            {
                rawEntries.Add((r.CreatedAt, new CustomerLedgerEntryDto
                {
                    Date = r.CreatedAt,
                    Type = "Sale (Charge)",
                    InvoiceNumber = invoice,
                    Description = $"Charged sale — {r.CustomerName}",
                    Debit = r.TotalAmount,
                    Credit = 0,
                    ProcessedBy = r.Sale?.User?.FullName
                }));
            }

            foreach (var p in r.Payments.Where(x => !x.IsVoided).OrderBy(x => x.PaymentDate))
            {
                if (!ShouldIncludeDate(p.PaymentDate, query)) continue;
                if (query.PaymentMethod.HasValue && !p.IsCredit &&
                    p.PaymentMethod != query.PaymentMethod) continue;

                if (p.IsChequePending)
                {
                    rawEntries.Add((p.PaymentDate, new CustomerLedgerEntryDto
                    {
                        Date = p.PaymentDate,
                        Type = "Cheque (pending)",
                        InvoiceNumber = invoice,
                        Description = p.Notes ?? "Awaiting clearance",
                        Debit = 0,
                        Credit = 0,
                        PaymentMethod = "Cheque",
                        ProcessedBy = p.RecordedByUser?.FullName
                    }));
                    continue;
                }

                rawEntries.Add((p.PaymentDate, new CustomerLedgerEntryDto
                {
                    Date = p.PaymentDate,
                    Type = p.IsCredit ? "Return credit" : "Payment",
                    InvoiceNumber = invoice,
                    Description = p.Notes ?? (p.IsCredit ? "GRS credit" : "Customer payment"),
                    Debit = 0,
                    Credit = p.Amount,
                    PaymentMethod = p.IsCredit ? "Credit" : p.PaymentMethod?.ToString(),
                    ProcessedBy = p.RecordedByUser?.FullName
                }));
            }
        }

        var penalties = await _context.BouncedChequeHistories.AsNoTracking()
            .Include(h => h.ProcessedByUser)
            .Where(h => h.CustomerId == customerId && h.PenaltyAmount > 0)
            .ToListAsync(cancellationToken);

        foreach (var h in penalties)
        {
            if (!ShouldIncludeDate(h.BouncedDate, query)) continue;
            rawEntries.Add((h.BouncedDate, new CustomerLedgerEntryDto
            {
                Date = h.BouncedDate,
                Type = "Bounced cheque penalty",
                InvoiceNumber = h.InvoiceNumber,
                Description = $"Penalty — {h.Reason}",
                Debit = h.PenaltyAmount,
                Credit = 0,
                ProcessedBy = h.ProcessedByUser?.FullName
            }));
        }

        var sorted = rawEntries.OrderBy(e => e.SortDate).ThenBy(e => e.Entry.Type).ToList();
        decimal running = 0;
        var entries = new List<CustomerLedgerEntryDto>();
        foreach (var (_, entry) in sorted)
        {
            running += entry.Debit - entry.Credit;
            entry.RunningBalance = running;
            entries.Add(entry);
        }

        var totalPurchases = await _context.Sales.AsNoTracking()
            .Where(s => s.CustomerId == customerId && s.Status == SaleStatus.Completed)
            .Where(s => !filterUserId.HasValue || s.UserId == filterUserId.Value)
            .SumAsync(s => (decimal?)s.TotalAmount, cancellationToken) ?? 0;

        var totalPayments = receivables
            .SelectMany(r => r.Payments.Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending))
            .Where(p => !query.From.HasValue || p.PaymentDate >= query.From.Value.Date)
            .Where(p => !query.To.HasValue || p.PaymentDate < query.To.Value.Date.AddDays(1))
            .Sum(p => p.Amount);

        var open = receivables.Where(r => r.RemainingBalance > 0).ToList();

        return new CustomerLedgerDetailDto
        {
            CustomerId = customerId,
            CustomerName = customer.Name,
            CurrentBalance = open.Sum(r => r.RemainingBalance),
            TotalPurchases = totalPurchases,
            TotalPayments = totalPayments,
            OverdueAmount = open.Where(r => r.DueDate.Date < today).Sum(r => r.RemainingBalance),
            Entries = entries
        };
    }

    public Task<string> GetNextCustomerCodeAsync(CancellationToken cancellationToken = default) =>
        _customerRepository.GenerateCustomerCodeAsync(cancellationToken);

    public async Task<CustomerDto> CreateAsync(
        CreateCustomerRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new AppException("Customer name is required");

        var enableCredit = request.EnableCredit || request.CustomerType == CustomerType.CreditAccount;
        var creditLimit = enableCredit ? Math.Max(0, request.CreditLimit) : 0;

        var customerCode = string.IsNullOrWhiteSpace(request.CustomerCode)
            ? await _customerRepository.GenerateCustomerCodeAsync(cancellationToken)
            : request.CustomerCode.Trim().ToUpperInvariant();

        var customer = new Customer
        {
            CustomerCode = customerCode,
            Name = request.Name.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            Notes = request.Notes?.Trim(),
            CustomerType = request.CustomerType,
            EnableCredit = enableCredit,
            CreditLimit = creditLimit,
            PaymentTerms = request.PaymentTerms,
            DueDays = Math.Max(0, request.DueDays),
            CustomPaymentTerms = request.PaymentTerms == SupplierPaymentTerms.Custom
                ? request.CustomPaymentTerms?.Trim()
                : null,
            AllowCheque = request.AllowCheque,
            IsActive = request.IsActive && !request.IsBlacklisted && !request.IsBlocked,
            IsBlocked = request.IsBlocked,
            IsBlacklisted = request.IsBlacklisted,
            CreatedByUserId = userId
        };

        await _customerRepository.AddAsync(customer, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "CREATE", "Customer", customer.Id.ToString(),
            $"Created customer {customer.Name} (type {customer.CustomerType}, credit limit {customer.CreditLimit:C})",
            null, cancellationToken);

        return MapCustomerDto(customer, await LoadSingleMetricsAsync(customer.Id, cancellationToken));
    }

    public async Task<CustomerDto> UpdateAsync(
        Guid id,
        UpdateCustomerRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Customer not found");

        var oldLimit = customer.CreditLimit;
        customer.Name = request.Name.Trim();
        customer.Phone = request.Phone?.Trim();
        customer.Email = request.Email?.Trim();
        customer.Address = request.Address?.Trim();
        customer.Notes = request.Notes?.Trim();
        customer.CustomerType = request.CustomerType;
        customer.EnableCredit = request.EnableCredit || request.CustomerType == CustomerType.CreditAccount;
        customer.CreditLimit = customer.EnableCredit ? Math.Max(0, request.CreditLimit) : 0;
        customer.PaymentTerms = request.PaymentTerms;
        customer.DueDays = Math.Max(0, request.DueDays);
        customer.CustomPaymentTerms = request.PaymentTerms == SupplierPaymentTerms.Custom
            ? request.CustomPaymentTerms?.Trim()
            : null;
        customer.AllowCheque = request.AllowCheque;
        customer.IsActive = request.IsActive && !request.IsBlacklisted && !request.IsBlocked;
        customer.IsBlocked = request.IsBlocked;
        customer.IsBlacklisted = request.IsBlacklisted;

        await _customerRepository.UpdateAsync(customer, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var details = $"Updated customer {customer.Name}";
        if (oldLimit != customer.CreditLimit)
            details += $" — credit limit {oldLimit:C} → {customer.CreditLimit:C}";

        await _auditService.LogAsync(userId, null, "UPDATE", "Customer", id.ToString(), details, null, cancellationToken);

        return MapCustomerDto(customer, await LoadSingleMetricsAsync(customer.Id, cancellationToken));
    }

    private IQueryable<Customer> BuildFilteredCustomersQuery(string? search, bool includeInactive)
    {
        var query = _context.Customers.AsNoTracking();
        if (!includeInactive)
            query = query.Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)) ||
                c.CustomerCode.ToLower().Contains(term));
        }

        return query;
    }

    private sealed record CustomerMetricsRow(
        decimal Outstanding,
        int OverdueCount,
        DateTime? LastPurchase,
        DateTime? LastPayment,
        decimal TotalPurchases,
        int BouncedCount,
        DateTime? LastBounced);

    private async Task<CustomerMetricsRow> LoadSingleMetricsAsync(Guid customerId, CancellationToken cancellationToken)
    {
        var dict = await LoadBatchMetricsAsync([customerId], cancellationToken);
        return dict.GetValueOrDefault(customerId) ?? EmptyMetrics();
    }

    private static CustomerMetricsRow EmptyMetrics() => new(0, 0, null, null, 0, 0, null);

    private async Task<IReadOnlyDictionary<Guid, CustomerMetricsRow>> LoadBatchMetricsAsync(
        IReadOnlyList<Guid> customerIds,
        CancellationToken cancellationToken)
    {
        if (customerIds.Count == 0)
            return new Dictionary<Guid, CustomerMetricsRow>();

        var ids = customerIds.Distinct().ToList();
        var today = DateTime.UtcNow.Date;

        var outstanding = await _context.CustomerReceivables.AsNoTracking()
            .Where(r => r.CustomerId != null && ids.Contains(r.CustomerId.Value) && r.RemainingBalance > 0)
            .GroupBy(r => r.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Total = g.Sum(r => r.RemainingBalance) })
            .ToListAsync(cancellationToken);

        var overdue = await _context.CustomerReceivables.AsNoTracking()
            .Where(r => r.CustomerId != null && ids.Contains(r.CustomerId.Value) && r.RemainingBalance > 0 && r.DueDate.Date < today)
            .GroupBy(r => r.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var lastPurchase = await _context.Sales.AsNoTracking()
            .Where(s => s.CustomerId != null && ids.Contains(s.CustomerId.Value) && s.Status == SaleStatus.Completed)
            .GroupBy(s => s.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Last = g.Max(s => s.CreatedAt) })
            .ToListAsync(cancellationToken);

        var lastPayment = await _context.ReceivablePayments.AsNoTracking()
            .Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending
                && p.CustomerReceivable.CustomerId != null
                && ids.Contains(p.CustomerReceivable.CustomerId.Value))
            .GroupBy(p => p.CustomerReceivable.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Last = g.Max(p => p.PaymentDate) })
            .ToListAsync(cancellationToken);

        var totalPurchases = await _context.Sales.AsNoTracking()
            .Where(s => s.CustomerId != null && ids.Contains(s.CustomerId.Value) && s.Status == SaleStatus.Completed)
            .GroupBy(s => s.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Total = g.Sum(s => s.TotalAmount) })
            .ToListAsync(cancellationToken);

        var bounced = await _context.BouncedChequeHistories.AsNoTracking()
            .Where(h => h.CustomerId != null && ids.Contains(h.CustomerId.Value))
            .GroupBy(h => h.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Count = g.Count(), Last = g.Max(h => h.BouncedDate) })
            .ToListAsync(cancellationToken);

        var dict = ids.ToDictionary(id => id, _ => EmptyMetrics());

        foreach (var row in outstanding)
            dict[row.CustomerId] = dict[row.CustomerId] with { Outstanding = row.Total };
        foreach (var row in overdue)
            dict[row.CustomerId] = dict[row.CustomerId] with { OverdueCount = row.Count };
        foreach (var row in lastPurchase)
            dict[row.CustomerId] = dict[row.CustomerId] with { LastPurchase = row.Last };
        foreach (var row in lastPayment)
            dict[row.CustomerId] = dict[row.CustomerId] with { LastPayment = row.Last };
        foreach (var row in totalPurchases)
            dict[row.CustomerId] = dict[row.CustomerId] with { TotalPurchases = row.Total };
        foreach (var row in bounced)
            dict[row.CustomerId] = dict[row.CustomerId] with { BouncedCount = row.Count, LastBounced = row.Last };

        return dict;
    }

    private static CustomerDto MapCustomerDto(Customer c, CustomerMetricsRow? metrics)
    {
        metrics ??= EmptyMetrics();
        var status = ComputeStatus(c, metrics.Outstanding, metrics.OverdueCount);
        var overLimit = c.CreditLimit > 0 && metrics.Outstanding >= c.CreditLimit;

        return new CustomerDto
        {
            Id = c.Id,
            CustomerCode = c.CustomerCode,
            Name = c.Name,
            Phone = c.Phone,
            Email = c.Email,
            Address = c.Address,
            Notes = c.Notes,
            CustomerType = c.CustomerType,
            EnableCredit = c.EnableCredit,
            CreditLimit = c.CreditLimit,
            PaymentTerms = c.PaymentTerms,
            PaymentTermsLabel = SupplierLabels.PaymentTerms(c.PaymentTerms, c.CustomPaymentTerms),
            DueDays = c.DueDays,
            CustomPaymentTerms = c.CustomPaymentTerms,
            AllowCheque = c.AllowCheque,
            OutstandingBalance = metrics.Outstanding,
            IsActive = c.IsActive,
            IsBlacklisted = c.IsBlacklisted,
            Status = status,
            IsOverCreditLimit = overLimit,
            LastPurchaseDate = metrics.LastPurchase,
            LastPaymentDate = metrics.LastPayment,
            TotalPurchases = metrics.TotalPurchases,
            OverdueCount = metrics.OverdueCount,
            HasBouncedCheque = metrics.BouncedCount > 0,
            BouncedChequeCount = metrics.BouncedCount,
            LastBouncedDate = metrics.LastBounced,
            CreatedAt = c.CreatedAt
        };
    }

    private static CustomerAccountStatus ComputeStatus(Customer c, decimal outstanding, int overdueCount)
    {
        if (c.IsBlacklisted) return CustomerAccountStatus.Blacklisted;
        if (c.IsBlocked) return CustomerAccountStatus.Blocked;
        if (!c.IsActive) return CustomerAccountStatus.Inactive;
        if (overdueCount > 0) return CustomerAccountStatus.Overdue;
        return CustomerAccountStatus.Active;
    }

    private static bool ShouldIncludeDate(DateTime date, CustomerLedgerQuery query)
    {
        if (query.From.HasValue && date.Date < query.From.Value.Date) return false;
        if (query.To.HasValue && date.Date >= query.To.Value.Date.AddDays(1)) return false;
        return true;
    }

    private static ReceivableDto MapReceivable(CustomerReceivable r) => new()
    {
        Id = r.Id,
        SaleId = r.SaleId,
        SaleNumber = r.Sale?.SaleNumber ?? "",
        CustomerId = r.CustomerId,
        CustomerName = r.CustomerName,
        TotalAmount = r.TotalAmount,
        PaidAmount = r.PaidAmount,
        RemainingBalance = r.RemainingBalance,
        DueDate = r.DueDate,
        Status = ReceivableStatusHelper.Compute(r.TotalAmount, r.PaidAmount, r.RemainingBalance, r.DueDate),
        DaysOverdue = r.RemainingBalance > 0 && r.DueDate.Date < DateTime.UtcNow.Date
            ? (DateTime.UtcNow.Date - r.DueDate.Date).Days : 0,
        LastPaymentDate = r.Payments
            .Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending)
            .OrderByDescending(p => p.PaymentDate)
            .FirstOrDefault()?.PaymentDate,
        CreatedAt = r.CreatedAt,
        Payments = r.Payments.OrderBy(p => p.PaymentDate).Select(p => MapPayment(p, r.Sale?.SaleNumber)).ToList()
    };

    private static ReceivablePaymentDto MapPayment(ReceivablePayment p, string? invoice) => new()
    {
        Id = p.Id,
        Amount = p.Amount,
        BalanceBefore = p.BalanceBefore,
        BalanceAfter = p.BalanceAfter,
        PaymentDate = p.PaymentDate,
        PaymentMethod = p.PaymentMethod,
        Reference = p.Reference,
        Notes = p.Notes,
        IsCredit = p.IsCredit,
        RecordedByName = p.RecordedByUser?.FullName ?? "",
        InvoiceNumber = invoice,
        CreatedAt = p.CreatedAt
    };
}
