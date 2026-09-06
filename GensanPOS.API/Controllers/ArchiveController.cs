using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Archive;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleNames.Owner)]
public class ArchiveController : ControllerBase
{
    private readonly IArchiveService _archiveService;

    public ArchiveController(IArchiveService archiveService) => _archiveService = archiveService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("preview")]
    public async Task<ActionResult<ApiResponse<ArchiveResultDto>>> Preview(
        [FromBody] ArchiveRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _archiveService.PreviewArchiveBeforeAsync(request, cancellationToken);
        return Ok(ApiResponse<ArchiveResultDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ArchiveResultDto>>> Archive(
        [FromBody] ArchiveRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _archiveService.ArchiveBeforeAsync(
            request,
            UserId,
            User.FindFirstValue(ClaimTypes.Email),
            cancellationToken);
        return Ok(ApiResponse<ArchiveResultDto>.Ok(result, "Records marked archived (not deleted)"));
    }
}
