using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class InventoryMovementLabels
{
    public static string Label(InventoryTransactionType type, string? notes, string? reference)
    {
        if (notes != null && notes.Contains("void", StringComparison.OrdinalIgnoreCase))
            return "Void Reversal";

        if (IsGrs(notes, reference))
            return "Return / GRS";

        if (notes != null && notes.Contains("transfer", StringComparison.OrdinalIgnoreCase))
            return "Transfer";

        if (notes != null && notes.StartsWith('['))
        {
            var end = notes.IndexOf(']');
            if (end > 1)
                return notes[1..end];
        }

        if (notes != null && (notes.Contains("Approved:", StringComparison.OrdinalIgnoreCase)
            || notes.Contains("Manual", StringComparison.OrdinalIgnoreCase)
            || notes.Contains("correction", StringComparison.OrdinalIgnoreCase)))
            return "Manual Correction";

        return type switch
        {
            InventoryTransactionType.Purchase => IsReceiving(reference, notes)
                ? "Stock Receiving"
                : "Stock Receiving",
            InventoryTransactionType.Sale => "Sale",
            InventoryTransactionType.Return => "Return / GRS",
            InventoryTransactionType.Adjustment => "Adjustment",
            InventoryTransactionType.Damage => "Adjustment",
            _ => type.ToString()
        };
    }

    private static bool IsGrs(string? notes, string? reference) =>
        (reference != null && reference.Contains("GRS", StringComparison.OrdinalIgnoreCase))
        || (notes != null && notes.Contains("GRS", StringComparison.OrdinalIgnoreCase));

    private static bool IsReceiving(string? reference, string? notes) =>
        reference?.StartsWith("SR-", StringComparison.OrdinalIgnoreCase) == true
        || reference?.StartsWith("RCV", StringComparison.OrdinalIgnoreCase) == true
        || notes?.Contains("receiving", StringComparison.OrdinalIgnoreCase) == true
        || notes?.Contains("Opening", StringComparison.OrdinalIgnoreCase) == true;
}
