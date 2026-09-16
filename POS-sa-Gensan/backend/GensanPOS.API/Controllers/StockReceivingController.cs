using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.StockReceiving;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/stockreceiving")]
[Authorize]
public class StockReceivingController : ControllerBase
{
    private readonly IStockReceivingService _service;
    private readonly IStockReceivingExportService _exportService;

    public StockReceivingController(
        IStockReceivingService service,
        IStockReceivingExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<StockReceivingSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _service.GetSummaryAsync(UserId, Role, IsOwner, cancellationToken);
        return Ok(ApiResponse<StockReceivingSummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult> Search(
        [FromQuery] StockReceivingSearchQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page > 0)
        {
            var paged = await _service.SearchPagedAsync(query, UserId, Role, IsOwner, cancellationToken);
            return Ok(ApiResponse<PagedResult<StockReceivingDto>>.Ok(paged));
        }

        var list = await _service.SearchAsync(query, UserId, Role, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<StockReceivingDto>>.Ok(list));
    }

    [HttpGet("validate-references")]
    public async Task<ActionResult<ApiResponse<DuplicateReferenceCheckDto>>> ValidateReferences(
        [FromQuery] string? referenceNumber,
        [FromQuery] string? deliveryReceiptNumber,
        [FromQuery] Guid? excludeId,
        CancellationToken cancellationToken)
    {
        var result = await _service.CheckDuplicatesAsync(referenceNumber, deliveryReceiptNumber, excludeId, cancellationToken);
        return Ok(ApiResponse<DuplicateReferenceCheckDto>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<StockReceivingDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, UserId, Role, IsOwner, cancellationToken);
        return Ok(ApiResponse<StockReceivingDto>.Ok(item));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<StockReceivingDto>>> Create(
        [FromBody] CreateStockReceivingRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _service.CreateAsync(request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<StockReceivingDto>.Ok(
            item,
            "Receiving request submitted — awaiting owner approval"));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<StockReceivingDto>>> Approve(
        Guid id,
        [FromBody] ApproveStockReceivingRequest? request,
        CancellationToken cancellationToken)
    {
        var item = await _service.ApproveAsync(id, UserId, request, cancellationToken);
        var message = item.BatchesCreatedCount > 0
            ? $"Receiving approved. {item.BatchesCreatedCount} inventory batch{(item.BatchesCreatedCount == 1 ? "" : "es")} created."
            : "Receiving approved — inventory updated with movement records";
        return Ok(ApiResponse<StockReceivingDto>.Ok(item, message));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<StockReceivingDto>>> Reject(
        Guid id,
        [FromBody] RejectStockReceivingRequest request,
        CancellationToken cancellationToken)
    {
        var item = await _service.RejectAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<StockReceivingDto>.Ok(item, "Receiving rejected — inventory unchanged"));
    }

    [HttpPost("{id:guid}/attachments")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<StockReceivingAttachmentDto>>> UploadAttachment(
        Guid id,
        IFormFile file,
        [FromForm] string? description,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("File is empty"));

        await using var stream = file.OpenReadStream();
        var attachment = await _service.AddAttachmentAsync(
            id, stream, file.FileName, file.ContentType, description, UserId, cancellationToken);
        return Ok(ApiResponse<StockReceivingAttachmentDto>.Ok(attachment, "Attachment uploaded"));
    }

    [HttpGet("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DownloadAttachment(Guid attachmentId, CancellationToken cancellationToken)
    {
        var file = await _service.GetAttachmentFileAsync(attachmentId, UserId, Role, cancellationToken);
        if (file is null) return NotFound();
        return File(file.Value.Stream, file.Value.ContentType, file.Value.FileName);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] StockReceivingSearchQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportPdfAsync(query, UserId, Role, IsOwner, cancellationToken)
            : await _exportService.ExportExcelAsync(query, UserId, Role, IsOwner, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"stock-receiving-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("{id:guid}/report")]
    public async Task<IActionResult> ExportReport(Guid id, CancellationToken cancellationToken)
    {
        var bytes = await _exportService.ExportReceivingReportPdfAsync(id, UserId, Role, IsOwner, cancellationToken);
        return File(bytes, "application/pdf", $"RCV-report-{id:N}.pdf");
    }
}
