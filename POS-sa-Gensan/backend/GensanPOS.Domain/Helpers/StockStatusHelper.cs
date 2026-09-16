using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Helpers;

public static class StockStatusHelper
{
    public static StockStatus FromQuantity(int quantity)
    {
        if (quantity <= 0) return StockStatus.OutOfStock;
        if (quantity <= InventoryConstants.CriticalStockThreshold) return StockStatus.Critical;
        if (quantity <= InventoryConstants.LowStockThreshold) return StockStatus.LowStock;
        return StockStatus.InStock;
    }

    public static string Label(StockStatus status) => status switch
    {
        StockStatus.InStock => "In Stock",
        StockStatus.LowStock => "Low Stock",
        StockStatus.Critical => "Critical",
        StockStatus.OutOfStock => "Out of Stock",
        _ => "Unknown"
    };
}
