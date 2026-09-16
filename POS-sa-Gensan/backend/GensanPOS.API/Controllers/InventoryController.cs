using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly IInventoryExportService _exportService;

    public InventoryController(IInventoryService inventoryService, IInventoryExportService exportService)
    {
        _inventoryService = inventoryService;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<InventorySummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _inventoryService.GetSummaryAsync(IsOwner, cancellationToken);
        return Ok(ApiResponse<InventorySummaryDto>.Ok(summary));
    }

    [HttpGet("on-hand")]
    public async Task<ActionResult> GetOnHand(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] Guid? productId,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (page > 0)
        {
            var paged = await _inventoryService.GetOnHandPagedAsync(
                search, categoryId, productId, lowStockOnly, IsOwner, page, pageSize, cancellationToken);
            return Ok(ApiResponse<PagedResult<InventoryOnHandDto>>.Ok(paged));
        }

        var rows = await _inventoryService.GetOnHandAsync(
            search, categoryId, productId, lowStockOnly, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<InventoryOnHandDto>>.Ok(rows));
    }

    [HttpGet]
    public async Task<ActionResult> GetTransactions(
        [FromQuery] InventorySearchQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page > 0)
        {
            var paged = await _inventoryService.GetTransactionsPagedAsync(query, cancellationToken);
            return Ok(ApiResponse<PagedResult<InventoryTransactionDto>>.Ok(paged));
        }

        var transactions = await _inventoryService.GetTransactionsAsync(query.ProductId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<InventoryTransactionDto>>.Ok(transactions));
    }

    [HttpGet("export/on-hand")]
    public async Task<IActionResult> ExportOnHand(
        [FromQuery] string format = "excel",
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] bool? lowStockOnly = null,
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportOnHandPdfAsync(search, categoryId, lowStockOnly, IsOwner, cancellationToken)
            : await _exportService.ExportOnHandExcelAsync(search, categoryId, lowStockOnly, IsOwner, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"inventory-on-hand-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("export/movements")]
    public async Task<IActionResult> ExportMovements(
        [FromQuery] InventorySearchQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportMovementsPdfAsync(query, cancellationToken)
            : await _exportService.ExportMovementsExcelAsync(query, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"inventory-movements-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("stock-list")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<InventoryStockListReportDto>>> GetStockList(
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] bool? lowStockOnly = null,
        CancellationToken cancellationToken = default)
    {
        var report = await _inventoryService.GetStockListReportAsync(
            search, categoryId, lowStockOnly, cancellationToken);
        return Ok(ApiResponse<InventoryStockListReportDto>.Ok(report));
    }

    [HttpGet("export/stock-list")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<IActionResult> ExportStockList(
        [FromQuery] string format = "pdf",
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] bool? lowStockOnly = null,
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportStockListPdfAsync(search, categoryId, lowStockOnly, cancellationToken)
            : await _exportService.ExportStockListExcelAsync(search, categoryId, lowStockOnly, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"inventory-stock-list-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpPost("adjust")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<InventoryTransactionDto>>> Adjust(
        [FromBody] AdjustInventoryRequest request,
        CancellationToken cancellationToken)
    {
        var transaction = await _inventoryService.AdjustAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<InventoryTransactionDto>.Ok(transaction, "Inventory adjusted"));
    }
}
