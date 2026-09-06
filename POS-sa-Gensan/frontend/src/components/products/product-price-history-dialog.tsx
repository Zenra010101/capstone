"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Product, ProductPriceHistory } from "@/lib/types";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProductPriceHistoryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rows, setRows] = useState<ProductPriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product || !open) return;
    setLoading(true);
    api
      .get<ProductPriceHistory[]>(`/api/products/${product.id}/price-history`)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [product, open]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <DialogTitle>Price history — {product.sku}</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-5 py-4 sm:px-6">
        <div className="overflow-x-auto rounded-lg border">
          <Table enterprise>
            <TableHeader>
              <TableRow>
                <TableHead>Date / time</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Changed by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.changedAt}-${i}`}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(r.changedAt)}</TableCell>
                  <TableCell>{r.field}</TableCell>
                  <TableCell className="text-amount-negative line-through">{r.oldValue ?? "—"}</TableCell>
                  <TableCell className="font-medium text-amount-positive">{r.newValue ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.changedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!loading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No price changes recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
