using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Sales;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly ISaleService _saleService;

    public SalesController(ISaleService saleService) => _saleService = saleService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken,
        [FromQuery] bool history = false,
        [FromQuery] int? page = null,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool includeArchived = false,
        [FromQuery] Guid? cashierId = null,
        [FromQuery] int? paymentMethod = null,
        [FromQuery] int? status = null,
        [FromQuery] string? search = null)
    {
        if (history && page.HasValue)
        {
            var paged = await _saleService.GetHistoryPagedAsync(
                from,
                to,
                page.Value,
                pageSize,
                includeArchived,
                cashierId,
                paymentMethod,
                status,
                search,
                UserId,
                Role,
                cancellationToken);
            return Ok(ApiResponse<SalesHistoryPageDto>.Ok(paged));
        }

        var sales = history
            ? await _saleService.GetHistoryAsync(from, to, UserId, Role, cancellationToken)
            : await _saleService.GetAllAsync(from, to, UserId, Role, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SaleDto>>.Ok(sales));
    }

    [HttpGet("by-number/{saleNumber}")]
    public async Task<ActionResult<ApiResponse<SaleDto>>> GetBySaleNumber(string saleNumber, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetBySaleNumberAsync(saleNumber, UserId, Role, cancellationToken);
        if (sale is null)
            return NotFound(ApiResponse<SaleDto>.Fail("Sale not found"));
        return Ok(ApiResponse<SaleDto>.Ok(sale));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SaleDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetByIdAsync(id, UserId, Role, cancellationToken);
        return Ok(ApiResponse<SaleDto>.Ok(sale));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SaleDto>>> Create([FromBody] CreateSaleRequest request, CancellationToken cancellationToken)
    {
        var sale = await _saleService.CreateAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<SaleDto>.Ok(sale, "Sale completed"));
    }

    [HttpPost("{id:guid}/void")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SaleDto>>> Void(
        Guid id,
        [FromBody] VoidSaleRequest request,
        CancellationToken cancellationToken)
    {
        var sale = await _saleService.VoidAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<SaleDto>.Ok(sale, "Sale voided"));
    }

    [HttpPost("{id:guid}/correction")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<SaleDto>>> CreateCorrection(
        Guid id,
        [FromBody] CreateSaleRequest request,
        CancellationToken cancellationToken)
    {
        var sale = await _saleService.CreateCorrectionAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<SaleDto>.Ok(sale, "Correction sale created"));
    }
}
