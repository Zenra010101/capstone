using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class CustomerReceivable : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public DateTime DueDate { get; set; }
    public ReceivableStatus Status { get; set; } = ReceivableStatus.Unpaid;
    public string? Notes { get; set; }
    public bool IsArchived { get; set; }
    public ICollection<ReceivablePayment> Payments { get; set; } = [];
}
