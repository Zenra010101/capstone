using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class Branch : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<User> Users { get; set; } = [];
    public ICollection<ProductBatch> ProductBatches { get; set; } = [];
    public ICollection<StockReceiving> StockReceivings { get; set; } = [];
    public ICollection<Sale> Sales { get; set; } = [];
}