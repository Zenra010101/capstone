using GensanPOS.Domain.Common;



namespace GensanPOS.Domain.Entities;



public class ProductBatch : BaseEntity

{

    public Guid ProductId { get; set; }

    public Product Product { get; set; } = null!;

    // Branch assignment
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public string? BatchCode { get; set; }

    public decimal CostPrice { get; set; }

    public decimal SellingPrice { get; set; }

    public int ReceivedQuantity { get; set; }

    /// <summary>Quantity still available for sale from this batch.</summary>

    public int Quantity { get; set; }

    public DateOnly ReceivedDate { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? StockReceivingId { get; set; }

    public StockReceiving? StockReceiving { get; set; }

    public Guid? StockReceivingItemId { get; set; }

    public StockReceivingItem? StockReceivingItem { get; set; }

    public Guid? SupplierId { get; set; }

    public Supplier? Supplier { get; set; }

    public Guid? ReceivedByUserId { get; set; }

    public User? ReceivedByUser { get; set; }

    public Guid? ApprovedByUserId { get; set; }

    public User? ApprovedByUser { get; set; }

    public ICollection<SaleItem> SaleItems { get; set; } = [];

}

