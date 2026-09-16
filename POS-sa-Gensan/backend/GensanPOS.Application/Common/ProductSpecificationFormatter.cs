using GensanPOS.Domain.Entities;

namespace GensanPOS.Application.Common;

public static class ProductSpecificationFormatter
{
    public static string Format(Product p)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(p.Grade)) parts.Add(p.Grade.Trim());
        if (!string.IsNullOrWhiteSpace(p.MaterialType)) parts.Add(p.MaterialType.Trim());
        if (!string.IsNullOrWhiteSpace(p.Thickness)) parts.Add(p.Thickness.Trim());
        if (!string.IsNullOrWhiteSpace(p.Schedule)) parts.Add(p.Schedule.Trim());
        if (!string.IsNullOrWhiteSpace(p.Diameter))
            parts.Add(p.Diameter.Trim().StartsWith("Ø") ? p.Diameter.Trim() : $"Ø{p.Diameter.Trim()}");
        if (!string.IsNullOrWhiteSpace(p.Size)) parts.Add(p.Size.Trim());
        if (!string.IsNullOrWhiteSpace(p.Width) || !string.IsNullOrWhiteSpace(p.Height))
        {
            var wh = string.Join("×", new[] { p.Width, p.Height }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(wh)) parts.Add(wh);
        }
        if (!string.IsNullOrWhiteSpace(p.Length))
            parts.Add(p.Length.Trim().StartsWith("L", StringComparison.OrdinalIgnoreCase) ? p.Length.Trim() : $"L:{p.Length.Trim()}");
        return string.Join(" · ", parts);
    }
}
