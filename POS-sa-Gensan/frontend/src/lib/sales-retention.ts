import { toStoreDateInputValue } from "@/lib/report-dates";

/** Store-local sales retention windows (must match backend SalesRetentionPolicy). */
export const CASHIER_SALES_LOOKBACK_DAYS = 7;
export const OWNER_SALES_RETENTION_YEARS = 5;

export function salesHistoryDefaultRangeDays(isOwner: boolean) {
  return isOwner ? 90 : CASHIER_SALES_LOOKBACK_DAYS;
}

export function salesHistoryMinDate(isOwner: boolean): string {
  const d = new Date();
  if (isOwner) {
    d.setFullYear(d.getFullYear() - OWNER_SALES_RETENTION_YEARS);
  } else {
    d.setDate(d.getDate() - CASHIER_SALES_LOOKBACK_DAYS);
  }
  return toStoreDateInputValue(d);
}

export const CASHIER_SALES_DENIED =
  "Cashiers can only view sales records from the last 7 days.";
export const OWNER_SALES_DENIED =
  "Records older than 5 years are outside the retention period.";
