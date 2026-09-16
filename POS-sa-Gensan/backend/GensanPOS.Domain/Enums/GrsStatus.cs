namespace GensanPOS.Domain.Enums;

public enum GrsStatus
{
    /// <summary>Legacy: immediate complete with refund/stock on create.</summary>
    Completed = 0,
    /// <summary>Legacy cancelled (pre exchange workflow).</summary>
    Cancelled = 1,
    Voided = 2,

    /// <summary>Exchange-era workflow (Phase 1+).</summary>
    Draft = 10,
    PendingInspection = 20,
    Approved = 30,
    Rejected = 40,
    /// <summary>Exchange-era cancelled before approval.</summary>
    ExchangeCancelled = 50
}
