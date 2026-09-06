namespace GensanPOS.Application.Common;

public static class StringClip
{
    /// <summary>
    /// Returns up to <paramref name="maxLength"/> characters without throwing when the input is shorter.
    /// Unlike <c>value[..maxLength]</c>, this is safe when <c>value.Length &lt; maxLength</c> on current .NET runtimes.
    /// </summary>
    public static string Take(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || maxLength <= 0)
            return string.Empty;
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    public static string BatchLabel(string? batchCode, Guid batchId) =>
        !string.IsNullOrWhiteSpace(batchCode)
            ? batchCode.Trim()
            : batchId.ToString("N")[..8];
}
