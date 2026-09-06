using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class SalesReportLineHelper
{
    internal readonly record struct EffectiveSaleLine(
        SaleItem Item,
        int Quantity,
        decimal UnitPrice,
        decimal LineTotal,
        decimal DiscountPercent);

    /// <summary>
    /// Net line amounts for the daily report: partial returns reduce qty/total;
    /// exchange top-up invoices allocate <see cref="Sale.TotalAmount"/> (after return credit).
    /// </summary>
    public static IReadOnlyList<EffectiveSaleLine> EffectiveReportLines(Sale sale)
    {
        var raw = new List<(SaleItem Item, int Qty, decimal MerchNet)>();

        foreach (var item in sale.Items.OrderBy(i => i.CreatedAt))
        {
            var qty = item.Quantity - item.ReturnedQuantity;
            if (qty <= 0) continue;

            var merchNet = item.ReturnedQuantity > 0 && item.Quantity > 0
                ? item.LineTotal - Math.Round(item.LineTotal * item.ReturnedQuantity / item.Quantity, 2)
                : item.LineTotal;

            raw.Add((item, qty, merchNet));
        }

        if (raw.Count == 0) return [];

        var merchSum = raw.Sum(x => x.MerchNet);
        var isExchangeTopUp = sale.ReplacesSaleId.HasValue && sale.DiscountAmount > 0 && merchSum > 0;
        var targetTotal = isExchangeTopUp ? sale.TotalAmount : merchSum;

        var lines = new List<EffectiveSaleLine>(raw.Count);
        var allocated = 0m;

        for (var i = 0; i < raw.Count; i++)
        {
            var (item, qty, merchNet) = raw[i];
            var lineTotal = isExchangeTopUp
                ? (i == raw.Count - 1
                    ? targetTotal - allocated
                    : Math.Round(targetTotal * merchNet / merchSum, 2))
                : merchNet;

            if (isExchangeTopUp) allocated += lineTotal;

            var unitPrice = qty > 0 ? Math.Round(lineTotal / qty, 2) : 0m;
            var catalogGross = item.UnitPrice * qty;
            var discountPercent = catalogGross > 0 && lineTotal < catalogGross
                ? Math.Round((catalogGross - lineTotal) / catalogGross * 100m, 1)
                : LineDiscountPercent(sale, item, qty);

            lines.Add(new EffectiveSaleLine(item, qty, unitPrice, lineTotal, discountPercent));
        }

        return lines;
    }

    public static string FormatProductSize(Product? product)
    {
        if (product is null) return string.Empty;
        if (!string.IsNullOrWhiteSpace(product.Size)) return product.Size.Trim();
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(product.Diameter)) parts.Add(product.Diameter.Trim());
        if (!string.IsNullOrWhiteSpace(product.Thickness)) parts.Add(product.Thickness.Trim());
        if (!string.IsNullOrWhiteSpace(product.Width) && !string.IsNullOrWhiteSpace(product.Height))
            parts.Add($"{product.Width.Trim()}x{product.Height.Trim()}");
        else if (!string.IsNullOrWhiteSpace(product.Width))
            parts.Add(product.Width.Trim());
        return string.Join(" ", parts);
    }

    public static string PaymentTerm(Sale sale)
    {
        if (sale.PaymentMethod == PaymentMethod.Cheque && sale.Cheque != null)
            return sale.Cheque.Type == ChequeType.Current ? "CURRENT" : "PDC";

        return sale.PaymentMethod switch
        {
            PaymentMethod.Cash => "C.O.D.",
            PaymentMethod.Charged => "CHARGE",
            PaymentMethod.QRPH => "QRPH",
            PaymentMethod.OnlineBank => "ONLINE",
            _ => "C.O.D."
        };
    }

    public static void ApplyPaymentAmounts(SalesSummaryLineDto line, Sale sale, decimal amount)
    {
        line.CashAmount = 0;
        line.CurrentAmount = 0;
        line.ChargeAmount = 0;
        line.OnlineAmount = 0;

        switch (sale.PaymentMethod)
        {
            case PaymentMethod.Cash:
                line.CashAmount = amount;
                break;
            case PaymentMethod.Charged:
                line.ChargeAmount = amount;
                break;
            case PaymentMethod.Cheque:
                if (sale.Cheque?.Type == ChequeType.Current)
                    line.CurrentAmount = amount;
                else
                    line.ChargeAmount = amount;
                break;
            case PaymentMethod.QRPH:
            case PaymentMethod.OnlineBank:
                line.OnlineAmount = amount;
                break;
        }
    }

    public static decimal LineDiscountPercent(Sale sale, SaleItem item, int? effectiveQty = null)
    {
        if (item.Discount > 0 && item.LineTotal + item.Discount > 0)
        {
            var qty = effectiveQty ?? item.Quantity;
            var gross = item.UnitPrice * qty;
            return gross > 0 ? Math.Round(item.Discount / gross * 100m, 1) : 0;
        }

        return sale.DiscountPercent;
    }
}
