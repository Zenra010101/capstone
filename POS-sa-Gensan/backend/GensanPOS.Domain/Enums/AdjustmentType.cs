namespace GensanPOS.Domain.Enums;

public enum AdjustmentType
{
    CountingError = 0,
    MissingStock = 1,
    DamagedItems = 2,
    ReturnedStock = 3,
    ManualCorrection = 4,
    ExpiredDefective = 5,
    Other = 6,
    Lost = 7,
    ManagementRemoval = 8,
    StockCountCorrection = 9
}
