namespace GensanPOS.Domain.Entities;

/// <summary>Singleton row (Id = 1) for store-wide POS options.</summary>
public class StoreSettings
{
    public int Id { get; set; } = 1;
    public bool VatEnabled { get; set; }
    public decimal VatRate { get; set; } = 0.12m;
    public bool PricesIncludeVat { get; set; }

    public string OutletLine { get; set; } = "FACTORY OUTLET OF :";
    public string BrandLine { get; set; } = "PH EXCELLENT STAINLESS STEEL";
    public string Tagline { get; set; } = "THE NO. 1 STAINLESS BRAND IN PHILIPPINES";
    public string StoreName { get; set; } = "SHANGHAI STAINLESS STEEL SUPPLY CORPORATION";
    public string Address { get; set; } = "DR # 1 WEE ENG BLDG., R. CASTILLO ST., AGDAO, DAVAO CITY";
    public string Phone { get; set; } = "(082) 284-7487";
    public string TrustReceiptTitle { get; set; } = "TRUST RECEIPT AGREEMENT";
    public string CashReceiptTitle { get; set; } = "SALES RECEIPT";
    public bool AllowCashierBarcodePrinting { get; set; }
    /// <summary>A5 (half bond, default) or A4 full page for POS receipts.</summary>
    public string ReceiptPaperSize { get; set; } = "A5";
}
