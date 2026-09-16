/** Store policy copy for GRS / exchange UI (keep in sync with docs/GRS-BUSINESS-POLICY.md). */

export const GRS_STORE_POLICY = {

  summary:

    "Operational returns only: wrong size, wrong specification, or wrong item. Cashier completes return and exchange at the counter when validation passes — no owner approval.",

  exchangeWorkflow:

    "Add replacement products at current prices. Replacement total must be at least the return credit. Customer pays the difference only (no cash refund).",

  pageDescription:

    "Return and exchange at the counter. Customer replaces items — not cash/QR refunds. Original invoice stays on file.",

  customerAction: "Replace / exchange at counter",

  acknowledgment:

    "I confirm this is an operational return (wrong item, size, or specification). Defective, broken, used, and warranty returns are not accepted by store policy.",

  acknowledgmentShort: "Operational return only (resellable goods)",

  receiptItemsHeading: "Returned items (operational / resellable)",

} as const;

