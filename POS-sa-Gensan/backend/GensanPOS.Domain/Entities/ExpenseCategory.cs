using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class ExpenseCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<ExpenseVoucher> Vouchers { get; set; } = [];
}
