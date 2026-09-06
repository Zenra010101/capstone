export type ReportRangePreset = "today" | "thisWeek" | "thisMonth" | "custom";

export const REPORT_RANGE_PRESETS: { id: ReportRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "thisWeek", label: "This week" },
  { id: "thisMonth", label: "This month" },
  { id: "custom", label: "Custom range" },
];

function formatDateLocal(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function resolveReportRange(
  preset: ReportRangePreset,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const today = new Date();
  const to = formatDateLocal(today);

  switch (preset) {
    case "today":
      return { from: to, to };
    case "thisWeek":
      return { from: formatDateLocal(startOfWeek(today)), to };
    case "thisMonth":
      return { from: formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    case "custom":
      return { from: customFrom ?? to, to: customTo ?? to };
    default:
      return { from: to, to };
  }
}
