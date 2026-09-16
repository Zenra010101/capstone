namespace GensanPOS.Domain.Enums;

public enum PaymentMethod
{
    Cash = 0,
    QRPH = 1,
    OnlineBank = 2,
    Charged = 3,
    Cheque = 4,
    /// <summary>One sale settled with two or more tenders (e.g. part bank + part cheque).
    /// The breakdown is stored on Sale.SplitPaymentsJson.</summary>
    Split = 5
}
