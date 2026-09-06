/** Placeholder for empty receipt/report fields (em dash) */
export const EMPTY_FIELD = "\u2014";

/** Philippine peso — explicit ₱ avoids locale/font showing broken "PHP" or mojibake */
export function formatCurrency(amount: number) {
  const n = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  if (amount < 0) return `−₱${n}`;
  return `₱${n}`;
}

/** Return / deduction line (always shown as negative outflow) */
export function formatCurrencyDeduction(amount: number) {
  return `−${formatCurrency(Math.abs(amount))}`;
}

const PH_TIME: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Manila",
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-PH", PH_TIME);
}

export function formatDateOnly(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" });
}
/** Receipt / invoice date without time (e.g. January 12, 2026). */
export function formatDateLong(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Amount without currency symbol (matches printed store receipts). */
export function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact spec line for stainless products (POS, lists). */
export function formatProductSpec(p: {
  specification?: string | null;
  grade?: string | null;
  materialType?: string | null;
  size?: string | null;
  thickness?: string | null;
  schedule?: string | null;
  diameter?: string | null;
  width?: string | null;
  height?: string | null;
  length?: string | null;
  unitOfMeasure?: string;
}): string {
  if (p.specification?.trim()) return p.specification.trim();
  const parts: string[] = [];
  if (p.grade) parts.push(p.grade);
  if (p.materialType) parts.push(p.materialType);
  if (p.thickness) parts.push(p.thickness);
  if (p.schedule) parts.push(p.schedule);
  if (p.diameter) parts.push(p.diameter.startsWith("Ø") ? p.diameter : `Ø${p.diameter}`);
  if (p.size) parts.push(p.size);
  if (p.width || p.height) {
    const wh = [p.width, p.height].filter(Boolean).join("×");
    if (wh) parts.push(wh);
  }
  if (p.length) parts.push(p.length.startsWith("L") ? p.length : `L:${p.length}`);
  const spec = parts.join(" · ");
  if (p.unitOfMeasure && p.unitOfMeasure !== "pc") {
    return spec ? `${spec} (${p.unitOfMeasure})` : p.unitOfMeasure;
  }
  return spec;
}
