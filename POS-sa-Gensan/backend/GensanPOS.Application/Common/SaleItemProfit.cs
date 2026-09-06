namespace GensanPOS.Application.Common;

/// <summary>Historical profit per sale line — never use current product cost in reports.</summary>
public static class SaleItemProfit
{
    public static (decimal sellingPriceAtSale, decimal costPriceAtSale, decimal profitAmount) Compute(
        decimal unitSellingPrice,
        decimal productCostPrice,
        int quantity,
        decimal lineDiscount)
    {
        var lineTotal = unitSellingPrice * quantity - lineDiscount;
        var costTotal = productCostPrice * quantity;
        var profit = lineTotal - costTotal;
        return (unitSellingPrice, productCostPrice, profit);
    }
}
