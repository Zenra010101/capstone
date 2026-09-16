using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class ExpenseVoucherAttachment : BaseEntity
{
    public Guid ExpenseVoucherId { get; set; }
    public ExpenseVoucher ExpenseVoucher { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Description { get; set; }
    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    /// <summary>
    /// Set when the receipt image file has been auto-removed from disk by the retention
    /// sweep. The metadata row is kept for the record; the file itself is no longer stored.
    /// </summary>
    public DateTime? FilePurgedAt { get; set; }
}
