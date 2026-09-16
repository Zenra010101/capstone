using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class Customer : BaseEntity
{
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public CustomerType CustomerType { get; set; } = CustomerType.WalkIn;
    public bool EnableCredit { get; set; }
    public decimal CreditLimit { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; } = SupplierPaymentTerms.Cod;
    public int DueDays { get; set; }
    public string? CustomPaymentTerms { get; set; }
    public bool AllowCheque { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public bool IsBlacklisted { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<CustomerReceivable> Receivables { get; set; } = [];
}
