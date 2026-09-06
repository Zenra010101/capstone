using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Suppliers;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _service;
    private readonly ISupplierExportService _exportService;

    public SuppliersController(ISupplierService service, ISupplierExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SupplierSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _service.GetSummaryAsync(true, cancellationToken);
        return Ok(ApiResponse<SupplierSummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult> Search(
        [FromQuery] SupplierSearchQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page > 0)
        {
            var paged = await _service.SearchPagedAsync(query, IsOwner, cancellationToken);
            return Ok(ApiResponse<PagedResult<SupplierListItemDto>>.Ok(paged));
        }

        var list = await _service.SearchAsync(query, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SupplierListItemDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SupplierDetailDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _service.GetByIdAsync(id, IsOwner, cancellationToken);
        return Ok(ApiResponse<SupplierDetailDto>.Ok(item));
    }

    [HttpGet("{id:guid}/cost-history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<SupplierCostHistoryDto>>>> GetCostHistory(
        Guid id,
        CancellationToken cancellationToken)
    {
        var history = await _service.GetCostHistoryAsync(id, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SupplierCostHistoryDto>>.Ok(history));
    }

    [HttpGet("next-code")]
    public async Task<ActionResult<ApiResponse<NextSupplierCodeDto>>> GetNextCode(CancellationToken cancellationToken)
    {
        var code = await _service.GetNextSupplierCodeAsync(cancellationToken);
        return Ok(ApiResponse<NextSupplierCodeDto>.Ok(new NextSupplierCodeDto { SupplierCode = code }));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SupplierDetailDto>>> Create(
        [FromBody] CreateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var supplier = await _service.CreateAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<SupplierDetailDto>.Ok(supplier, "Supplier created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SupplierDetailDto>>> Update(
        Guid id,
        [FromBody] UpdateSupplierRequest request,
        CancellationToken cancellationToken)
    {
        var supplier = await _service.UpdateAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<SupplierDetailDto>.Ok(supplier, "Supplier updated"));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SupplierDetailDto>>> Archive(
        Guid id,
        [FromBody] ArchiveSupplierRequest? request,
        CancellationToken cancellationToken)
    {
        var supplier = await _service.ArchiveAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<SupplierDetailDto>.Ok(supplier, "Supplier archived — historical records preserved"));
    }

    [HttpPost("{id:guid}/attachments")]
    [Authorize(Roles = RoleNames.Owner)]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<SupplierAttachmentDto>>> UploadAttachment(
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
        return Ok(ApiResponse<SupplierAttachmentDto>.Ok(attachment, "Attachment uploaded"));
    }

    [HttpGet("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DownloadAttachment(Guid attachmentId, CancellationToken cancellationToken)
    {
        var file = await _service.GetAttachmentFileAsync(attachmentId, cancellationToken);
        if (file is null) return NotFound();
        return File(file.Value.Stream, file.Value.ContentType, file.Value.FileName);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] SupplierSearchQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var isPdf = string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = isPdf
            ? await _exportService.ExportPdfAsync(query, IsOwner, cancellationToken)
            : await _exportService.ExportExcelAsync(query, IsOwner, cancellationToken);
        var ext = isPdf ? "pdf" : "xlsx";
        var contentType = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"suppliers-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("{id:guid}/report")]
    public async Task<IActionResult> ExportProfileReport(Guid id, CancellationToken cancellationToken)
    {
        var bytes = await _exportService.ExportProfilePdfAsync(id, IsOwner, cancellationToken);
        return File(bytes, "application/pdf", $"supplier-report-{id:N}.pdf");
    }
}
