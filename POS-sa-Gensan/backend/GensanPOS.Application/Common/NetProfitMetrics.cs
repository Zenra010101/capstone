namespace GensanPOS.Application.Common;

/// <summary>Net operational profit for a period (aligned with profit report).</summary>
public sealed class NetProfitMetrics
{
    public decimal SalesProfit { get; init; }
    public decimal ReturnsProfitReversed { get; init; }
    /// <summary>Replacement margin on even exchanges (no top-up invoice).</summary>
    public decimal EvenExchangeReplacementProfit { get; init; }
    public decimal NetProfit => SalesProfit - ReturnsProfitReversed + EvenExchangeReplacementProfit;
    public int ZeroCostSaleLineCount { get; init; }
    public bool ProfitMissingCostWarning => ZeroCostSaleLineCount > 0;
}
