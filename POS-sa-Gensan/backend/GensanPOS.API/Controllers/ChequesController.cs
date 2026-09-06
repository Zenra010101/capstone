using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChequesController : ControllerBase
{
    private readonly IChequeService _chequeService;

    public ChequesController(IChequeService chequeService) => _chequeService = chequeService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string Role => User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] ChequeStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (page > 0)
        {
            var paged = await _chequeService.GetPagedAsync(status, page, pageSize, cancellationToken);
            return Ok(ApiResponse<PagedResult<ChequeDto>>.Ok(paged));
        }

        var list = await _chequeService.GetAllAsync(status, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ChequeDto>>.Ok(list));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<ChequesSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _chequeService.GetSummaryAsync(cancellationToken);
        return Ok(ApiResponse<ChequesSummaryDto>.Ok(summary));
    }

    [HttpGet("bounced-history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BouncedChequeHistoryDto>>>> GetBouncedHistory(
        [FromQuery] Guid? customerId,
        CancellationToken cancellationToken)
    {
        var list = await _chequeService.GetBouncedHistoryAsync(customerId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BouncedChequeHistoryDto>>.Ok(list));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ChequeDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var cheque = await _chequeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ChequeDto>.Ok(cheque));
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<ChequeDto>>> UpdateStatus(
        Guid id,
        [FromBody] UpdateChequeStatusRequest request,
        CancellationToken cancellationToken)
    {
        var cheque = await _chequeService.UpdateStatusAsync(id, request, UserId, Role, cancellationToken);
        return Ok(ApiResponse<ChequeDto>.Ok(cheque, "Cheque status updated"));
    }
}
