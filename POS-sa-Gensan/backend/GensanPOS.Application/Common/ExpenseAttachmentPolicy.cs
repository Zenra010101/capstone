namespace GensanPOS.Application.Common;

using GensanPOS.Application.Exceptions;

public static class ExpenseAttachmentPolicy
{
    public const int MaxAttachmentsPerVoucher = 3;
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;

    public static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    };

    public static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf",
    };

    public static void Validate(string fileName, string contentType, long fileSizeBytes, int existingCount)
    {
        if (existingCount >= MaxAttachmentsPerVoucher)
            throw new AppException($"Maximum {MaxAttachmentsPerVoucher} receipt attachments per voucher.");

        ValidateFile(fileName, contentType, fileSizeBytes);
    }

    public static void ValidateFile(string fileName, string contentType, long fileSizeBytes)
    {
        if (fileSizeBytes <= 0)
            throw new AppException("File is empty.");

        if (fileSizeBytes > MaxFileSizeBytes)
            throw new AppException($"File exceeds {MaxFileSizeBytes / (1024 * 1024)} MB limit.");

        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
            throw new AppException("Only JPG, PNG, WebP, and PDF receipts are allowed.");

        if (!AllowedContentTypes.Contains(contentType) &&
            !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) &&
            contentType != "application/octet-stream")
            throw new AppException("Unsupported file type. Use JPG, PNG, WebP, or PDF.");
    }
}
