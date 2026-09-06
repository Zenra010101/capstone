using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Application.DTOs.Customers;
using GensanPOS.Application.DTOs.Receivables;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;

namespace GensanPOS.Infrastructure.Services;

public class ReceivableService : IReceivableService
{
    private readonly IReceivableRepository _receivableRepository;
    private readonly IRepository<ReceivablePayment> _paymentRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IChequeRepository _chequeRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ReceivableService(
        IReceivableRepository receivableRepository,
        IRepository<ReceivablePayment> paymentRepository,
        ICustomerRepository customerRepository,
        IChequeRepository chequeRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _receivableRepository = receivableRepository;
        _paymentRepository = paymentRepository;
        _customerRepository = customerRepository;
        _chequeRepository = chequeRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ReceivableDto>> GetAllAsync(
        ReceivableListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var list = await _receivableRepository.GetListAsync(
            filterUserId,
            query.CustomerId,
            query.CustomerSearch,
            query.From,
            query.To,
            includeArchived: false,
            query.Status,
            query.OverdueOnly,
            query.OpenOnly,
            cancellationToken);

        return list.Select(Map).ToList();
    }

    public async Task<PagedResult<ReceivableDto>> GetPagedAsync(
        ReceivableListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var page = Math.Max(1, query.Page ?? 1);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);

        var (items, totalCount) = await _receivableRepository.GetListPagedAsync(
            filterUserId,
            query.CustomerId,
            query.CustomerSearch,
            query.From,
            query.To,
            includeArchived: false,
            query.Status,
            query.OverdueOnly,
            query.OpenOnly,
            page,
            pageSize,
            cancellationToken);

        return new PagedResult<ReceivableDto>
        {
            Items = items.Select(Map).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ReceivableDto> GetByIdAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var r = await _receivableRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Receivable not found");

        EnsureCanAccess(r, userId, role);
        return Map(r);
    }

    public async Task<ReceivableDto> RecordPaymentAsync(
        Guid receivableId,
        RecordReceivablePaymentRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
            throw new AppException("Payment amount must be greater than zero");

        if (request.PaymentMethod == PaymentMethod.Charged)
            throw new AppException("Use Cash, QRPH, Online Bank, or Cheque for receivable payments");

        var receivable = await _receivableRepository.GetByIdWithDetailsAsync(receivableId, cancellationToken)
            ?? throw new NotFoundException("Receivable not found");

        EnsureCanAccess(receivable, userId, role);

        if (receivable.RemainingBalance <= 0)
            throw new AppException("This account is already fully paid");

        if (request.Amount > receivable.RemainingBalance)
            throw new AppException($"Payment cannot exceed remaining balance of {receivable.RemainingBalance:C}");

        var balanceBefore = receivable.RemainingBalance;
        var invoiceNumber = receivable.Sale?.SaleNumber ?? "";

        if (request.PaymentMethod == PaymentMethod.Cheque)
        {
            if (request.Cheque is null ||
                string.IsNullOrWhiteSpace(request.Cheque.BankName) ||
                string.IsNullOrWhiteSpace(request.Cheque.Branch) ||
                string.IsNullOrWhiteSpace(request.Cheque.ChequeNumber) ||
                string.IsNullOrWhiteSpace(request.Cheque.AccountName))
                throw new AppException("Cheque payment requires bank, branch/address, cheque number, and account name");

            var sale = receivable.Sale
                ?? throw new AppException("Receivable must be linked to a sale for cheque payments");

            if (sale.Cheque is not null)
                throw new AppException("This sale already has a cheque on file");

            var chequeReq = request.Cheque;
            var payment = new ReceivablePayment
            {
                CustomerReceivableId = receivable.Id,
                Amount = request.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceBefore,
                PaymentDate = (request.PaymentDate ?? DateTime.UtcNow).ToUniversalTime(),
                PaymentMethod = PaymentMethod.Cheque,
                Reference = chequeReq.ChequeNumber.Trim(),
                Notes = request.Notes?.Trim() ?? "Pending cheque clearance",
                RecordedByUserId = userId,
                IsChequePending = true
            };
            await _paymentRepository.AddAsync(payment, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var saleCheque = new SaleCheque
            {
                SaleId = sale.Id,
                Type = chequeReq.Type,
                BankName = chequeReq.BankName.Trim(),
                Branch = chequeReq.Branch?.Trim(),
                ChequeNumber = chequeReq.ChequeNumber.Trim(),
                AccountName = chequeReq.AccountName.Trim(),
                Amount = request.Amount,
                MaturityDate = chequeReq.MaturityDate.Date,
                Status = ChequeStatus.Pending,
                Notes = chequeReq.Notes,
                CustomerReceivableId = receivable.Id,
                ReceivablePaymentId = payment.Id
            };
            await _chequeRepository.AddAsync(saleCheque, cancellationToken);
            payment.SaleChequeId = saleCheque.Id;
            await _paymentRepository.UpdateAsync(payment, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            await _auditService.LogAsync(userId, null, "PAYMENT", "CustomerReceivable", receivableId.ToString(),
                $"Cheque {chequeReq.ChequeNumber} registered (pending) on {invoiceNumber} for {request.Amount:C}. Balance unchanged until cleared.",
                null, cancellationToken);

            var savedPending = await _receivableRepository.GetByIdWithDetailsAsync(receivableId, cancellationToken);
            return Map(savedPending!);
        }

        var balanceAfter = balanceBefore - request.Amount;

        var cashPayment = new ReceivablePayment
        {
            CustomerReceivableId = receivable.Id,
            Amount = request.Amount,
            BalanceBefore = balanceBefore,
            BalanceAfter = balanceAfter,
            PaymentDate = (request.PaymentDate ?? DateTime.UtcNow).ToUniversalTime(),
            PaymentMethod = request.PaymentMethod,
            Reference = request.Reference?.Trim(),
            Notes = request.Notes?.Trim(),
            RecordedByUserId = userId
        };

        receivable.PaidAmount += request.Amount;
        receivable.RemainingBalance = balanceAfter;
        receivable.Status = ReceivableStatusHelper.Compute(
            receivable.TotalAmount,
            receivable.PaidAmount,
            receivable.RemainingBalance,
            receivable.DueDate);

        await _paymentRepository.AddAsync(cashPayment, cancellationToken);
        await _receivableRepository.UpdateAsync(receivable, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(userId, null, "PAYMENT", "CustomerReceivable", receivableId.ToString(),
            $"Receivable payment {request.Amount:C} on invoice {invoiceNumber} via {request.PaymentMethod}. " +
            $"Balance {balanceBefore:C} → {balanceAfter:C}. Ref: {request.Reference ?? "—"}",
            null, cancellationToken);

        var saved = await _receivableRepository.GetByIdWithDetailsAsync(receivableId, cancellationToken);
        return Map(saved!);
    }

    public async Task<ReceivablesSummaryDto> GetSummaryAsync(
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;
        var all = await _receivableRepository.GetListAsync(
            filterUserId, null, null, null, null, false, null, null, openOnly: true, cancellationToken);

        var today = DateTime.UtcNow.Date;
        var dtos = all.Select(Map).ToList();
        var open = dtos.Where(d => d.RemainingBalance > 0).ToList();
        var overdue = open.Where(d => d.DueDate.Date < today).ToList();

        var activeCustomers = open
            .Select(d => d.CustomerId?.ToString() ?? d.CustomerName.Trim().ToLower())
            .Distinct()
            .Count();

        return new ReceivablesSummaryDto
        {
            TotalOutstanding = open.Sum(d => d.RemainingBalance),
            CollectedToday = await _receivableRepository.GetCollectedTodayAsync(filterUserId, cancellationToken),
            OverdueAmount = overdue.Sum(d => d.RemainingBalance),
            ActiveCustomersWithBalance = activeCustomers,
            UnpaidCount = open.Count(d => d.PaidAmount == 0),
            PartialCount = open.Count(d => d.PaidAmount > 0 && d.Status == ReceivableStatus.Partial),
            OverdueCount = overdue.Count,
            OverdueReceivables = overdue.OrderBy(d => d.DueDate).Take(10).ToList()
        };
    }

    public async Task<CustomerLedgerDto> GetCustomerLedgerAsync(
        Guid? customerId,
        string? customerName,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filterUserId = RoleNames.IsOwner(role) ? null : (Guid?)userId;

        IReadOnlyList<CustomerReceivable> receivables;
        if (customerId.HasValue)
            receivables = await _receivableRepository.GetListAsync(
                filterUserId, customerId, null, null, null, false, null, null, null, cancellationToken);
        else if (!string.IsNullOrWhiteSpace(customerName))
        {
            receivables = await _receivableRepository.GetListAsync(
                filterUserId, null, customerName.Trim(), null, null, false, null, null, null, cancellationToken);
        }
        else
            throw new AppException("Customer id or name is required");

        var rawEntries = new List<(DateTime Date, CustomerLedgerEntryDto Entry)>();

        foreach (var r in receivables)
        {
            var invoice = r.Sale?.SaleNumber ?? "";
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

            foreach (var p in r.Payments.Where(p => !p.IsVoided))
            {
                if (p.IsChequePending)
                {
                    rawEntries.Add((p.PaymentDate, new CustomerLedgerEntryDto
                    {
                        Date = p.PaymentDate,
                        Type = "Cheque (pending)",
                        InvoiceNumber = invoice,
                        Description = p.Notes ?? "Awaiting cheque clearance",
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
                    Description = p.IsCredit
                        ? (p.Notes ?? "GRS return credit")
                        : (p.Notes ?? $"{p.PaymentMethod} payment"),
                    Debit = 0,
                    Credit = p.Amount,
                    PaymentMethod = p.IsCredit ? "Credit" : p.PaymentMethod?.ToString(),
                    ProcessedBy = p.RecordedByUser?.FullName
                }));
            }
        }

        var sorted = rawEntries.OrderBy(e => e.Date).ThenBy(e => e.Entry.Type).ToList();
        decimal running = 0;
        var entries = new List<CustomerLedgerEntryDto>();
        foreach (var (_, entry) in sorted)
        {
            running += entry.Debit - entry.Credit;
            entry.RunningBalance = running;
            entries.Add(entry);
        }

        return new CustomerLedgerDto
        {
            CustomerId = customerId ?? receivables.FirstOrDefault()?.CustomerId,
            CustomerName = receivables.FirstOrDefault()?.CustomerName ?? customerName ?? "",
            TotalOutstanding = receivables.Where(r => r.RemainingBalance > 0).Sum(r => r.RemainingBalance),
            Entries = entries
        };
    }

    public async Task<StatementOfAccountDto> GetStatementOfAccountAsync(
        Guid customerId,
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
        var openDtos = receivables
            .Where(r => r.RemainingBalance > 0)
            .Select(Map)
            .OrderBy(d => d.DueDate)
            .ToList();

        var recentPayments = receivables
            .SelectMany(r => r.Payments.Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending).Select(p => (r, p)))
            .OrderByDescending(x => x.p.PaymentDate)
            .Take(20)
            .Select(x => MapPayment(x.p, x.r.Sale?.SaleNumber))
            .ToList();

        return new StatementOfAccountDto
        {
            CustomerId = customer.Id,
            CustomerName = customer.Name,
            Phone = customer.Phone,
            Address = customer.Address,
            StatementDate = today,
            TotalOutstanding = openDtos.Sum(d => d.RemainingBalance),
            OverdueAmount = openDtos.Where(d => d.DueDate.Date < today).Sum(d => d.RemainingBalance),
            OpenInvoices = openDtos.Select(d => new StatementInvoiceLineDto
            {
                InvoiceNumber = d.SaleNumber,
                SaleDate = d.CreatedAt,
                DueDate = d.DueDate,
                TotalAmount = d.TotalAmount,
                PaidAmount = d.PaidAmount,
                RemainingBalance = d.RemainingBalance,
                DaysOverdue = d.DaysOverdue,
                Status = d.Status
            }).ToList(),
            RecentPayments = recentPayments
        };
    }

    private static void EnsureCanAccess(CustomerReceivable r, Guid userId, string role)
    {
        if (RoleNames.IsOwner(role)) return;
        if (r.Sale?.UserId == userId) return;
        throw new ForbiddenException("You can only access receivables for your own sales");
    }

    private static ReceivableDto Map(CustomerReceivable r)
    {
        var today = DateTime.UtcNow.Date;
        var status = ReceivableStatusHelper.Compute(
            r.TotalAmount, r.PaidAmount, r.RemainingBalance, r.DueDate);
        var lastPayment = r.Payments
            .Where(p => !p.IsCredit)
            .OrderByDescending(p => p.PaymentDate)
            .FirstOrDefault();

        var daysOverdue = r.RemainingBalance > 0 && r.DueDate.Date < today
            ? (today - r.DueDate.Date).Days
            : 0;

        return new ReceivableDto
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
            Status = status,
            DaysOverdue = daysOverdue,
            LastPaymentDate = lastPayment?.PaymentDate,
            Notes = r.Notes,
            CreatedAt = r.CreatedAt,
            Payments = r.Payments.OrderBy(p => p.PaymentDate).Select(p => MapPayment(p, r.Sale?.SaleNumber)).ToList()
        };
    }

    private static ReceivablePaymentDto MapPayment(ReceivablePayment p, string? invoiceNumber) => new()
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
        InvoiceNumber = invoiceNumber,
        CreatedAt = p.CreatedAt
    };
}
