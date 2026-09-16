using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Interfaces;

public interface IChequeService
{
    Task<IReadOnlyList<ChequeDto>> GetAllAsync(ChequeStatus? status, CancellationToken cancellationToken = default);
    Task<PagedResult<ChequeDto>> GetPagedAsync(
        ChequeStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<ChequeDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ChequeDto> UpdateStatusAsync(
        Guid id,
        UpdateChequeStatusRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BouncedChequeHistoryDto>> GetBouncedHistoryAsync(
        Guid? customerId,
        CancellationToken cancellationToken = default);
    Task<ChequesSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
