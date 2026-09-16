using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Application.Interfaces;

public interface IProductBatchService
{
    Task<IReadOnlyList<ProductBatchDto>> GetByProductIdAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<ProductBatchDto> CreateAsync(Guid productId, CreateProductBatchRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<ProductBatchDto> AdjustQuantityAsync(Guid batchId, AdjustProductBatchRequest request, Guid userId, CancellationToken cancellationToken = default);
}
