using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class SupplierLabels
{
    public static string Status(SupplierStatus status) => status switch
    {
        SupplierStatus.Preferred => "Preferred supplier",
        SupplierStatus.Inactive => "Inactive",
        SupplierStatus.Blacklisted => "Blacklisted",
        SupplierStatus.Archived => "Archived",
        SupplierStatus.Suspended => "Suspended",
        _ => "Active"
    };

    public static string PaymentTerms(SupplierPaymentTerms terms, string? custom) => terms switch
    {
        SupplierPaymentTerms.Cod => "COD",
        SupplierPaymentTerms.Net7 => "7 days",
        SupplierPaymentTerms.Net15 => "15 days",
        SupplierPaymentTerms.Net30 => "30 days",
        SupplierPaymentTerms.Net60 => "60 days",
        SupplierPaymentTerms.ChequeBasis => "Cheque basis",
        SupplierPaymentTerms.Custom => string.IsNullOrWhiteSpace(custom) ? "Custom" : custom.Trim(),
        _ => "COD"
    };

    public static string ContactRole(SupplierContactRole role) => role switch
    {
        SupplierContactRole.SalesRepresentative => "Sales representative",
        SupplierContactRole.Accounting => "Accounting",
        SupplierContactRole.Warehouse => "Warehouse contact",
        _ => "General"
    };

    public static bool CanReceiveStock(SupplierStatus status) =>
        status is SupplierStatus.Active or SupplierStatus.Preferred;

    public static bool IsActiveStatus(SupplierStatus status) => CanReceiveStock(status);
}
