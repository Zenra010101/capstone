namespace GensanPOS.Domain.Enums;

public enum SupplierStatus
{
    Active = 0,
    Preferred = 1,
    Inactive = 2,
    Blacklisted = 3,
    Archived = 4,
    Suspended = 5
}

public enum SupplierPaymentTerms
{
    Cod = 0,
    Net15 = 1,
    Net30 = 2,
    Net60 = 3,
    ChequeBasis = 4,
    Custom = 5,
    Net7 = 6
}

public enum SupplierContactRole
{
    General = 0,
    SalesRepresentative = 1,
    Accounting = 2,
    Warehouse = 3
}
