/** Shared ERP modal sizes — applied via data-dialog-size on DialogContent. */
export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "workspace";

export const DIALOG_SIZE_HINT: Record<DialogSize, string> = {
  sm: "Confirmations and short prompts",
  md: "Simple forms and quick actions",
  lg: "CRUD forms, cart review, and payment",
  xl: "Standard business modals (forms, reports, profiles)",
  "2xl": "Alias for workspace — prefer workspace for new code",
  workspace: "Product detail, receiving, and adjustment workspaces (90% viewport)",
};
