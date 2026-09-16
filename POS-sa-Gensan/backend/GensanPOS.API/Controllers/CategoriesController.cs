using System.Security.Claims;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Categories;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GensanPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService) => _categoryService = categoryService;

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool IsOwner => User.IsInRole(RoleNames.Owner);

    [HttpGet("summary")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<CategorySummaryDto>>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _categoryService.GetSummaryAsync(cancellationToken);
        return Ok(ApiResponse<CategorySummaryDto>.Ok(summary));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool? includeArchived,
        [FromQuery] bool? lowStockOnly,
        [FromQuery] bool? emptyOnly,
        [FromQuery] bool? withActiveProductsOnly,
        CancellationToken cancellationToken)
    {
        var categories = await _categoryService.GetAllAsync(
            search, includeArchived, lowStockOnly, emptyOnly, withActiveProductsOnly, IsOwner, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(categories));
    }

    [HttpPost("archive-empty")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<object>>> ArchiveEmpty(CancellationToken cancellationToken)
    {
        var count = await _categoryService.ArchiveEmptyCategoriesAsync(UserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { archivedCount = count }, count == 0 ? "No empty categories" : $"Archived {count} empty categor{(count == 1 ? "y" : "ies")}"));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var category = await _categoryService.GetByIdAsync(id, IsOwner, cancellationToken);
        return Ok(ApiResponse<CategoryDto>.Ok(category));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create(
        [FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await _categoryService.CreateAsync(request, UserId, cancellationToken);
        return Ok(ApiResponse<CategoryDto>.Ok(category, "Category created"));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(
        Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var category = await _categoryService.UpdateAsync(id, request, UserId, cancellationToken);
        return Ok(ApiResponse<CategoryDto>.Ok(category, "Category updated"));
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = RoleNames.Owner)]
    public async Task<ActionResult<ApiResponse<object>>> Archive(Guid id, CancellationToken cancellationToken)
    {
        await _categoryService.ArchiveAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Category archived"));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.Owner)]
    [Obsolete("Use POST archive — categories are never hard-deleted.")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _categoryService.ArchiveAsync(id, UserId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { }, "Category archived"));
    }
}
