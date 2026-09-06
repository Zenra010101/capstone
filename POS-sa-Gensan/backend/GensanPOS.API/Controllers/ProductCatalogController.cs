using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/product-catalog")]
[Authorize(Roles = RoleNames.Owner)]
public class ProductCatalogController : ControllerBase
{
    private readonly IProductCatalogImportService _importService;

    public ProductCatalogController(IProductCatalogImportService importService) =>
        _importService = importService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Soft-delete (archive) existing catalog products. Use demoOnly=true to remove sample SKUs only.</summary>
    [HttpPost("archive")]
    public async Task<ActionResult<ApiResponse<ProductCatalogArchiveResultDto>>> Archive(
        [FromQuery] bool demoOnly = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _importService.ArchiveCatalogAsync(demoOnly, UserId, cancellationToken);
        return Ok(ApiResponse<ProductCatalogArchiveResultDto>.Ok(result));
    }

    /// <summary>Validate import file without writing to the database.</summary>
    [HttpPost("preview")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<ProductCatalogImportResultDto>>> Preview(
        IFormFile file,
        [FromQuery] bool archiveExisting = true,
        [FromQuery] bool archiveDemoOnly = false,
        [FromQuery] bool upsertBySku = true,
        [FromQuery] bool createMissingCategories = true,
        [FromQuery] bool updateStockOnUpsert = false,
        CancellationToken cancellationToken = default)
    {
        if (file.Length == 0)
            return BadRequest(ApiResponse<ProductCatalogImportResultDto>.Fail("Import file is required."));

        await using var stream = file.OpenReadStream();
        var options = BuildOptions(archiveExisting, archiveDemoOnly, upsertBySku, createMissingCategories, updateStockOnUpsert, dryRun: true);
        var result = await _importService.PreviewAsync(stream, file.FileName, options, cancellationToken);
        return Ok(ApiResponse<ProductCatalogImportResultDto>.Ok(result));
    }

    /// <summary>Import client product catalog from CSV or Excel. Archives existing products first by default.</summary>
    [HttpPost("import")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<ProductCatalogImportResultDto>>> Import(
        IFormFile file,
        [FromQuery] bool archiveExisting = true,
        [FromQuery] bool archiveDemoOnly = false,
        [FromQuery] bool upsertBySku = true,
        [FromQuery] bool createMissingCategories = true,
        [FromQuery] bool updateStockOnUpsert = false,
        CancellationToken cancellationToken = default)
    {
        if (file.Length == 0)
            return BadRequest(ApiResponse<ProductCatalogImportResultDto>.Fail("Import file is required."));

        await using var stream = file.OpenReadStream();
        var options = BuildOptions(archiveExisting, archiveDemoOnly, upsertBySku, createMissingCategories, updateStockOnUpsert, dryRun: false);
        var result = await _importService.ImportAsync(stream, file.FileName, options, UserId, cancellationToken);

        if (result.ErrorCount > 0)
            return BadRequest(ApiResponse<ProductCatalogImportResultDto>.Ok(result));

        return Ok(ApiResponse<ProductCatalogImportResultDto>.Ok(result));
    }

    private static ProductCatalogImportOptionsDto BuildOptions(
        bool archiveExisting,
        bool archiveDemoOnly,
        bool upsertBySku,
        bool createMissingCategories,
        bool updateStockOnUpsert,
        bool dryRun) => new()
    {
        ArchiveExistingBeforeImport = archiveExisting,
        ArchiveDemoProductsOnly = archiveDemoOnly,
        UpsertBySku = upsertBySku,
        CreateMissingCategories = createMissingCategories,
        UpdateStockOnUpsert = updateStockOnUpsert,
        DryRun = dryRun,
    };
}
