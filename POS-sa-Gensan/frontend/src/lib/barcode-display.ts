/** Libre Barcode 128 Text encodes Code Set B when wrapped in asterisks. */
export const CODE128_FONT_FAMILY =
  "'Libre Barcode 128 Text', 'Libre Barcode 128', cursive";

export function toCode128TextPayload(value: string): string {
  const trimmed = normalizeScannedBarcode(value);
  if (!trimmed) return "";
  return `*${trimmed}*`;
}

/** Strip scanner noise (control chars, Code 128 Text *start/stop*, whitespace). */
export function normalizeScannedBarcode(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F]+/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}
