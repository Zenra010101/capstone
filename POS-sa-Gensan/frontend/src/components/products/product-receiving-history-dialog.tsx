"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type { Product, ProductReceivingHistory } from "@/lib/types";
import { ReceivingStatusBadge } from "@/components/receiving/receiving-status-badge";
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
  isOwner: boolean;
};

export function ProductReceivingHistoryDialog({ product, open, onOpenChange, isOwner }: Props) {
  const [range, setRange] = useState<DateRange>(defaultReportRange(90));
  const [rows, setRows] = useState<ProductReceivingHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!product || !open) return;
    setLoading(true);
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    try {
      const data = await api.get<ProductReceivingHistory[]>(
        `/api/products/${product.id}/receiving?${params}`
      );
      setRows(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load receiving history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [product, open, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHistory = async () => {
    if (!product) return;
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("format", "excel");
    try {
      await downloadExport(
        `/api/products/${product.id}/receiving/export?${params}`,
        `${product.sku}-receiving-history.xlsx`
      );
      toast.success("Downloaded Excel");
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
      title="Receiving history"
      subtitle="Stock receiving lines for this product only"
      range={range}
      onRangeChange={setRange}
      loading={loading}
      recordCount={rows.length}
      onExportExcel={() => void exportHistory()}
      footerNote={
        isOwner
          ? "Shows receiving request lines tied to this SKU. Pending lines apply after owner approval."
          : "Shows your receiving request lines for this product."
      }
    >
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>RCV #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              {isOwner ? (
                <>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Line cost</TableHead>
                </>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.receivingId}-${i}`}>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(r.createdAt)}</TableCell>
                <TableCell className="font-mono text-xs">{r.receivingNumber}</TableCell>
                <TableCell className="text-sm">{r.supplierName}</TableCell>
                <TableCell>
                  <ReceivingStatusBadge status={r.status} label={r.statusLabel} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.referenceNumber ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.requestedByName}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{r.quantity}</TableCell>
                {isOwner ? (
                  <>
                    <TableCell className="text-right tabular-nums">
                      {r.costPrice != null ? formatCurrency(r.costPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.lineCost != null ? formatCurrency(r.lineCost) : "—"}
                    </TableCell>
                  </>
                ) : null}
              </TableRow>
            ))}
            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 7} className="py-10 text-center text-muted-foreground">
                  No receiving records for this product in the selected date range
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 7} className="py-10 text-center text-muted-foreground">
                  Loading receiving history…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ProductFilteredHistoryShell>
  );
}
