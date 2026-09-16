using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Barcode { get; set; }
    public string? Size { get; set; }
    public string? Thickness { get; set; }
    public string? Length { get; set; }
    public string? Grade { get; set; }
    public string? Diameter { get; set; }
    public string? Schedule { get; set; }
    public string? Width { get; set; }
    public string? Height { get; set; }
    public string? MaterialType { get; set; }
    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public string UnitOfMeasure { get; set; } = "pc";
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public int StockQuantity { get; set; }
    public int ReorderLevel { get; set; } = 10;
    public bool IsActive { get; set; } = true;
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public ICollection<SaleItem> SaleItems { get; set; } = [];
    public ICollection<ProductBatch> Batches { get; set; } = [];
    public ICollection<InventoryTransaction> InventoryTransactions { get; set; } = [];
}
