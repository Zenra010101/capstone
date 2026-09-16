using GensanPOS.Application.DTOs.Categories;

namespace GensanPOS.Application.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(
        string? search,
        bool? includeArchived,
        bool? lowStockOnly,
        bool? emptyOnly,
        bool? withActiveProductsOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<CategorySummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
    Task<CategoryDto> GetByIdAsync(Guid id, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task ArchiveAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<int> ArchiveEmptyCategoriesAsync(Guid userId, CancellationToken cancellationToken = default);
}
