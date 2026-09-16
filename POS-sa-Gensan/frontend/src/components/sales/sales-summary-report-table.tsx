"use client";

import { formatAmount } from "@/lib/format";
import type { SalesSummaryReport } from "@/lib/types";

export const SALES_SUMMARY_COLUMNS = [
  "DATE",
  "DR #",
  "CI #",
  "CH #",
  "CUSTOMER",
  "PCS",
  "SIZE",
  "TYPE",
  "PRICE",
  "TOTAL",
  "DISC %",
  "CASH",
  "CURRENT",
  "CHARGE",
  "ONLINE",
  "TERM",
] as const;

/** Compact columns for print/PDF — matches client daily sales report layout. */
export const SALES_SUMMARY_PRINT_COLUMNS = [
  "DATE",
  "DR #",
  "CI #",
  "CH #",
  "CUSTOMER",
  "PCS",
  "SIZE",
  "TYPE",
  "PRICE",
  "TOTAL",
  "CASH",
  "CURRENT",
  "CHARGE",
  "ONLINE",
  "TERM",
] as const;

/** Print column widths (% of table) — tuned for A4 landscape. */
const PRINT_COL_WIDTHS = [
  "5.5%", "6%", "4.5%", "5%", "11%", "3.5%", "5.5%", "12%",
  "5.5%", "6%", "5.5%", "5.5%", "5.5%", "5.5%", "7.5%",
] as const;

function formatSaleDate(date: string, short = false) {
  const d = new Date(date);
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: short ? "2-digit" : "numeric",
  });
}

type SalesSummaryReportTableProps = {
  report: SalesSummaryReport;
  compact?: boolean;
  forPrint?: boolean;
  className?: string;
};

export function SalesSummaryReportTable({
  report,
  compact = false,
  forPrint = false,
  className = "",
}: SalesSummaryReportTableProps) {
  const columns = forPrint ? SALES_SUMMARY_PRINT_COLUMNS : SALES_SUMMARY_COLUMNS;
  const cell = compact || forPrint
    ? "border border-black px-0.5 py-0.5"
    : "border border-border px-2 py-1.5";
  const head = compact || forPrint
    ? "border border-black px-0.5 py-1 text-left font-bold whitespace-nowrap"
    : "border border-border bg-muted/50 px-2 py-2 text-left text-xs font-semibold";

  return (
    <div className={`${forPrint ? "sales-summary-table-wrap" : "overflow-x-auto"} ${className}`}>
      <table
        className={`w-full border-collapse ${
          forPrint
            ? "sales-summary-table table-fixed"
            : compact
              ? "min-w-[780px] text-[9px]"
              : "min-w-[1020px] text-xs"
        }`}
      >
        {forPrint ? (
          <colgroup>
            {PRINT_COL_WIDTHS.map((width, i) => (
              <col key={columns[i] ?? i} style={{ width }} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {columns.map((h) => (
              <th key={h} className={head}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.lines?.length ? (
            report.lines.map((line, idx) => (
              <tr
                key={`${line.drNumber}-${idx}`}
                className={
                  forPrint && idx % 2 === 1
                    ? "sales-summary-row-alt"
                    : compact || forPrint
                      ? undefined
                      : "hover:bg-muted/30"
                }
              >
                <td className={cell}>{formatSaleDate(line.saleDate, forPrint)}</td>
                <td className={cell}>{line.drNumber}</td>
                <td className={cell}>{line.ciNumber ?? ""}</td>
                <td className={cell}>{line.chNumber ?? ""}</td>
                <td className={`${cell} truncate`}>{line.customerName}</td>
                <td className={`${cell} text-right`}>{line.quantity}</td>
                <td className={`${cell} truncate`}>{line.size}</td>
                <td className={`${cell} truncate`}>{line.type}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatAmount(line.unitPrice)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatAmount(line.lineTotal)}</td>
                {!forPrint ? (
                  <td className={`${cell} text-right tabular-nums`}>
                    {line.discountPercent.toFixed(1)}
                  </td>
                ) : null}
                <td className={`${cell} text-right tabular-nums`}>
                  {line.cashAmount > 0 ? formatAmount(line.cashAmount) : ""}
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {(line.currentAmount ?? 0) > 0 ? formatAmount(line.currentAmount) : ""}
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {line.chargeAmount > 0 ? formatAmount(line.chargeAmount) : ""}
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {line.onlineAmount > 0 ? formatAmount(line.onlineAmount) : ""}
                </td>
                <td className={cell}>{line.term}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={`${cell} py-8 text-center text-muted-foreground`}>
                No sales line items for this period
              </td>
            </tr>
          )}
          <tr className={`font-bold ${forPrint ? "sales-summary-totals-row" : ""}`}>
            <td className={cell} colSpan={9}>
              NET TOTAL
            </td>
            <td className={`${cell} text-right tabular-nums`}>
              {formatAmount(report.totalLineAmount)}
            </td>
            {!forPrint ? <td className={cell} /> : null}
            <td className={`${cell} text-right tabular-nums`}>
              {formatAmount(report.totalCash)}
            </td>
            <td className={`${cell} text-right tabular-nums`}>
              {(report.totalCurrent ?? 0) > 0 ? formatAmount(report.totalCurrent ?? 0) : ""}
            </td>
            <td className={`${cell} text-right tabular-nums`}>
              {report.totalCharge > 0 ? formatAmount(report.totalCharge) : ""}
            </td>
            <td className={`${cell} text-right tabular-nums`}>
              {report.totalOnline > 0 ? formatAmount(report.totalOnline) : ""}
            </td>
            <td className={cell} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
