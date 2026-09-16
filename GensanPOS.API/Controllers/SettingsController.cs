using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Settings;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly IStoreSettingsService _settingsService;

    public SettingsController(IStoreSettingsService settingsService) => _settingsService = settingsService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<StoreSettingsDto>>> Get(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAsync(cancellationToken);
        return Ok(ApiResponse<StoreSettingsDto>.Ok(settings));
    }

    [HttpPut]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<StoreSettingsDto>>> Update(
        [FromBody] UpdateStoreSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var settings = await _settingsService.UpdateAsync(request, cancellationToken);
        return Ok(ApiResponse<StoreSettingsDto>.Ok(settings, "Settings saved"));
    }
}
