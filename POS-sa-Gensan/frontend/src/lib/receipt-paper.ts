export type ReceiptPaperSize = "A5" | "A4";

export const RECEIPT_SYSTEM_FOOTER = "GENSAN POS Enterprise POS & Inventory";

export const RECEIPT_PAPER_OPTIONS: {
  value: ReceiptPaperSize;
  label: string;
  description: string;
}[] = [
  {
    value: "A5",
    label: "A5 Half Bond Paper (Recommended)",
    description: "Compact receipts — about 50% less paper for typical sales.",
  },
  {
    value: "A4",
    label: "Full A4",
    description: "Full-page receipts for stores that prefer standard bond paper.",
  },
];

export function normalizeReceiptPaperSize(value?: string | null): ReceiptPaperSize {
  return value?.trim().toUpperCase() === "A4" ? "A4" : "A5";
}

export function receiptPaperClass(size?: string | null): "receipt-paper-a5" | "receipt-paper-a4" {
  return normalizeReceiptPaperSize(size) === "A4" ? "receipt-paper-a4" : "receipt-paper-a5";
}

export function receiptPreviewWidthClass(size?: string | null): string {
  return normalizeReceiptPaperSize(size) === "A4"
    ? "max-w-[210mm]"
    : "max-w-[148mm]";
}
