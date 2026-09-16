"use client";

import { formatAmount } from "@/lib/format";
import type { InventoryStockListReport } from "@/lib/types";

type InventoryStockListPrintProps = {
  report: InventoryStockListReport;
};

export function InventoryStockListPrint({ report }: InventoryStockListPrintProps) {
  return (
    <div id="inventory-stock-list-print" className="hidden print:block">
      <div className="print-stamp-locked sales-summary-print-stamp" aria-hidden>
        {report.printedAtLabel}
      </div>
      <div className="text-black">
        <header className="text-center">
          <h1 className="text-lg font-bold">INVENTORY STOCK LIST</h1>
          <p className="mt-1 text-sm">{report.periodLabel}</p>
          <p className="print-stamp-locked mt-1 text-[10px] text-black/60" data-server-stamp="true">
            Printed: {report.printedAtLabel}
          </p>
          <p className="mt-1 text-sm font-semibold">
            Total inventory value at cost: {formatAmount(report.totalValueAtCost)}
          </p>
        </header>

        <table className="mt-3 w-full border-collapse text-[9px]">
          <thead>
            <tr>
              {["Product", "SKU", "Batch", "Received", "Original", "Remaining", "Cost", "Sell", "Value"].map((h) => (
                <th key={h} className="border border-black px-1 py-1 text-left font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.lines.map((line, idx) => (
              <tr key={`${line.productSku}-${line.batchCode}-${idx}`}>
                <td className="border border-black px-1 py-0.5">{line.productName}</td>
                <td className="border border-black px-1 py-0.5">{line.productSku}</td>
                <td className="border border-black px-1 py-0.5">{line.batchCode}</td>
                <td className="border border-black px-1 py-0.5">{line.receivedDate}</td>
                <td className="border border-black px-1 py-0.5 text-right">{line.receivedQuantity}</td>
                <td className="border border-black px-1 py-0.5 text-right">{line.remainingQuantity}</td>
                <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                  {formatAmount(line.costPrice)}
                </td>
                <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                  {formatAmount(line.sellingPrice)}
                </td>
                <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                  {formatAmount(line.valueAtCost)}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="border border-black px-1 py-1" colSpan={6}>
                TOTAL
              </td>
              <td className="border border-black px-1 py-1 text-right tabular-nums">
                {formatAmount(report.totalValueAtCost)}
              </td>
            </tr>
          </tbody>
        </table>

        <footer className="mt-6 grid grid-cols-3 gap-6 text-[10px]">
          <div>
            <p className="font-bold">PREPARED BY:</p>
            <p className="mt-8 border-t border-black pt-1">________________</p>
          </div>
          <div>
            <p className="font-bold">APPROVED BY:</p>
            <p className="mt-8 border-t border-black pt-1">________________</p>
          </div>
          <div>
            <p className="font-bold">DATE:</p>
            <p className="print-stamp-locked mt-8 border-t border-black pt-1" data-server-stamp="true">
              {report.printedDateLabel}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
