using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Lucide icon name for UI (e.g. Package, Wrench).</summary>
    public string? Icon { get; set; }
    /// <summary>Subtle accent token: slate, blue, emerald, amber, violet, rose.</summary>
    public string? ColorAccent { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public ICollection<Category> ChildCategories { get; set; } = [];
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<Product> Products { get; set; } = [];
}
