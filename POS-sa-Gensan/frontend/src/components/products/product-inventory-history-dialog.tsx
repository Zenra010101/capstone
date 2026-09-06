"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type { InventoryTransaction, Product } from "@/lib/types";
import { MovementTypeBadge } from "@/components/inventory/movement-type-badge";
import {
  ProductFilteredHistoryShell,
  type DateRange,
} from "@/components/products/product-filtered-history-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductInventoryHistoryDialog({ product, open, onOpenChange }: Props) {
  const [range, setRange] = useState<DateRange>(defaultReportRange(90));
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!product || !open) return;
    setLoading(true);
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", "1");
    params.set("pageSize", "2000");
    params.set("productId", product.id);
    try {
      const res = await api.get<{ items: InventoryTransaction[] }>(`/api/inventory?${params}`);
      setRows(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load inventory history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [product, open, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHistory = async (format: "excel" | "pdf") => {
    if (!product) return;
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", "1");
    params.set("pageSize", "5000");
    params.set("productId", product.id);
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(
        `/api/inventory/export/movements?${params}`,
        `${product.sku}-inventory-history.${ext}`
      );
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  if (!product) return null;

  return (
    <ProductFilteredHistoryShell
      product={product}
      open={open}
      onOpenChange={onOpenChange}
      title="Inventory movement ledger"
      subtitle="Product-specific stock movements — sales, receiving, returns, adjustments"
      range={range}
      onRangeChange={setRange}
      loading={loading}
      recordCount={rows.length}
      onExportExcel={() => void exportHistory("excel")}
      onExportPdf={() => void exportHistory("pdf")}
      footerNote="Full warehouse audit trail for this SKU. Stock changes are never silent."
    >
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead>Date / time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Before</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.createdAt)}</TableCell>
                <TableCell>
                  <MovementTypeBadge label={r.movementTypeLabel} />
                </TableCell>
                <TableCell className="font-mono text-xs">{r.batchCode ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.reference ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.stockBefore}</TableCell>
                <TableCell
                  className={`text-right font-medium tabular-nums ${r.quantity >= 0 ? "text-amount-positive" : "text-amount-negative"}`}
                >
                  {r.quantity >= 0 ? "+" : ""}
                  {r.quantity}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{r.stockAfter}</TableCell>
                <TableCell
                  className="max-w-[140px] truncate text-xs text-muted-foreground"
                  title={r.reason}
                >
                  {r.reason ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.userName ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No inventory movements for this product in the selected date range
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Loading movement ledger…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ProductFilteredHistoryShell>
  );
}

/** @deprecated Use ProductInventoryHistoryDialog */
export const ProductStockHistoryDialog = ProductInventoryHistoryDialog;
