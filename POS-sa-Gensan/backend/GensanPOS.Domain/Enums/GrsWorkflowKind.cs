namespace GensanPOS.Domain.Enums;

/// <summary>How this GRS was created — legacy refund path vs exchange-era inspection path.</summary>
public enum GrsWorkflowKind
{
    LegacyRefund = 0,
    ExchangeReturn = 1
}
