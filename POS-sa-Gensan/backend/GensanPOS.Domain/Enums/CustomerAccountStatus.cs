namespace GensanPOS.Domain.Enums;

/// <summary>Display status for customer account (may be computed from receivables).</summary>
public enum CustomerAccountStatus
{
    Active = 0,
    Overdue = 1,
    Blacklisted = 2,
    Inactive = 3,
    Blocked = 4
}
