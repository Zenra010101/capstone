namespace GensanPOS.Domain.Constants;

public static class RoleNames
{
    public const string Owner = "Owner";
    public const string Cashier = "Cashier";

    public static readonly string[] All = [Owner, Cashier];

    public static bool IsOwner(string role) =>
        string.Equals(role, Owner, StringComparison.OrdinalIgnoreCase);
}
