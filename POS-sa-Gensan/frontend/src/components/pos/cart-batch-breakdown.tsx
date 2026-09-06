"use client";

import type { CartItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { cartHasBatchBreakdown } from "@/lib/cart-batch";

export function CartBatchBreakdown({ item }: { item: CartItem }) {
  if (!cartHasBatchBreakdown(item)) return null;

  return (
    <div className="mt-1.5 space-y-0.5 border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
      {item.batchLines.map((line) => (
        <div key={line.batchId} className="flex justify-between gap-2">
          <span>
            {line.quantity} pcs @ {formatCurrency(line.sellingPrice)}
          </span>
          <span className="tabular-nums">{formatCurrency(line.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}
