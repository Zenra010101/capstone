"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { InventoryTransaction, Paged } from "@/lib/types";
import { MovementTypeBadge } from "./movement-type-badge";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
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

type Props = {
  productId: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function InventoryLedgerDialog({ productId, productName, open, onOpenChange }: Props) {
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!productId || !open) return;
    setLoading(true);
    api
      .get<Paged<InventoryTransaction>>(
        `/api/inventory?productId=${productId}&page=${page}&pageSize=${pageSize}`
      )
      .then((data) => {
        setRows(data.items ?? []);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setTotalCount(data.totalCount ?? 0);
      })
      .catch(() => {
        setRows([]);
        setTotalPages(1);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [productId, open, page, pageSize]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [productId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <DialogTitle className="pr-8">Inventory ledger — {productName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete movement history (sales, receiving, returns, adjustments, voids).
          </p>
        </DialogHeader>
        <DialogBody className="px-5 py-4 sm:px-6">
        <div className="overflow-x-auto rounded-lg border">
          <Table enterprise className="min-w-0 w-full">
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
                  <TableCell className="text-right">{r.stockBefore}</TableCell>
                  <TableCell className={`text-right font-medium ${r.quantity >= 0 ? "text-amount-positive" : "text-amount-negative"}`}>
                    {r.quantity >= 0 ? "+" : ""}{r.quantity}
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.stockAfter}</TableCell>
                  <TableCell className="max-w-[12rem] text-xs text-muted-foreground" title={r.reason}>
                    <span className="line-clamp-2">{r.reason ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.userName ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!loading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    No movements recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          itemLabel="movements"
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          className="mt-3 rounded-lg border bg-card"
        />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
