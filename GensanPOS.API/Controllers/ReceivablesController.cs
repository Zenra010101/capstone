using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Receivables;
using GensanPOS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReceivablesController : ControllerBase
{
    private readonly IReceivableService _receivableService;
    private readonly IReceivableExportService _exportService;

    public ReceivablesController(
        IReceivableService receivableService,
        IReceivableExportService exportService)
    {
        _receivableService = receivableService;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] ReceivableListQuery query,
        CancellationToken cancellationToken)
    {
        if (query.Page > 0)
        {
            var paged = await _receivableService.GetPagedAsync(query, UserId, Role, cancellationToken);
            return Ok(ApiResponse<PagedResult<ReceivableDto>>.Ok(paged));
        }

        var list = await _receivableService.GetAllAsync(query, UserId, Role, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ReceivableDto>>.Ok(list));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ReceivablesSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _receivableService.GetSummaryAsync(UserId, Role, cancellationToken);
        return Ok(ApiResponse<ReceivablesSummaryDto>.Ok(summary));
    }

    [HttpGet("ledger")]
    public async Task<ActionResult<ApiResponse<CustomerLedgerDto>>> GetLedger(
        [FromQuery] Guid? customerId,
        [FromQuery] string? customerName,
        CancellationToken cancellationToken)
    {
        var ledger = await _receivableService.GetCustomerLedgerAsync(
            customerId, customerName, UserId, Role, cancellationToken);
        return Ok(ApiResponse<CustomerLedgerDto>.Ok(ledger));
    }

    [HttpGet("statement/{customerId:guid}")]
    public async Task<ActionResult<ApiResponse<StatementOfAccountDto>>> GetStatement(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var statement = await _receivableService.GetStatementOfAccountAsync(
            customerId, UserId, Role, cancellationToken);
        return Ok(ApiResponse<StatementOfAccountDto>.Ok(statement));
    }

    [HttpGet("statement/{customerId:guid}/export/pdf")]
    public async Task<IActionResult> ExportStatementPdf(Guid customerId, CancellationToken cancellationToken)
    {
        var bytes = await _exportService.ExportStatementPdfAsync(customerId, UserId, Role, cancellationToken);
        return File(bytes, "application/pdf", $"statement-{customerId}.pdf");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportList(
        [FromQuery] ReceivableListQuery query,
        [FromQuery] string format = "excel",
        CancellationToken cancellationToken = default)
    {
        var bytes = format.Equals("pdf", StringComparison.OrdinalIgnoreCase)
            ? await _exportService.ExportListPdfAsync(query, UserId, Role, cancellationToken)
            : await _exportService.ExportListExcelAsync(query, UserId, Role, cancellationToken);

        var ext = format.Equals("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf" : "xlsx";
        var contentType = format.Equals("pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"receivables-{DateTime.UtcNow:yyyyMMdd}.{ext}");
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ReceivableDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _receivableService.GetByIdAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ReceivableDto>.Ok(item));
    }

    [HttpPost("{id:guid}/payments")]
    public async Task<ActionResult<ApiResponse<ReceivableDto>>> RecordPayment(
        Guid id,
        [FromBody] RecordReceivablePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _receivableService.RecordPaymentAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ReceivableDto>.Ok(result, "Payment recorded"));
    }
}
