using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class AdjustmentTypeLabels
{
    public static string Label(AdjustmentType type) => type switch
    {
        AdjustmentType.CountingError => "Counting Error",
        AdjustmentType.MissingStock => "Missing Stock",
        AdjustmentType.DamagedItems => "Damaged Items",
        AdjustmentType.ReturnedStock => "Returned Stock",
        AdjustmentType.ManualCorrection => "Manual Correction",
        AdjustmentType.ExpiredDefective => "Expired/Defective",
        AdjustmentType.Other => "Other",
        AdjustmentType.Lost => "Lost",
        AdjustmentType.ManagementRemoval => "Management Removal",
        AdjustmentType.StockCountCorrection => "Stock Count Correction",
        _ => type.ToString()
    };
}
