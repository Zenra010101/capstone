using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Search;
using GensanPOS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly IGlobalSearchService _searchService;

    public SearchController(IGlobalSearchService searchService) => _searchService = searchService;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<GlobalSearchResultDto>>> Search(
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(ApiResponse<GlobalSearchResultDto>.Ok(new GlobalSearchResultDto()));

        var result = await _searchService.SearchAsync(q, cancellationToken);
        return Ok(ApiResponse<GlobalSearchResultDto>.Ok(result));
    }
}
