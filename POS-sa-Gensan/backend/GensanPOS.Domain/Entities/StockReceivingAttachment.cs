using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class StockReceivingAttachment : BaseEntity
{
    public Guid StockReceivingId { get; set; }
    public StockReceiving StockReceiving { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Description { get; set; }
    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;
}
