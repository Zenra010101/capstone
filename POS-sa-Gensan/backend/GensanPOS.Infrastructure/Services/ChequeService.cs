using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class ChequeService : IChequeService
{
    private readonly IChequeRepository _chequeRepository;
    private readonly ISaleRepository _saleRepository;
    private readonly IReceivableRepository _receivableRepository;
    private readonly IRepository<ReceivablePayment> _paymentRepository;
    private readonly AppDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ChequeService(
        IChequeRepository chequeRepository,
        ISaleRepository saleRepository,
        IReceivableRepository receivableRepository,
        IRepository<ReceivablePayment> paymentRepository,
        AppDbContext context,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _chequeRepository = chequeRepository;
        _saleRepository = saleRepository;
        _receivableRepository = receivableRepository;
        _paymentRepository = paymentRepository;
        _context = context;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ChequeDto>> GetAllAsync(ChequeStatus? status, CancellationToken cancellationToken = default)
    {
        var list = await _chequeRepository.GetListAsync(status, cancellationToken);
        return list.Select(Map).ToList();
    }

    public async Task<PagedResult<ChequeDto>> GetPagedAsync(
        ChequeStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 250);

        var (items, totalCount) = await _chequeRepository.GetPagedAsync(
            status, page, pageSize, cancellationToken);

        return new PagedResult<ChequeDto>
        {
            Items = items.Select(Map).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ChequeDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cheque = await _chequeRepository.GetByIdWithSaleAsync(id, cancellationToken)
            ?? throw new NotFoundException("Cheque not found");
        return Map(cheque);
    }

    public async Task<IReadOnlyList<BouncedChequeHistoryDto>> GetBouncedHistoryAsync(
        Guid? customerId,
        CancellationToken cancellationToken = default)
    {
        var q = _context.BouncedChequeHistories.AsNoTracking()
            .Include(h => h.ProcessedByUser)
            .OrderByDescending(h => h.BouncedDate)
            .AsQueryable();

        if (customerId.HasValue)
            q = q.Where(h => h.CustomerId == customerId.Value);

        var list = await q.Take(200).ToListAsync(cancellationToken);
        return list.Select(MapHistory).ToList();
    }

    public async Task<ChequeDto> UpdateStatusAsync(
        Guid id,
        UpdateChequeStatusRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (request.Status == ChequeStatus.Pending)
            throw new AppException("Cannot set status back to pending");

        var cheque = await _chequeRepository.GetByIdWithSaleAsync(id, cancellationToken)
            ?? throw new NotFoundException("Cheque not found");

        if (cheque.Status != ChequeStatus.Pending)
            throw new AppException("Only pending cheques can be updated");

        var sale = await _saleRepository.GetByIdWithDetailsAsync(cheque.SaleId, cancellationToken)
            ?? throw new NotFoundException("Sale not found");

        if (sale.Status != SaleStatus.Completed)
            throw new AppException("Cannot update cheque for a non-completed sale");

        var oldStatus = cheque.Status;
        cheque.Status = request.Status;
        cheque.ProcessedByUserId = userId;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            cheque.Notes = string.IsNullOrWhiteSpace(cheque.Notes)
                ? request.Notes.Trim()
                : cheque.Notes + " | " + request.Notes.Trim();

        if (request.Status == ChequeStatus.Cleared)
        {
            await ApplyClearedAsync(cheque, sale, userId, cancellationToken);
        }
        else if (request.Status == ChequeStatus.Bounced)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
                throw new AppException("Bounce reason is required");

            var penalty = Math.Max(0, request.PenaltyAmount ?? 0);
            if (penalty > 0 && !RoleNames.IsOwner(role))
                throw new ForbiddenException("Only the owner can add a bounced cheque penalty");

            await ApplyBouncedAsync(cheque, sale, request.Reason.Trim(), penalty, userId, cancellationToken);
        }

        await _chequeRepository.UpdateAsync(cheque, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var actionLabel = request.Status == ChequeStatus.Cleared ? "CHEQUE_CLEARED" : "CHEQUE_BOUNCED";
        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, actionLabel, "SaleCheque", id.ToString(),
            $"Cheque {cheque.ChequeNumber} on invoice {sale.SaleNumber}. {request.Reason ?? request.Notes ?? ""}".Trim(),
            null, null, "Success",
            oldStatus.ToString(), request.Status.ToString(), cancellationToken);

        var refreshed = await _chequeRepository.GetByIdWithSaleAsync(id, cancellationToken);
        return Map(refreshed!);
    }

    public async Task<ChequesSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var pending = await _chequeRepository.GetListAsync(ChequeStatus.Pending, cancellationToken);
        return new ChequesSummaryDto
        {
            PendingCount = pending.Count,
            PendingAmount = pending.Sum(c => c.Amount),
            PostDatedPendingCount = pending.Count(c => c.Type == ChequeType.PostDated)
        };
    }

    private async Task ApplyClearedAsync(
        SaleCheque cheque,
        Sale sale,
        Guid userId,
        CancellationToken cancellationToken)
    {
        cheque.ClearedAt = DateTime.UtcNow;

        var receivable = await ResolveReceivableAsync(cheque, sale, cancellationToken)
            ?? throw new AppException("No receivable account linked to this cheque");

        if (receivable.RemainingBalance <= 0)
            throw new AppException("Receivable is already fully paid");

        var applyAmount = Math.Min(cheque.Amount, receivable.RemainingBalance);
        var balanceBefore = receivable.RemainingBalance;
        var balanceAfter = balanceBefore - applyAmount;

        ReceivablePayment payment;
        if (cheque.ReceivablePaymentId.HasValue)
        {
            payment = await _paymentRepository.GetByIdAsync(cheque.ReceivablePaymentId.Value, cancellationToken)
                ?? throw new NotFoundException("Linked cheque payment not found");

            if (!payment.IsChequePending)
                throw new AppException("Cheque payment is not pending clearance");

            payment.IsChequePending = false;
            payment.BalanceAfter = balanceAfter;
            payment.PaymentDate = DateTime.UtcNow;
            payment.Notes = string.IsNullOrWhiteSpace(payment.Notes)
                ? $"Cheque cleared — {cheque.BankName}"
                : payment.Notes + $" | Cleared {DateTime.UtcNow:yyyy-MM-dd}";
            payment.SaleChequeId = cheque.Id;
            await _paymentRepository.UpdateAsync(payment, cancellationToken);
        }
        else
        {
            payment = new ReceivablePayment
            {
                CustomerReceivableId = receivable.Id,
                Amount = applyAmount,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = PaymentMethod.Cheque,
                Reference = cheque.ChequeNumber,
                Notes = $"Cheque cleared — {cheque.BankName}",
                RecordedByUserId = userId,
                SaleChequeId = cheque.Id
            };
            await _paymentRepository.AddAsync(payment, cancellationToken);
        }

        receivable.PaidAmount += applyAmount;
        receivable.RemainingBalance = balanceAfter;
        receivable.Status = ReceivableStatusHelper.Compute(
            receivable.TotalAmount, receivable.PaidAmount, receivable.RemainingBalance, receivable.DueDate);

        await _receivableRepository.UpdateAsync(receivable, cancellationToken);

        cheque.ClearedReceivablePaymentId = payment.Id;
        cheque.CustomerReceivableId ??= receivable.Id;

        if (sale.PaymentMethod == PaymentMethod.Cheque)
            sale.AmountPaid = applyAmount;
        else
            sale.AmountPaid += applyAmount;

        await _saleRepository.UpdateAsync(sale, cancellationToken);

        await _auditService.LogAsync(userId, null, "PAYMENT", "CustomerReceivable", receivable.Id.ToString(),
            $"Cheque {cheque.ChequeNumber} cleared on {sale.SaleNumber}: {applyAmount:C}. Balance {balanceBefore:C} → {balanceAfter:C}",
            null, cancellationToken);
    }

    private async Task ApplyBouncedAsync(
        SaleCheque cheque,
        Sale sale,
        string reason,
        decimal penalty,
        Guid userId,
        CancellationToken cancellationToken)
    {
        cheque.BouncedAt = DateTime.UtcNow;
        cheque.BounceReason = reason;

        var receivable = await ResolveReceivableAsync(cheque, sale, cancellationToken);

        if (cheque.ClearedReceivablePaymentId.HasValue)
            await ReverseClearedPaymentAsync(cheque, receivable, userId, cancellationToken);

        if (cheque.ReceivablePaymentId.HasValue)
        {
            var pending = await _paymentRepository.GetByIdAsync(cheque.ReceivablePaymentId.Value, cancellationToken);
            if (pending is not null)
            {
                pending.IsVoided = true;
                pending.IsChequePending = false;
                pending.Notes = string.IsNullOrWhiteSpace(pending.Notes)
                    ? $"[Bounced] {reason}"
                    : pending.Notes + $" [Bounced] {reason}";
                await _paymentRepository.UpdateAsync(pending, cancellationToken);
            }
        }

        if (receivable is not null)
        {
            receivable = await _receivableRepository.GetByIdWithDetailsAsync(receivable.Id, cancellationToken)
                ?? receivable;

            receivable.PaidAmount = receivable.Payments
                .Where(p => !p.IsCredit && !p.IsVoided && !p.IsChequePending)
                .Sum(p => p.Amount);

            if (penalty > 0)
            {
                receivable.TotalAmount += penalty;
                receivable.Notes = string.IsNullOrWhiteSpace(receivable.Notes)
                    ? $"Bounced cheque penalty +{penalty:C}"
                    : receivable.Notes + $" | Bounced cheque penalty +{penalty:C}";
            }

            receivable.RemainingBalance = receivable.TotalAmount - receivable.PaidAmount;
            receivable.Status = ReceivableStatusHelper.Compute(
                receivable.TotalAmount, receivable.PaidAmount, receivable.RemainingBalance, receivable.DueDate);

            await _receivableRepository.UpdateAsync(receivable, cancellationToken);
            cheque.CustomerReceivableId = receivable.Id;
        }

        sale.AmountPaid = 0;
        await _saleRepository.UpdateAsync(sale, cancellationToken);

        var history = new BouncedChequeHistory
        {
            SaleChequeId = cheque.Id,
            ChequeNumber = cheque.ChequeNumber,
            BankName = cheque.BankName,
            Branch = cheque.Branch,
            CustomerName = sale.Customer?.Name ?? sale.CustomerName ?? "—",
            CustomerId = sale.CustomerId,
            InvoiceNumber = sale.SaleNumber,
            Amount = cheque.Amount,
            MaturityDate = cheque.MaturityDate,
            BouncedDate = cheque.BouncedAt.Value,
            Reason = reason,
            PenaltyAmount = penalty,
            ProcessedByUserId = userId,
            CustomerReceivableId = receivable?.Id
        };
        await _context.BouncedChequeHistories.AddAsync(history, cancellationToken);
    }

    private async Task ReverseClearedPaymentAsync(
        SaleCheque cheque,
        CustomerReceivable? receivable,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var payment = await _paymentRepository.GetByIdAsync(cheque.ClearedReceivablePaymentId!.Value, cancellationToken);
        if (payment is null || receivable is null) return;

        payment.IsVoided = true;
        payment.Notes = string.IsNullOrWhiteSpace(payment.Notes)
            ? "[Voided — cheque bounced]"
            : payment.Notes + " [Voided — cheque bounced]";
        await _paymentRepository.UpdateAsync(payment, cancellationToken);

        cheque.ClearedReceivablePaymentId = null;
    }

    private async Task<CustomerReceivable?> ResolveReceivableAsync(
        SaleCheque cheque,
        Sale sale,
        CancellationToken cancellationToken)
    {
        if (cheque.CustomerReceivableId.HasValue)
        {
            return await _receivableRepository.GetByIdWithDetailsAsync(
                cheque.CustomerReceivableId.Value, cancellationToken);
        }

        var bySale = await _receivableRepository.GetBySaleIdAsync(sale.Id, cancellationToken);
        if (bySale is not null)
        {
            cheque.CustomerReceivableId = bySale.Id;
            return bySale;
        }

        if (cheque.ReceivablePaymentId.HasValue)
        {
            var pending = await _context.ReceivablePayments
                .Include(p => p.CustomerReceivable)
                .FirstOrDefaultAsync(p => p.Id == cheque.ReceivablePaymentId.Value, cancellationToken);
            return pending?.CustomerReceivable;
        }

        return null;
    }

    private static ChequeDto Map(SaleCheque c) => new()
    {
        Id = c.Id,
        SaleId = c.SaleId,
        SaleNumber = c.Sale?.SaleNumber ?? "",
        CustomerId = c.Sale?.CustomerId,
        CustomerName = c.Sale?.CustomerName,
        Type = c.Type,
        Status = c.Status,
        BankName = c.BankName,
        Branch = c.Branch,
        ChequeNumber = c.ChequeNumber,
        AccountName = c.AccountName,
        Amount = c.Amount,
        MaturityDate = c.MaturityDate,
        ClearedAt = c.ClearedAt,
        BouncedAt = c.BouncedAt,
        BounceReason = c.BounceReason,
        Notes = c.Notes,
        CreatedAt = c.CreatedAt
    };

    private static BouncedChequeHistoryDto MapHistory(BouncedChequeHistory h) => new()
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
    };
}
