using GensanPOS.Application.DTOs.Products;

namespace GensanPOS.Application.Interfaces;

public interface IProductCatalogImportService
{
    Task<ProductCatalogArchiveResultDto> ArchiveCatalogAsync(
        bool demoProductsOnly,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<ProductCatalogImportResultDto> ImportAsync(
        Stream fileStream,
        string fileName,
        ProductCatalogImportOptionsDto options,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<ProductCatalogImportResultDto> PreviewAsync(
        Stream fileStream,
        string fileName,
        ProductCatalogImportOptionsDto options,
        CancellationToken cancellationToken = default);
}
