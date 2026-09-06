using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public sealed class SaleTaxInput
{
    public decimal SubTotal { get; init; }
    public decimal DiscountPercent { get; init; }
    public SaleTaxMode TaxMode { get; init; }
    public string? ManualTaxName { get; init; }
    public bool ManualTaxIsPercent { get; init; }
    public decimal ManualTaxValue { get; init; }
    public bool ManualTaxIsDeduction { get; init; }
}

public sealed class SaleTaxResult
{
    public decimal DiscountPercent { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TaxableBase { get; init; }
    public SaleTaxMode TaxMode { get; init; }
    public string TaxTypeLabel { get; init; } = string.Empty;
    public decimal TaxRate { get; init; }
    public decimal TaxAmount { get; init; }
    public decimal WithholdingAmount { get; init; }
    public decimal TotalAmount { get; init; }
    public string? ManualTaxName { get; init; }
}

public static class SaleTaxCalculator
{
    public const decimal VatRate = 0.12m;
    public const decimal WithholdingRate = 0.01m;

    public static SaleTaxResult Compute(SaleTaxInput input)
    {
        var discountPercent = Math.Clamp(input.DiscountPercent, 0, 100);
        var discountAmount = Round(Math.Max(input.SubTotal, 0) * discountPercent / 100m);
        var taxableBase = Math.Max(input.SubTotal - discountAmount, 0);

        decimal taxRate = 0;
        decimal taxAmount = 0;
        decimal withholdingAmount = 0;
        string taxTypeLabel;
        string? manualTaxName = null;

        switch (input.TaxMode)
        {
            case SaleTaxMode.Vat12:
                taxRate = VatRate;
                taxAmount = Round(taxableBase * VatRate);
                taxTypeLabel = "VAT 12%";
                break;
            case SaleTaxMode.Withholding1:
                taxRate = WithholdingRate;
                withholdingAmount = Round(taxableBase * WithholdingRate);
                taxTypeLabel = "Withholding Tax (WHT) 1%";
                break;
            case SaleTaxMode.Manual:
                manualTaxName = string.IsNullOrWhiteSpace(input.ManualTaxName)
                    ? "Manual Tax"
                    : input.ManualTaxName.Trim();
                taxTypeLabel = manualTaxName;
                var manualAmount = input.ManualTaxIsPercent
                    ? Round(taxableBase * Math.Max(input.ManualTaxValue, 0) / 100m)
                    : Round(Math.Max(input.ManualTaxValue, 0));
                if (input.ManualTaxIsPercent && taxableBase > 0)
                    taxRate = Math.Round(input.ManualTaxValue / 100m, 4, MidpointRounding.AwayFromZero);
                if (input.ManualTaxIsDeduction)
                    withholdingAmount = manualAmount;
                else
                    taxAmount = manualAmount;
                break;
            default:
                taxTypeLabel = "No Tax";
                break;
        }

        var total = taxableBase + taxAmount - withholdingAmount;
        if (total < 0) total = 0;

        return new SaleTaxResult
        {
            DiscountPercent = discountPercent,
            DiscountAmount = discountAmount,
            TaxableBase = taxableBase,
            TaxMode = input.TaxMode,
            TaxTypeLabel = taxTypeLabel,
            TaxRate = taxRate,
            TaxAmount = taxAmount,
            WithholdingAmount = withholdingAmount,
            TotalAmount = total,
            ManualTaxName = manualTaxName
        };
    }

    private static decimal Round(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
