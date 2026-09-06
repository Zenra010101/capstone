"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaleReceiptPrint } from "@/components/pos/sale-receipt-print";
import {
  RECEIPT_PAPER_OPTIONS,
  normalizeReceiptPaperSize,
  receiptPreviewWidthClass,
} from "@/lib/receipt-paper";
import { groupSaleItemsForReceipt } from "@/lib/receipt-line-groups";
import type { Sale, StoreSettings } from "@/lib/types";
import { PaymentMethod, PAYMENT_LABELS } from "@/lib/types";

export type SaleReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  storeSettings: StoreSettings | null;
  /** Fallback when API has not yet returned terms (e.g. right after checkout). */
  termsDaysOverride?: number;
};

export function SaleReceiptDialog({
  open,
  onOpenChange,
  sale,
  storeSettings,
  termsDaysOverride,
}: SaleReceiptDialogProps) {
  const paperSize = normalizeReceiptPaperSize(storeSettings?.receiptPaperSize);
  const previewWidth = receiptPreviewWidthClass(paperSize);

  const isUtang = sale?.paymentMethod === PaymentMethod.Charged;
  const isCheque = sale?.paymentMethod === PaymentMethod.Cheque;

  const termsLabel = useMemo(() => {
    if (!sale) return "";
    if (isUtang) {
      const days = sale.termsDays ?? termsDaysOverride ?? 30;
      return `${days} Days`;
    }
    if (isCheque) return "Cheque / PDC";
    return PAYMENT_LABELS[sale.paymentMethod] ?? "Paid";
  }, [sale, isUtang, isCheque, termsDaysOverride]);

  const receiptLines = useMemo(
    () => (sale ? groupSaleItemsForReceipt(sale.items) : []),
    [sale]
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const printReceipt = async () => {
    await new Promise((r) => window.setTimeout(r, 100));
    window.print();
  };

  const paperLabel =
    RECEIPT_PAPER_OPTIONS.find((o) => o.value === paperSize)?.label ?? "A5";

  const printProps = sale
    ? {
        sale,
        storeSettings,
        receiptLines,
        termsLabel,
      }
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          scrollBody={false}
          className={`sale-receipt-dialog mx-auto gap-0 p-0 print:hidden ${previewWidth}`}
        >
          <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6">
            <DialogTitle>Receipt — {sale?.saleNumber ?? "..."}</DialogTitle>
          </DialogHeader>

          {sale && printProps ? (
            <div className="sale-receipt-preview overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <SaleReceiptPrint {...printProps} />
            </div>
          ) : null}

          <DialogFooter showCloseButton={false} className="shrink-0 gap-2 border-t px-4 py-3 sm:px-6">
            <p className="mr-auto self-center text-[11px] text-muted-foreground">
              Print: {paperLabel} · dynamic height · turn off browser headers/footers ·{" "}
              {receiptLines.length} line{receiptLines.length === 1 ? "" : "s"}
            </p>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" onClick={printReceipt} disabled={!sale}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mounted && open && printProps
        ? createPortal(
            <SaleReceiptPrint {...printProps} printRootId="sale-receipt-print" />,
            document.body
          )
        : null}
    </>
  );
}
