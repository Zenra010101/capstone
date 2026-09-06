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
import { LockedPrintStamp } from "@/components/print/locked-print-stamp";
import { EMPTY_FIELD, formatAmount, formatCurrency, formatDate } from "@/lib/format";
import { fetchPrintStamp } from "@/lib/print-stamp";
import type { GoodsReturnSlip, StoreSettings } from "@/lib/types";
import { PAYMENT_LABELS } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grs: GoodsReturnSlip | null;
  storeSettings: StoreSettings | null;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-bold uppercase tracking-wide text-[10px] sm:text-[11px]">{children}</p>
  );
}

function ReceiptRule() {
  return <hr className="my-2 border-dashed border-black" />;
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 text-[10px] sm:text-[11px] ${bold ? "font-bold" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function ExchangeReceiptDialog({ open, onOpenChange, grs, storeSettings }: Props) {
  const [printedAtLabel, setPrintedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !grs) return;
    void fetchPrintStamp().then((s) => setPrintedAtLabel(s.printedAtLabel));
  }, [open, grs?.id]);

  const ex = grs?.exchange;
  if (!grs || !ex) return null;

  const paymentLabel =
    ex.amountPaid > 0 && ex.paymentMethod != null
      ? PAYMENT_LABELS[ex.paymentMethod] ?? "Payment"
      : "Even exchange (no additional payment)";

  const print = async () => {
    const stamp = await fetchPrintStamp();
    setPrintedAtLabel(stamp.printedAtLabel);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="exchange-receipt-dialog gap-0 p-0 print:h-auto print:min-h-0 print:max-h-none print:w-[8.5in] print:max-w-none print:overflow-visible print:border-0 print:shadow-none">
        <DialogHeader className="shrink-0 border-b px-4 py-3 print:hidden sm:px-6">
          <DialogTitle>Return and exchange receipt</DialogTitle>
        </DialogHeader>

        <div
          id="exchange-receipt-print"
          className="overflow-y-auto bg-white px-4 py-5 text-[11px] leading-snug text-black sm:px-6 sm:py-5 print:overflow-visible print:px-5 print:py-3"
        >
          <ReceiptStoreHeader settings={storeSettings} title="RETURN & EXCHANGE RECEIPT" />

          <div className="space-y-2 text-[10px] sm:text-[11px]">
            <div>
              <SectionTitle>Original sale</SectionTitle>
              <p>
                <span className="font-semibold">Invoice:</span>{" "}
                <span className="font-mono">{grs.originalSaleNumber}</span>
              </p>
              <p>
                <span className="font-semibold">Original sale by:</span>{" "}
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

            <ReceiptRule />

            <div>
              <SectionTitle>Return &amp; exchange</SectionTitle>
              <p>
                <span className="font-semibold">Exchange no.:</span>{" "}
                <span className="font-mono">{ex.exchangeNumber}</span>
              </p>
              <p>
                <span className="font-semibold">GRS no.:</span>{" "}
                <span className="font-mono">{grs.grsNumber}</span>
              </p>
              <p>
                <span className="font-semibold">Processed by:</span> {grs.processedByName}
              </p>
              <p>
                <span className="font-semibold">Processed date:</span>{" "}
                {formatDate(grs.returnDate)}
              </p>
            </div>
          </div>

          <ReceiptRule />

          <SectionTitle>Returned items</SectionTitle>
          <table className="mt-1 w-full text-[10px]">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="pb-1 font-semibold">Item</th>
                <th className="pb-1 text-right font-semibold">Qty</th>
                <th className="pb-1 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {grs.items.map((line, i) => (
                <tr
                  key={line.id ?? `${line.productSku}-${i}`}
                  className="border-b border-dashed border-slate-400"
                >
                  <td className="py-1 pr-2">{line.productName}</td>
                  <td className="py-1 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatAmount(line.returnAmount ?? line.lineTotal ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ReceiptRule />

          <SectionTitle>Replacement items</SectionTitle>
          <table className="mt-1 w-full text-[10px]">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="pb-1 font-semibold">Item</th>
                <th className="pb-1 text-right font-semibold">Qty</th>
                <th className="pb-1 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ex.lines.map((line) => (
                <tr
                  key={line.productId}
                  className="border-b border-dashed border-slate-400"
                >
                  <td className="py-1 pr-2">{line.productName}</td>
                  <td className="py-1 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-1 text-right tabular-nums">{formatAmount(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ReceiptRule />

          <SectionTitle>Exchange summary</SectionTitle>
          <div className="mt-2 space-y-1">
            <SummaryRow label="Return credit" value={formatCurrency(ex.returnCreditTotal)} />
            <SummaryRow label="Replacement total" value={formatCurrency(ex.replacementTotal)} />
            <hr className="my-1.5 border-dashed border-black" />
            <SummaryRow
              label="Additional payment"
              value={formatCurrency(ex.amountPaid)}
              bold
            />
            <SummaryRow label="Payment method" value={paymentLabel} />
            {ex.topUpSaleNumber ? (
              <p className="pt-1 text-[10px]">
                <span className="font-semibold">Payment invoice:</span>{" "}
                <span className="font-mono">{ex.topUpSaleNumber}</span>
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-center text-[10px]">Thank you!</p>

          <LockedPrintStamp
            label={`Date printed: ${printedAtLabel ?? "…"}`}
            className="mt-3 print:mt-1"
          />
        </div>

        <DialogFooter showCloseButton={false} className="shrink-0 gap-2 border-t px-4 py-3 print:hidden sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => void print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
