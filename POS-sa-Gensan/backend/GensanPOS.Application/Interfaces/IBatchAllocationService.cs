using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Application.Interfaces;

public interface IBatchAllocationService
{
    Task<BatchAllocationResultDto> AllocateAsync(
        Guid productId,
        int quantity,
        Guid? preferredBatchId = null,
        CancellationToken cancellationToken = default);
}
