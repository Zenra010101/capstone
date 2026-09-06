namespace GensanPOS.Infrastructure.Persistence;

/// <summary>Default stainless/hardware categories used for fresh installs and import validation.</summary>
public static class CatalogCategories
{
    public static readonly (string Name, string Description)[] Defaults =
    [
        ("Stainless Sheets", "Flat stainless sheet stock"),
        ("Stainless Plates", "Heavy plate and checker plate"),
        ("Stainless Tubes", "Square and rectangular tubing"),
        ("Stainless Bars", "Round, flat, and angle bars"),
    ];
}
