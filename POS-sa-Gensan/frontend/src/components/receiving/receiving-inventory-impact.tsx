"use client";

import { formatCurrency } from "@/lib/format";
import type { StockReceivingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  items: StockReceivingItem[];
  showCosts?: boolean;
  compact?: boolean;
  className?: string;
};

export function ReceivingInventoryImpact({
  items,
  showCosts = true,
  compact = false,
  className,
}: Props) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/70",
        className
      )}
    >
      <table className={cn("w-full min-w-[640px] text-sm", compact && "text-xs")}>
        <thead className="border-b bg-muted/90">
          <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2 text-right">Current</th>
            <th className="px-3 py-2 text-right">Incoming</th>
            <th className="px-3 py-2 text-right">After approval</th>
            {showCosts ? (
              <th className="px-3 py-2 text-right">Line total</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((line) => {
            const current = line.currentStockQuantity ?? 0;
            const projected =
              line.projectedStockAfterApproval ?? current + line.quantity;
            return (
              <tr key={line.id} className="bg-card/60">
                <td className="px-3 py-2">
                  <p className="font-medium">{line.productName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {line.productSku}
                  </p>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {current} {line.unitOfMeasure}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-amount-positive">
                  +{line.quantity} {line.unitOfMeasure}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {projected} {line.unitOfMeasure}
                </td>
                {showCosts ? (
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
