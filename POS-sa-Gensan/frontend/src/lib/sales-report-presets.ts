export type SalesReportPreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export type CashierDayOption = {
  isoDate: string;
  label: string;
};

export const SALES_REPORT_PRESETS: {
  id: SalesReportPreset;
  label: string;
  apiPreset: string;
  ownerOnly?: boolean;
}[] = [
  { id: "today", label: "Today", apiPreset: "today" },
  { id: "yesterday", label: "Yesterday", apiPreset: "yesterday", ownerOnly: true },
  { id: "thisWeek", label: "This week", apiPreset: "thisweek", ownerOnly: true },
  { id: "lastWeek", label: "Last week", apiPreset: "lastweek", ownerOnly: true },
  { id: "thisMonth", label: "This month", apiPreset: "thismonth", ownerOnly: true },
  { id: "lastMonth", label: "Last month", apiPreset: "lastmonth", ownerOnly: true },
  { id: "custom", label: "Custom range", apiPreset: "custom", ownerOnly: true },
];

const STORE_TZ = "Asia/Manila";

/** Calendar date (YYYY-MM-DD) in store timezone, N days before store today. */
export function storeCalendarDateIso(daysAgo: number, from = new Date()): string {
  const todayIso = from.toLocaleDateString("en-CA", { timeZone: STORE_TZ });
  const [y, m, d] = todayIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - daysAgo);
  return dt.toISOString().slice(0, 10);
}

/** One button per day — cashiers can open any day within the 7-day retention window. */
export function buildCashierDayOptions(
  lookbackDays = 7,
  from = new Date()
): CashierDayOption[] {
  const options: CashierDayOption[] = [];
  for (let daysAgo = 0; daysAgo < lookbackDays; daysAgo++) {
    const isoDate = storeCalendarDateIso(daysAgo, from);
    const labelDate = new Date(`${isoDate}T12:00:00`);
    const label =
      daysAgo === 0
        ? "Today"
        : daysAgo === 1
          ? "Yesterday"
          : labelDate.toLocaleDateString("en-PH", {
              timeZone: STORE_TZ,
              weekday: "short",
              month: "short",
              day: "numeric",
            });
    options.push({ isoDate, label });
  }
  return options;
}

export function salesSummaryQuery(
  apiPreset: string,
  customFrom?: string,
  customTo?: string
) {
  const params = new URLSearchParams({ preset: apiPreset });
  if (apiPreset === "custom" && customFrom && customTo) {
    params.set("from", customFrom);
    params.set("to", customTo);
  }
  return params.toString();
}

/** Cashiers use custom preset with the same from/to date (single-day report). */
export function cashierSalesSummaryQuery(isoDate: string) {
  return salesSummaryQuery("custom", isoDate, isoDate);
}
