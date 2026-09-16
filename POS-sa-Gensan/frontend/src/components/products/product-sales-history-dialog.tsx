"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type { Product, ProductSaleHistory } from "@/lib/types";
import { SALE_STATUS } from "@/lib/types";
import {
  ProductFilteredHistoryShell,
  type DateRange,
} from "@/components/products/product-filtered-history-shell";
import { Badge } from "@/components/ui/badge";
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

export function ProductSalesHistoryDialog({ product, open, onOpenChange, isOwner }: Props) {
  const [range, setRange] = useState<DateRange>(defaultReportRange(90));
  const [rows, setRows] = useState<ProductSaleHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!product || !open) return;
    setLoading(true);
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    try {
      const data = await api.get<ProductSaleHistory[]>(`/api/products/${product.id}/sales?${params}`);
      setRows(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load sales history");
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
        `/api/products/${product.id}/sales/export?${params}`,
        `${product.sku}-sales-history.xlsx`
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
      title="Sales history"
      subtitle="Sale line items for this product only"
      range={range}
      onRangeChange={setRange}
      loading={loading}
      recordCount={rows.length}
      onExportExcel={() => void exportHistory()}
      footerNote={
        isOwner
          ? "Line-level sales including voided transactions. Financial columns are owner-only."
          : "Your sale lines for this product including voided transactions."
      }
    >
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sale #</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Line total</TableHead>
              {isOwner ? (
                <>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const statusMeta = SALE_STATUS[r.status];
              return (
                <TableRow key={`${r.saleId}-${i}`}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(r.saleDate)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.saleNumber}</TableCell>
                  <TableCell className="text-sm">{r.cashierName}</TableCell>
                  <TableCell>
                    <Badge variant={statusMeta?.variant ?? "outline"} className="h-5 text-[11px]">
                      {r.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{r.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(r.lineTotal)}
                  </TableCell>
                  {isOwner ? (
                    <>
                      <TableCell className="text-right tabular-nums">
                        {r.costPriceAtSale != null ? formatCurrency(r.costPriceAtSale) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.lineProfit != null ? formatCurrency(r.lineProfit) : "—"}
                      </TableCell>
                    </>
                  ) : null}
                </TableRow>
              );
            })}
            {!loading && !rows.length && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 7} className="py-10 text-center text-muted-foreground">
                  No sales for this product in the selected date range
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 7} className="py-10 text-center text-muted-foreground">
                  Loading sales history…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ProductFilteredHistoryShell>
  );
}
