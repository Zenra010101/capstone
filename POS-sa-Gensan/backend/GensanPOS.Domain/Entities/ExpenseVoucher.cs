using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class ExpenseVoucher : BaseEntity
{
    public string VoucherNumber { get; set; } = string.Empty;
    public DateOnly ExpenseDate { get; set; }
    public Guid CategoryId { get; set; }
    public ExpenseCategory Category { get; set; } = null!;
    public string Payee { get; set; } = string.Empty;
    public string Particulars { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public ExpensePaymentMethod PaymentMethod { get; set; }
    public string? Bank { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Remarks { get; set; }
    public ExpenseVoucherStatus Status { get; set; } = ExpenseVoucherStatus.Unpaid;
    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public Guid? PaidByUserId { get; set; }
    public User? PaidByUser { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public ICollection<ExpenseVoucherAttachment> Attachments { get; set; } = [];
}
