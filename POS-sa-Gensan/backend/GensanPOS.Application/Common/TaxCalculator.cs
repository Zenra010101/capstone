namespace GensanPOS.Application.Common;

public static class TaxCalculator
{
    public static decimal ComputeVat(decimal taxableBase, decimal vatRate, bool pricesIncludeVat)
    {
        if (taxableBase <= 0 || vatRate <= 0)
            return 0;

        if (pricesIncludeVat)
            return Math.Round(taxableBase - taxableBase / (1 + vatRate), 2, MidpointRounding.AwayFromZero);

        return Math.Round(taxableBase * vatRate, 2, MidpointRounding.AwayFromZero);
    }

    public static decimal ComputeTotal(decimal taxableBase, decimal vatRate, bool pricesIncludeVat, bool vatEnabled)
    {
        if (!vatEnabled || vatRate <= 0)
            return taxableBase;

        if (pricesIncludeVat)
            return taxableBase;

        return taxableBase + ComputeVat(taxableBase, vatRate, false);
    }
}
