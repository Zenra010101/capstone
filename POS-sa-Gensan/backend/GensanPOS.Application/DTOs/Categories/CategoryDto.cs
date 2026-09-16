namespace GensanPOS.Application.DTOs.Categories;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? ColorAccent { get; set; }
    public bool IsActive { get; set; }
    public string StatusLabel { get; set; } = "Active";
    public Guid? ParentCategoryId { get; set; }
    public string? ParentCategoryName { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }

    public int ProductCount { get; set; }
    public int TotalStockUnits { get; set; }
    public int LowStockCount { get; set; }
    public decimal? TotalInventoryValue { get; set; }
    public decimal? ProfitLast30Days { get; set; }
    public decimal? RevenueLast30Days { get; set; }
}

public class CategorySummaryDto
{
    public int TotalCategories { get; set; }
    public int ActiveCategories { get; set; }
    public int ArchivedCategories { get; set; }
    public int CategoriesWithLowStock { get; set; }
    public int EmptyCategories { get; set; }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? ColorAccent { get; set; }
    public Guid? ParentCategoryId { get; set; }
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? ColorAccent { get; set; }
    public bool IsActive { get; set; }
    public Guid? ParentCategoryId { get; set; }
}
