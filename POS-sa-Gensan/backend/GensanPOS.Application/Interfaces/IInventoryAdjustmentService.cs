using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Interfaces;

public interface IInventoryAdjustmentService
{
    Task<InventoryAdjustmentSummaryDto> GetSummaryAsync(Guid userId, string role, CancellationToken cancellationToken = default);
    Task<PagedResult<InventoryAdjustmentRequestDto>> SearchPagedAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryAdjustmentRequestDto>> SearchAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<InventoryAdjustmentRequestDto> GetByIdAsync(Guid id, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<InventoryAdjustmentRequestDto> CreateRequestAsync(
        CreateInventoryAdjustmentRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<InventoryAdjustmentRequestDto> ApproveAsync(Guid id, Guid ownerUserId, ApproveInventoryAdjustmentRequest? request, CancellationToken cancellationToken = default);
    Task<InventoryAdjustmentRequestDto> RejectAsync(Guid id, Guid ownerUserId, RejectInventoryAdjustmentRequest request, CancellationToken cancellationToken = default);
}
