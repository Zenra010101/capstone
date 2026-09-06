"use client";

import type { CartItem } from "@/lib/types";
import type { SaleTaxResult } from "@/lib/tax";
import { formatCurrency, formatProductSpec } from "@/lib/format";
import { cartItemLineTotal, cartItemDisplayPrice } from "@/lib/cart-batch";
import { CartBatchBreakdown } from "@/components/pos/cart-batch-breakdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaleTaxSummary } from "@/components/pos/sale-tax-summary";

type CartReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  subtotal: number;
  saleTax: SaleTaxResult;
  total: number;
  onProceed: () => void;
};

export function CartReviewDialog({
  open,
  onOpenChange,
  cart,
  subtotal,
  saleTax,
  total,
  onProceed,
}: CartReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        showCloseButton
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden bg-white p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-white px-4 py-4 sm:px-6">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Review Customer Cart
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Confirm products, quantities, and total before payment.
          </p>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:divide-x">
          <DialogBody className="bg-white px-4 py-4 sm:px-6">
            <div className="space-y-4">
              {cart.map((item) => {
                const spec = formatProductSpec(item.product);
                return (
                  <div
                    key={item.product.id}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-snug">
                          {item.product.name}
                        </p>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {formatCurrency(cartItemDisplayPrice(item))} /{" "}
                          {item.product.unitOfMeasure}
                          {spec ? ` — ${spec}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-lg font-semibold tabular-nums">
                        {formatCurrency(cartItemLineTotal(item))}
                      </p>
                    </div>
                    <CartBatchBreakdown item={item} />
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Qty:{" "}
                        <span className="text-xl font-bold tabular-nums text-foreground">
                          {item.quantity}
                        </span>
                      </span>
                      {item.discount > 0 ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          Discount: {formatCurrency(item.discount)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogBody>

          <div className="flex shrink-0 flex-col border-t bg-slate-50/95 p-5 sm:p-6 lg:border-t-0">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Order summary</h3>
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Line items</span>
                <span className="text-base font-medium tabular-nums">{cart.length}</span>
              </div>
              <SaleTaxSummary subtotal={subtotal} tax={saleTax} largeTotal />
            </div>
            <div className="mt-4 rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total due
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-primary sm:text-4xl">
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter
          className="shrink-0 border-t bg-white p-4 sm:px-6"
          showCloseButton={false}
        >
          <Button className="h-12 w-full text-base sm:max-w-xs sm:ml-auto" onClick={onProceed}>
            Confirm order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
