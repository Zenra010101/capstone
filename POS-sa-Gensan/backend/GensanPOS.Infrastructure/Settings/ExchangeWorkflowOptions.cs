namespace GensanPOS.Infrastructure.Settings;

public class ExchangeWorkflowOptions
{
    public const string SectionName = "ExchangeWorkflow";

    /// <summary>
    /// When true, new GRS uses inspection/approval path (no immediate refund/stock until later phases).
    /// Store policy: operational returns only; owner-approved stock is resellable (no defective/warranty path).
    /// </summary>
    public bool Phase1Enabled { get; set; }
}
