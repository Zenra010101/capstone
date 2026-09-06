namespace GensanPOS.Application.DTOs.Settings;

public class StoreSettingsDto
{
    public bool VatEnabled { get; set; }
    public decimal VatRate { get; set; }
    public bool PricesIncludeVat { get; set; }
    public string OutletLine { get; set; } = string.Empty;
    public string BrandLine { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string TrustReceiptTitle { get; set; } = string.Empty;
    public string CashReceiptTitle { get; set; } = string.Empty;
    public bool AllowCashierBarcodePrinting { get; set; }
    /// <summary>A5 or A4</summary>
    public string ReceiptPaperSize { get; set; } = "A5";
}

public class UpdateStoreSettingsRequest
{
    public bool VatEnabled { get; set; }
    public decimal VatRate { get; set; }
    public bool PricesIncludeVat { get; set; }
    public string? OutletLine { get; set; }
    public string? BrandLine { get; set; }
    public string? Tagline { get; set; }
    public string? StoreName { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? TrustReceiptTitle { get; set; }
    public string? CashReceiptTitle { get; set; }
    public bool? AllowCashierBarcodePrinting { get; set; }
    public string? ReceiptPaperSize { get; set; }
}
