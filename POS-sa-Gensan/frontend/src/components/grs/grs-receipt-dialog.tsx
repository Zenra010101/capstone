"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

import {

  Dialog,

  DialogContent,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { EMPTY_FIELD, formatAmount, formatDate } from "@/lib/format";
import { fetchPrintStamp } from "@/lib/print-stamp";
import { LockedPrintStamp } from "@/components/print/locked-print-stamp";

import type { GoodsReturnSlip } from "@/lib/types";

import { grsStatusDisplay } from "@/lib/types";
import { GRS_STORE_POLICY } from "@/lib/grs-policy";



type GrsReceiptDialogProps = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  grs: GoodsReturnSlip | null;

};



export function GrsReceiptDialog({ open, onOpenChange, grs }: GrsReceiptDialogProps) {
  const [printedAtLabel, setPrintedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !grs) return;
    void fetchPrintStamp().then((s) => setPrintedAtLabel(s.printedAtLabel));
  }, [open, grs?.id]);

  if (!grs) return null;

  const statusLabel = grsStatusDisplay(grs.status, grs.statusLabel).label;

  const printReceipt = async () => {
    const stamp = await fetchPrintStamp();
    setPrintedAtLabel(stamp.printedAtLabel);
    window.setTimeout(() => window.print(), 100);
  };

  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="grs-receipt-dialog gap-0 p-0 print:h-auto print:min-h-0 print:max-h-none print:w-[8.5in] print:max-w-none print:overflow-visible print:border-0 print:shadow-none">

        <DialogHeader className="shrink-0 border-b px-4 py-3 print:hidden sm:px-6">

          <DialogTitle>GRS receipt</DialogTitle>

        </DialogHeader>



        <div

          id="grs-receipt-print"

          className="overflow-y-auto bg-white px-4 py-5 text-[11px] leading-snug text-black sm:px-6 sm:py-5 print:overflow-visible print:px-5 print:py-3"

        >

          <div className="text-center">

            <p className="text-sm font-bold tracking-wide">GOODS RETURN SLIP</p>

            <p className="font-mono text-xs">{grs.grsNumber}</p>

            {statusLabel && (

              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">

                {statusLabel}

              </p>

            )}

          </div>



          <hr className="my-2 border-dashed border-black" />



          <div className="grid gap-2 text-[10px] sm:text-[11px]">
            <div>
              <p className="font-bold uppercase tracking-wide">Original sale</p>
              <p>
                <span className="font-semibold">Invoice:</span>{" "}
                <span className="font-mono">{grs.originalSaleNumber}</span>
              </p>
              <p>
                <span className="font-semibold">Created by:</span>{" "}
                {grs.originalSaleCashierName || EMPTY_FIELD}
              </p>
              <p>
                <span className="font-semibold">Sale date:</span>{" "}
                {formatDate(grs.originalSaleDate)}
              </p>
              {grs.customerName ? (
                <p>
                  <span className="font-semibold">Customer:</span> {grs.customerName}
                </p>
              ) : null}
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide">
                {grs.exchange ? "Return / exchange" : "Return"}
              </p>
              <p>
                <span className="font-semibold">Processed by:</span> {grs.processedByName}
              </p>
              <p>
                <span className="font-semibold">Processed date:</span>{" "}
                {formatDate(grs.returnDate)}
              </p>
              <p>
                <span className="font-semibold">Customer action:</span>{" "}
                {GRS_STORE_POLICY.customerAction}
              </p>
            </div>
          </div>



          <hr className="my-2 border-dashed border-black" />



          <p className="mb-1 text-[10px] font-semibold">{GRS_STORE_POLICY.receiptItemsHeading}</p>

          <table className="w-full text-[10px]">

            <thead>

              <tr className="border-b border-black text-left">

                <th className="pb-1 font-semibold">Item</th>

                <th className="pb-1 text-right font-semibold">Qty</th>

                <th className="pb-1 text-right font-semibold">Amount</th>

              </tr>

            </thead>

            <tbody>

              {grs.items.map((line, i) => (

                <tr key={line.id ?? `${line.productSku}-${i}`} className="border-b border-dashed border-slate-400">

                  <td className="py-1 pr-2">

                    {line.productName}

                    <span className="block font-mono text-[9px] text-slate-600">

                      {line.productSku}

                    </span>

                  </td>

                  <td className="py-1 text-right">{line.quantity}</td>

                  <td className="py-1 text-right">

                    {formatAmount(line.returnAmount ?? line.lineTotal ?? 0)}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>



          <div className="mt-2 flex justify-between border-t border-black pt-2 text-xs font-bold">

            <span>Total return</span>

            <span className="text-amount-negative">−{formatAmount(grs.totalReturnAmount)}</span>

          </div>



          <p className="mt-2 text-[10px]">

            <span className="font-semibold">Reason:</span> {grs.reason}

          </p>

          {grs.notes && (

            <p className="text-[10px]">

              <span className="font-semibold">Notes:</span> {grs.notes}

            </p>

          )}



          <p className="mt-3 text-[9px] leading-snug text-slate-600">

            Original sales invoice remains on file unchanged. This return is deducted from

            return-date sales totals and stock has been restored.

          </p>

          <LockedPrintStamp
            label={`Date printed: ${printedAtLabel ?? "…"}`}
            className="mt-3 print:mt-1"
          />

        </div>



        <DialogFooter
          showCloseButton={false}
          className="shrink-0 gap-2 border-t px-4 py-3 print:hidden sm:px-6"
        >

          <Button variant="outline" onClick={() => onOpenChange(false)}>

            Close

          </Button>

          <Button onClick={() => void printReceipt()}>

            <Printer className="mr-2 h-4 w-4" />

            Print

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}


