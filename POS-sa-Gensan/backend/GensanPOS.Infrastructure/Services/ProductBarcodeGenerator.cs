namespace GensanPOS.Infrastructure.Services;

public static class ProductBarcodeGenerator
{
    public static string CreateCandidate(string sku, int attempt)
    {
        var suffix = (sku.GetHashCode() & 0x7FFFFFFF).ToString("D8")[..8];
        return $"GSP{suffix}{attempt:D2}";
    }

    public static string GenerateUnique(string sku, Func<string, bool> isTaken)
    {
        for (var attempt = 0; attempt < 100; attempt++)
        {
            var candidate = CreateCandidate(sku, attempt);
            if (!isTaken(candidate))
                return candidate;
        }

        throw new InvalidOperationException($"Could not generate a unique barcode for SKU {sku}");
    }
}
