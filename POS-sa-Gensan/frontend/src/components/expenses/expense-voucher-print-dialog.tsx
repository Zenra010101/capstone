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
import { ReceiptStoreHeader } from "@/components/print/receipt-store-header";
import { formatAmount, formatDateOnly, EMPTY_FIELD } from "@/lib/format";
import { fetchPrintStamp } from "@/lib/print-stamp";
import type { ExpenseVoucher, StoreSettings } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: ExpenseVoucher | null;
  settings: StoreSettings | null;
};

export function ExpenseVoucherPrintDialog({ open, onOpenChange, voucher, settings }: Props) {
  const [printedAtLabel, setPrintedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !voucher) return;
    void fetchPrintStamp().then((s) => setPrintedAtLabel(s.printedAtLabel));
  }, [open, voucher?.id]);

  if (!voucher) return null;

  const printVoucher = async () => {
    const stamp = await fetchPrintStamp();
    setPrintedAtLabel(stamp.printedAtLabel);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 print:h-auto print:min-h-0 print:max-h-none print:w-[8.5in] print:max-w-none print:overflow-visible print:border-0 print:shadow-none">
        <DialogHeader className="shrink-0 border-b px-4 py-3 print:hidden sm:px-6">
          <DialogTitle>Check voucher — {voucher.voucherNumber}</DialogTitle>
        </DialogHeader>

        <div
          id="expense-voucher-print"
          className="overflow-y-auto bg-white px-4 py-5 text-[11px] leading-snug text-black sm:px-6 print:overflow-visible print:px-5 print:py-4"
        >
          <ReceiptStoreHeader settings={settings} title="CHECK VOUCHER" />

          <div className="mb-3 grid grid-cols-2 gap-3 border border-black p-2 text-[10px] print:text-[9px]">
            <div>
              <p className="font-semibold uppercase">Payee</p>
              <p className="mt-1 font-medium">{voucher.payee}</p>
            </div>
            <div className="space-y-1 text-right">
              <p>
                <span className="font-semibold uppercase">CV No.</span>{" "}
                <span className="font-mono">{voucher.voucherNumber}</span>
              </p>
              <p>
                <span className="font-semibold uppercase">Date</span> {formatDateOnly(voucher.expenseDate)}
              </p>
            </div>
          </div>

          <table className="mb-3 w-full border-collapse border border-black text-[10px] print:text-[9px]">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black px-2 py-1 text-left font-semibold uppercase">Particulars</th>
                <th className="w-28 px-2 py-1 text-right font-semibold uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td className="min-h-[4rem] border-r border-black px-2 py-2">
                  <p>{voucher.particulars}</p>
                  {voucher.categoryName && (
                    <p className="mt-2 text-[9px] text-slate-600">Category: {voucher.categoryName}</p>
                  )}
                  {voucher.remarks && (
                    <p className="mt-1 text-[9px] text-slate-600">Remarks: {voucher.remarks}</p>
                  )}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatAmount(voucher.amount)}</td>
              </tr>
              <tr className="border-t border-black font-semibold">
                <td className="border-r border-black px-2 py-1 text-right uppercase">Total</td>
                <td className="px-2 py-1 text-right tabular-nums">{formatAmount(voucher.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mb-4 grid grid-cols-2 gap-2 border border-black p-2 text-[10px] print:text-[9px] sm:grid-cols-4">
            <div>
              <p className="font-semibold uppercase">Bank</p>
              <p>{voucher.bank || EMPTY_FIELD}</p>
            </div>
            <div>
              <p className="font-semibold uppercase">Check / Ref No.</p>
              <p>{voucher.referenceNumber || EMPTY_FIELD}</p>
            </div>
            <div>
              <p className="font-semibold uppercase">Payment</p>
              <p>{voucher.paymentMethodLabel}</p>
            </div>
            <div>
              <p className="font-semibold uppercase">Status</p>
              <p>{voucher.statusLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-black pt-4 text-[10px] print:grid-cols-3 print:text-[8px]">
            {[
              { label: "Prepared by", name: voucher.createdByName },
              { label: "Received by", name: "" },
              { label: "Paid by", name: voucher.paidByName },
            ].map((sig) => (
              <div key={sig.label} className="text-center">
                <div className="mb-1 h-10 border-b border-black" />
                <p className="font-semibold uppercase">{sig.label}</p>
                <p className="mt-1 min-h-[1rem] text-[9px]">{sig.name || "\u00A0"}</p>
              </div>
            ))}
          </div>

          {printedAtLabel && (
            <p className="mt-4 text-center text-[9px] text-slate-500 print:text-[7px]">Printed {printedAtLabel}</p>
          )}
        </div>

        <DialogFooter showCloseButton={false} className="border-t px-4 py-3 print:hidden sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void printVoucher()}>
            <Printer className="mr-2 h-4 w-4" />
            Print voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
