using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly IBatchAllocationService _batchAllocationService;
    private readonly IProductBatchService _productBatchService;
    private readonly IAuditService _auditService;

    public ProductsController(
        IProductService productService,
        IBatchAllocationService batchAllocationService,
        IProductBatchService productBatchService,
        IAuditService auditService)
    {
        _productService = productService;
        _batchAllocationService = batchAllocationService;
        _productBatchService = productBatchService;
        _auditService = auditService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ProductSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _productService.GetSummaryAsync(IsOwner, cancellationToken);
        return Ok(ApiResponse<ProductSummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? supplierId,
        [FromQuery] StockStatus? stockStatus,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] bool activeOnly = true,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (page.HasValue)
        {
            var paged = await _productService.GetPagedAsync(
                search, categoryId, supplierId, stockStatus, lowStockOnly, activeOnly, IsOwner,
                page.Value, pageSize, cancellationToken);
            return Ok(ApiResponse<PagedResult<ProductDto>>.Ok(paged));
        }

        var products = await _productService.GetAllAsync(
            search, categoryId, supplierId, stockStatus, lowStockOnly, activeOnly, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductDto>>.Ok(products));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var product = await _productService.GetByIdAsync(id, IsOwner, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(product));
    }

    [HttpGet("{id:guid}/movements")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductMovementDto>>>> GetMovements(
        Guid id, CancellationToken cancellationToken)
    {
        var movements = await _productService.GetMovementsAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductMovementDto>>.Ok(movements));
    }

    [HttpGet("{id:guid}/sales")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductSaleHistoryDto>>>> GetSalesHistory(
        Guid id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var rows = await _productService.GetProductSalesHistoryAsync(
            id, from, to, UserId, User.FindFirstValue(ClaimTypes.Role)!, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductSaleHistoryDto>>.Ok(rows));
    }

    [HttpGet("{id:guid}/sales/export")]
    public async Task<IActionResult> ExportSalesHistory(
        Guid id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(format, "excel", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only Excel export is supported for product sales history"));

        var bytes = await _productService.ExportProductSalesHistoryExcelAsync(
            id, from, to, UserId, User.FindFirstValue(ClaimTypes.Role)!, IsOwner, cancellationToken);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"product-sales-{id:N}-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    [HttpGet("{id:guid}/receiving")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductReceivingHistoryDto>>>> GetReceivingHistory(
        Guid id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var rows = await _productService.GetProductReceivingHistoryAsync(
            id, from, to, UserId, User.FindFirstValue(ClaimTypes.Role)!, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductReceivingHistoryDto>>.Ok(rows));
    }

    [HttpGet("{id:guid}/receiving/export")]
    public async Task<IActionResult> ExportReceivingHistory(
        Guid id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(format, "excel", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(format, "xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only Excel export is supported for product receiving history"));

        var bytes = await _productService.ExportProductReceivingHistoryExcelAsync(
            id, from, to, UserId, User.FindFirstValue(ClaimTypes.Role)!, IsOwner, cancellationToken);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"product-receiving-{id:N}-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    [HttpGet("{id:guid}/price-history")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductPriceHistoryDto>>>> GetPriceHistory(
        Guid id, CancellationToken cancellationToken)
    {
        var history = await _productService.GetPriceHistoryAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductPriceHistoryDto>>.Ok(history));
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetByBarcode(string barcode, CancellationToken cancellationToken)
    {
        var product = await _productService.GetByBarcodeAsync(barcode, IsOwner, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(product));
    }

    [HttpPost("{id:guid}/allocate-batches")]
    public async Task<ActionResult<ApiResponse<BatchAllocationResultDto>>> AllocateBatches(
        Guid id,
        [FromBody] BatchAllocationRequest request,
        CancellationToken cancellationToken)
    {
        if (request.PreferredBatchId.HasValue && !IsOwner)
            throw new ForbiddenException("Only the owner can override FIFO batch allocation");

        var result = await _batchAllocationService.AllocateAsync(
            id, request.Quantity, request.PreferredBatchId, cancellationToken);

        if (request.PreferredBatchId.HasValue)
        {
            await _auditService.LogAsync(
                UserId,
                User.FindFirstValue(ClaimTypes.Email),
                AuditLogCategory.Operational,
                "BATCH_OVERRIDE",
                "ProductBatch",
                request.PreferredBatchId.Value.ToString(),
                $"Manual POS batch preference for product {id}; quantity {request.Quantity}",
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString(),
                "Success",
                "FIFO",
                request.PreferredBatchId.Value.ToString(),
                cancellationToken);
        }

        return Ok(ApiResponse<BatchAllocationResultDto>.Ok(result));
    }

    [HttpGet("{id:guid}/batches")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductBatchDto>>>> GetBatches(
        Guid id,
        CancellationToken cancellationToken)
    {
        var batches = await _productBatchService.GetByProductIdAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductBatchDto>>.Ok(batches));
    }

    [HttpPost("{id:guid}/batches")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ProductBatchDto>>> CreateBatch(
        Guid id,
        [FromBody] CreateProductBatchRequest request,
        CancellationToken cancellationToken)
    {
        var batch = await _productBatchService.CreateAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<ProductBatchDto>.Ok(batch, "Batch created"));
    }

    [HttpPut("batches/{batchId:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ProductBatchDto>>> AdjustBatch(
        Guid batchId,
        [FromBody] AdjustProductBatchRequest request,
        CancellationToken cancellationToken)
    {
        var batch = await _productBatchService.AdjustQuantityAsync(batchId, request, UserId, cancellationToken);
        return Ok(ApiResponse<ProductBatchDto>.Ok(batch, "Batch updated"));
    }

    [HttpGet("validate-barcode")]
    public async Task<ActionResult<ApiResponse<object>>> ValidateBarcode(
        [FromQuery] string barcode,
        [FromQuery] Guid? excludeProductId,
        CancellationToken cancellationToken)
    {
        var available = await _productService.IsBarcodeAvailableAsync(barcode, excludeProductId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { available }));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create(
        [FromBody] CreateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _productService.CreateAsync(request, UserId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, ApiResponse<ProductDto>.Ok(product, "Product created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(
        Guid id, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await _productService.UpdateAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(product, "Product updated"));
    }

    [HttpPost("{id:guid}/generate-barcode")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<GenerateBarcodeResponse>>> GenerateBarcode(
        Guid id, CancellationToken cancellationToken)
    {
        var result = await _productService.GenerateBarcodeAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<GenerateBarcodeResponse>.Ok(result, "Barcode generated"));
    }

    [HttpPost("generate-missing-barcodes")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<BulkGenerateBarcodeResultDto>>> GenerateMissingBarcodes(
        CancellationToken cancellationToken)
    {
        var result = await _productService.GenerateMissingBarcodesAsync(UserId, cancellationToken);
        var message = result.GeneratedCount == 0
            ? "All active products already have barcodes"
            : $"Generated {result.GeneratedCount} barcode(s)";
        return Ok(ApiResponse<BulkGenerateBarcodeResultDto>.Ok(result, message));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _productService.DeleteAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Product deactivated"));
    }

    [HttpGet("lstm-forecast")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LstmForecastDto>>>> GetLstmForecast(
        [FromQuery] DateTime fromMonth,
        [FromQuery] DateTime toMonth,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken)
    {
        var forecast = await _productService.GetLstmForecastAsync(fromMonth, toMonth, categoryId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<LstmForecastDto>>.Ok(forecast));
    }
}
