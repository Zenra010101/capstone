namespace GensanPOS.Infrastructure.Persistence;

public static class ExpenseDefaultCategories
{
    public static readonly (string Name, string Description)[] Defaults =
    [
        ("Delivery Expense", "Freight and delivery costs"),
        ("Fuel", "Vehicle fuel and transport"),
        ("Utilities", "Electric, water, internet, and utilities"),
        ("Repairs & Maintenance", "Equipment and facility repairs"),
        ("Office Supplies", "Office and shop supplies"),
        ("Bank Charges", "Bank fees and service charges"),
        ("Miscellaneous", "Other operating expenses")
    ];
}
