using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService) => _reportService = reportService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    private static bool RequiresOwnerRole(ReportTypeKind type) =>
        type is ReportTypeKind.Profit or ReportTypeKind.Audit;

    [HttpGet("query")]
    public async Task<ActionResult<ApiResponse<UnifiedReportDto>>> Query(
        [FromQuery] ReportTypeKind type,
        [FromQuery] ReportQueryFilter filter,
        CancellationToken cancellationToken)
    {
        if (RequiresOwnerRole(type) && !RoleNames.IsOwner(Role))
            return Forbid();
        var report = await _reportService.GetReportAsync(type, filter, UserId, Role, cancellationToken);
        return Ok(ApiResponse<UnifiedReportDto>.Ok(report));
    }

    [HttpGet("print-stamp")]
    public ActionResult<ApiResponse<ReportPrintStampDto>> GetPrintStamp()
    {
        return Ok(ApiResponse<ReportPrintStampDto>.Ok(_reportService.GetPrintStamp()));
    }

    [HttpGet("sales-summary")]
    public async Task<ActionResult<ApiResponse<SalesSummaryReportDto>>> GetSalesSummary(
        [FromQuery] string preset = "today",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] bool verify = false,
        [FromQuery] string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        var preparedFor = User.FindFirstValue(ClaimTypes.Name);
        var report = await _reportService.GetSalesSummaryReportAsync(
            preset, from, to, UserId, Role, preparedFor, verify, verifyBaseUrl, cancellationToken);
        return Ok(ApiResponse<SalesSummaryReportDto>.Ok(report));
    }

    [AllowAnonymous]
    [HttpGet("verify/{code}")]
    public async Task<ActionResult<ApiResponse<SalesReportVerificationViewDto>>> VerifySalesReport(
        string code,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSalesReportVerificationAsync(code, cancellationToken);
        if (result is null)
            return NotFound(ApiResponse<SalesReportVerificationViewDto>.Fail("Report verification not found"));

        return Ok(ApiResponse<SalesReportVerificationViewDto>.Ok(result));
    }

    [HttpGet("sales-summary/export")]
    public async Task<IActionResult> ExportSalesSummary(
        [FromQuery] string preset = "today",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string format = "pdf",
        [FromQuery] string? verifyBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        if (!format.Equals("pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Sales summary supports PDF export only"));

        var preparedFor = User.FindFirstValue(ClaimTypes.Name);
        var bytes = await _reportService.ExportSalesSummaryPdfAsync(
            preset, from, to, UserId, Role, preparedFor, verifyBaseUrl, cancellationToken);
        return File(bytes, "application/pdf", $"sales-summary-{DateTime.UtcNow:yyyyMMdd-HHmm}.pdf");
    }

    [HttpGet("sales")]
    public async Task<ActionResult<ApiResponse<SalesReportDto>>> GetSales(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var report = await _reportService.GetSalesReportAsync(from, to, UserId, Role, cancellationToken);
        return Ok(ApiResponse<SalesReportDto>.Ok(report));
    }

    [HttpGet("profit")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ProfitReportDto>>> GetProfit(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        var report = await _reportService.GetProfitReportAsync(from, to, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ProfitReportDto>.Ok(report));
    }

    [HttpGet("sales/export")]
    public async Task<IActionResult> ExportSales(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var pdf = format.Equals("pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = pdf
            ? await _reportService.ExportSalesPdfAsync(from, to, UserId, Role, cancellationToken)
            : await _reportService.ExportSalesExcelAsync(from, to, UserId, Role, cancellationToken);
        var contentType = pdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var ext = pdf ? "pdf" : "xlsx";
        return File(bytes, contentType, $"sales-report-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("profit/export")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<IActionResult> ExportProfit(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var pdf = format.Equals("pdf", StringComparison.OrdinalIgnoreCase);
        var bytes = pdf
            ? await _reportService.ExportProfitPdfAsync(from, to, UserId, Role, cancellationToken)
            : await _reportService.ExportProfitExcelAsync(from, to, UserId, Role, cancellationToken);
        var contentType = pdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        var ext = pdf ? "pdf" : "xlsx";
        return File(bytes, contentType, $"profit-report-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportUnified(
        [FromQuery] ReportTypeKind type,
        [FromQuery] ReportQueryFilter filter,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        if (!format.Equals("excel", StringComparison.OrdinalIgnoreCase))
            return BadRequest(ApiResponse<object>.Fail("Only Excel export is supported for unified reports"));

        if (RequiresOwnerRole(type) && !RoleNames.IsOwner(Role))
            return Forbid();

        var bytes = await _reportService.ExportUnifiedExcelAsync(type, filter, UserId, Role, cancellationToken);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"{type}-report-{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }
}
