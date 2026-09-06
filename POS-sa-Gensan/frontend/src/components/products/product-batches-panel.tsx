"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { Product, ProductBatch } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { softBadge } from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductBatchesPanelProps = {
  product: Product;
  isOwner: boolean;
  className?: string;
};

function batchStatusClass(status: string): string {
  switch (status) {
    case "Active":
      return softBadge.success;
    case "Depleted":
      return softBadge.neutral;
    case "Low Stock":
      return softBadge.warning;
    case "Inactive":
      return softBadge.danger;
    default:
      return softBadge.neutral;
  }
}

export function ProductBatchesPanel({ product, isOwner, className }: ProductBatchesPanelProps) {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.get<ProductBatch[]>(`/api/products/${product.id}/batches`);
      setBatches(Array.isArray(rows) ? rows : []);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-3 shrink-0 border-b border-border/60 pb-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Inventory batches</h3>
          {!loading && batches.length > 0 ? (
            <Badge variant="secondary" className="h-5 text-[11px] font-medium tabular-nums">
              {batches.length} batch{batches.length === 1 ? "" : "es"}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          One batch per approved receiving line. FIFO sales consume the oldest active batch first.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading batches…</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No batches yet. Approve a stock receiving request for this product to create one.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60">
          <Table enterprise className="min-w-[52rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 min-w-[7.5rem] bg-card shadow-[0_1px_0_var(--border)]">
                  Batch code
                </TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[6.5rem] bg-card shadow-[0_1px_0_var(--border)]">
                  Received
                </TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[8rem] bg-card shadow-[0_1px_0_var(--border)]">
                  Supplier
                </TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[5.5rem] bg-card text-right shadow-[0_1px_0_var(--border)]">
                  Original
                </TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[5.5rem] bg-card text-right shadow-[0_1px_0_var(--border)]">
                  Remaining
                </TableHead>
                {isOwner ? (
                  <TableHead className="sticky top-0 z-10 min-w-[5.5rem] bg-card text-right shadow-[0_1px_0_var(--border)]">
                    Cost
                  </TableHead>
                ) : null}
                <TableHead className="sticky top-0 z-10 min-w-[5.5rem] bg-card text-right shadow-[0_1px_0_var(--border)]">
                  Selling
                </TableHead>
                <TableHead className="sticky top-0 z-10 min-w-[6.5rem] bg-card shadow-[0_1px_0_var(--border)]">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-sm">{b.batchCode ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateOnly(b.receivedDate)}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm">
                    {b.supplierName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {b.receivedQuantity} {product.unitOfMeasure}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {b.remainingQuantity} {product.unitOfMeasure}
                  </TableCell>
                  {isOwner ? (
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(b.costPrice)}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(b.sellingPrice)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-6 px-2.5 text-xs font-semibold",
                        batchStatusClass(b.status)
                      )}
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
