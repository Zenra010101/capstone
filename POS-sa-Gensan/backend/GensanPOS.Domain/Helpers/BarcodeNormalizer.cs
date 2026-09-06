namespace GensanPOS.Domain.Helpers;

public static class BarcodeNormalizer
{
    /// <summary>
    /// Strips whitespace, control chars, and Code 128 Text start/stop asterisks some scanners include.
    /// </summary>
    public static string Normalize(string? barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
            return string.Empty;

        var code = barcode.Trim();
        code = code.Trim('*');
        return code.Trim();
    }
}
