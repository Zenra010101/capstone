using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Returns;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/goods-return-slips")]
[Authorize]
public class GoodsReturnSlipsController : ControllerBase
{
    private readonly IGoodsReturnSlipService _service;
    private readonly IGrsExportService _exportService;

    public GoodsReturnSlipsController(IGoodsReturnSlipService service, IGrsExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("lookup")]
    public async Task<ActionResult<ApiResponse<SaleForReturnDto>>> Lookup(
        [FromQuery] string saleNumber,
        CancellationToken cancellationToken)
    {
        var sale = await _service.LookupSaleAsync(saleNumber, cancellationToken);
        if (sale is null)
            return NotFound(ApiResponse<SaleForReturnDto>.Fail("Sale not found or not eligible for return"));
        return Ok(ApiResponse<SaleForReturnDto>.Ok(sale));
    }

    [HttpGet]
    public async Task<ActionResult> GetList(
        [FromQuery] GoodsReturnSlipListQuery query,
        CancellationToken cancellationToken)
    {
        var paged = await _service.GetListPagedAsync(query, UserId, Role, cancellationToken);
        return Ok(ApiResponse<PagedResult<GoodsReturnSlipDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var grs = await _service.GetByIdAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> Create(
        [FromBody] CreateGoodsReturnSlipRequest request,
        CancellationToken cancellationToken)
    {
        var grs = await _service.CreateAsync(request, UserId, cancellationToken);
        var message = "Return and exchange completed";
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs, message));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> Approve(
        Guid id,
        [FromBody] ApproveGoodsReturnSlipRequest request,
        CancellationToken cancellationToken)
    {
        var grs = await _service.ApproveAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs, "Return approved — stock restored"));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> Reject(
        Guid id,
        [FromBody] RejectGoodsReturnSlipRequest request,
        CancellationToken cancellationToken)
    {
        var grs = await _service.RejectAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs, "Return rejected"));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> Cancel(
        Guid id,
        [FromBody] CancelGoodsReturnSlipRequest? request,
        CancellationToken cancellationToken)
    {
        var grs = await _service.CancelAsync(id, request ?? new CancelGoodsReturnSlipRequest(), UserId, Role, cancellationToken);
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs, "Return cancelled"));
    }

    [HttpPost("{id:guid}/void")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<GoodsReturnSlipDto>>> Void(
        Guid id,
        [FromBody] VoidGoodsReturnSlipRequest request,
        CancellationToken cancellationToken)
    {
        var grs = await _service.VoidAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<GoodsReturnSlipDto>.Ok(grs, "GRS voided"));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportList(
        [FromQuery] GoodsReturnSlipListQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var bytes = format.Equals("pdf", StringComparison.OrdinalIgnoreCase)
            ? await _exportService.ExportListPdfAsync(query, UserId, Role, cancellationToken)
            : await _exportService.ExportListExcelAsync(query, UserId, Role, cancellationToken);

        var contentType = format.Equals("pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var ext = format.Equals("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "xlsx";
        return File(bytes, contentType, $"grs-export-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("{id:guid}/export/pdf")]
    public async Task<IActionResult> ExportSlipPdf(Guid id, CancellationToken cancellationToken)
    {
        var bytes = await _exportService.ExportSlipPdfAsync(id, UserId, Role, cancellationToken);
        return File(bytes, "application/pdf", $"grs-{id}.pdf");
    }
}
