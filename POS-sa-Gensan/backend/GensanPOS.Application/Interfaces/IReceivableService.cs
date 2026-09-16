using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Receivables;

namespace GensanPOS.Application.Interfaces;

public interface IReceivableService
{
    Task<IReadOnlyList<ReceivableDto>> GetAllAsync(
        ReceivableListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ReceivableDto>> GetPagedAsync(
        ReceivableListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<ReceivableDto> GetByIdAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken = default);

    Task<ReceivableDto> RecordPaymentAsync(
        Guid receivableId,
        RecordReceivablePaymentRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<ReceivablesSummaryDto> GetSummaryAsync(
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<CustomerLedgerDto> GetCustomerLedgerAsync(
        Guid? customerId,
        string? customerName,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<StatementOfAccountDto> GetStatementOfAccountAsync(
        Guid customerId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
}
