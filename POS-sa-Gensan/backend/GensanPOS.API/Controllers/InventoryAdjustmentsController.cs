using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/inventory-adjustments")]
[Authorize]
public class InventoryAdjustmentsController : ControllerBase
{
    private readonly IInventoryAdjustmentService _service;
    private readonly IInventoryAdjustmentExportService _exportService;

    public InventoryAdjustmentsController(
        IInventoryAdjustmentService service,
        IInventoryAdjustmentExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<InventoryAdjustmentSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _service.GetSummaryAsync(UserId, Role, cancellationToken);
        return Ok(ApiResponse<InventoryAdjustmentSummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult> Search(
        [FromQuery] InventoryAdjustmentSearchQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page > 0)
        {
            var paged = await _service.SearchPagedAsync(query, UserId, Role, IsOwner, cancellationToken);
            return Ok(ApiResponse<PagedResult<InventoryAdjustmentRequestDto>>.Ok(paged));
        }

        var list = await _service.SearchAsync(query, UserId, Role, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<InventoryAdjustmentRequestDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<InventoryAdjustmentRequestDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, Role, IsOwner, cancellationToken);
        return Ok(ApiResponse<InventoryAdjustmentRequestDto>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<InventoryAdjustmentRequestDto>>> Create(
        [FromBody] CreateInventoryAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        var created = await _service.CreateRequestAsync(request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<InventoryAdjustmentRequestDto>.Ok(
            created,
            "Adjustment request submitted — awaiting owner approval"));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<InventoryAdjustmentRequestDto>>> Approve(
        Guid id,
        [FromBody] ApproveInventoryAdjustmentRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(id, UserId, request, cancellationToken);
        return Ok(ApiResponse<InventoryAdjustmentRequestDto>.Ok(result, "Approved — stock updated with movement record"));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<InventoryAdjustmentRequestDto>>> Reject(
        Guid id,
        [FromBody] RejectInventoryAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(id, UserId, request, cancellationToken);
        return Ok(ApiResponse<InventoryAdjustmentRequestDto>.Ok(result, "Adjustment rejected"));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] InventoryAdjustmentSearchQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportPdfAsync(query, UserId, Role, IsOwner, cancellationToken)
            : await _exportService.ExportExcelAsync(query, UserId, Role, IsOwner, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"inventory-adjustments-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }
}
