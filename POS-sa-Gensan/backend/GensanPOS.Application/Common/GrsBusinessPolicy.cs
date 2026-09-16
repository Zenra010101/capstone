namespace GensanPOS.Application.Common;

/// <summary>
/// Store policy for GRS and exchange returns.
/// All released items are assumed resellable; approved returns restore sellable inventory.
/// No defective/quarantine/warranty subsystem in Phase 1 or planned for this workflow.
/// </summary>
public static class GrsBusinessPolicy
{
    public const string Summary =
        "Operational returns only: wrong size, wrong specification, wrong item, or owner-approved exchange. " +
        "The store does not accept defective, broken, used, or warranty returns.";

    public const string AcknowledgmentRequired =
        "Confirm this is an operational return (wrong item, size, or specification). " +
        "Defective, broken, used, and warranty returns are not accepted.";

    public const string InvalidConditionMessage =
        "This workflow is only for operational returns. Defective, broken, used, and warranty returns are not accepted.";

    public const string StockRestoreNotePrefix = "GRS resellable operational return";

    public const string ExportConditionLabel = "Operational (resellable)";
}
