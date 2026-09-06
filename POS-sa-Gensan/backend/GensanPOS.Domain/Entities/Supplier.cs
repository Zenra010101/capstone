using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class Supplier : BaseEntity
{
    public string SupplierCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; } = SupplierPaymentTerms.Cod;
    public string? CustomPaymentTerms { get; set; }
    public string? Notes { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? SupplierRemarks { get; set; }
    public SupplierStatus Status { get; set; } = SupplierStatus.Active;
    public bool IsActive { get; set; } = true;
    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public ICollection<SupplierContact> Contacts { get; set; } = [];
    public ICollection<SupplierAttachment> Attachments { get; set; } = [];
    public ICollection<StockReceiving> StockReceivings { get; set; } = [];
}
