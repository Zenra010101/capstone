using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Returns;

namespace GensanPOS.Application.Interfaces;

public interface IGoodsReturnSlipService
{
    Task<SaleForReturnDto?> LookupSaleAsync(string saleNumber, CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> CreateAsync(CreateGoodsReturnSlipRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> GetByIdAsync(Guid id, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<PagedResult<GoodsReturnSlipDto>> GetListPagedAsync(
        GoodsReturnSlipListQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> VoidAsync(Guid id, VoidGoodsReturnSlipRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> ApproveAsync(Guid id, ApproveGoodsReturnSlipRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> RejectAsync(Guid id, RejectGoodsReturnSlipRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<GoodsReturnSlipDto> CancelAsync(Guid id, CancelGoodsReturnSlipRequest request, Guid userId, string role, CancellationToken cancellationToken = default);
}
