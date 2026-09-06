using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Audit;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleNames.Owner)]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService) => _auditLogService = auditLogService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<AuditLogSearchResult>>> Search(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] AuditLogCategory? category,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _auditLogService.SearchAsync(
            from, to, category, action, entityType, search, page, pageSize, includeArchived, cancellationToken);
        return Ok(ApiResponse<AuditLogSearchResult>.Ok(result));
    }

    [HttpGet("recent")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AuditLogDto>>>> GetRecent(
        [FromQuery] int count = 50,
        CancellationToken cancellationToken = default)
    {
        var logs = await _auditLogService.GetRecentAsync(count, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AuditLogDto>>.Ok(logs));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] AuditLogCategory? category,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] string? search,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var pdf = format.Equals("pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = pdf
            ? await _auditLogService.ExportPdfAsync(from, to, category, action, entityType, search, cancellationToken)
            : await _auditLogService.ExportExcelAsync(from, to, category, action, entityType, search, cancellationToken);
        var contentType = pdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var ext = pdf ? "pdf" : "xlsx";
        return File(bytes, contentType, $"audit-log-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }
}
