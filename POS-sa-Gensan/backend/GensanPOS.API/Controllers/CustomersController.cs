using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Customers;
using GensanPOS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly IReceivableExportService _exportService;

    public CustomersController(
        ICustomerService customerService,
        IReceivableExportService exportService)
    {
        _customerService = customerService;
        _exportService = exportService;
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<CustomersSummaryDto>>> GetSummary(
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var summary = await _customerService.GetSummaryAsync(search, includeInactive, cancellationToken);
        return Ok(ApiResponse<CustomersSummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] CustomerListQuery query,
        CancellationToken cancellationToken = default)
    {
        if (query.Page > 0)
        {
            var paged = await _customerService.GetPagedAsync(query, cancellationToken);
            return Ok(ApiResponse<PagedResult<CustomerDto>>.Ok(paged));
        }

        var list = await _customerService.GetAllAsync(query.Search, query.IncludeInactive, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CustomerDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var customer = await _customerService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<CustomerDto>.Ok(customer));
    }

    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<CustomerProfileDto>>> GetProfile(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var profile = await _customerService.GetProfileAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<CustomerProfileDto>.Ok(profile));
    }

    [HttpGet("{id:guid}/ledger")]
    public async Task<ActionResult<ApiResponse<CustomerLedgerDetailDto>>> GetLedger(
        Guid id,
        [FromQuery] CustomerLedgerQuery query,
        CancellationToken cancellationToken = default)
    {
        var ledger = await _customerService.GetLedgerAsync(id, query, UserId, Role, cancellationToken);
        return Ok(ApiResponse<CustomerLedgerDetailDto>.Ok(ledger));
    }

    [HttpGet("{id:guid}/statement/export/pdf")]
    public async Task<IActionResult> ExportStatementPdf(Guid id, CancellationToken cancellationToken = default)
    {
        var bytes = await _exportService.ExportStatementPdfAsync(id, UserId, Role, cancellationToken);
        return File(bytes, "application/pdf", $"statement-{id}.pdf");
    }

    [HttpGet("next-code")]
    public async Task<ActionResult<ApiResponse<NextCustomerCodeDto>>> GetNextCode(CancellationToken cancellationToken)
    {
        var code = await _customerService.GetNextCustomerCodeAsync(cancellationToken);
        return Ok(ApiResponse<NextCustomerCodeDto>.Ok(new NextCustomerCodeDto { CustomerCode = code }));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var created = await _customerService.CreateAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<CustomerDto>.Ok(created, "Customer created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _customerService.UpdateAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<CustomerDto>.Ok(updated, "Customer updated"));
    }
}
