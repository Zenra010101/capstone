using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Alerts;
using GensanPOS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly IAlertsService _alertsService;

    public AlertsController(IAlertsService alertsService) => _alertsService = alertsService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<AlertsSummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _alertsService.GetSummaryAsync(cancellationToken);
        return Ok(ApiResponse<AlertsSummaryDto>.Ok(summary));
    }
}
