"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { InventoryAdjustmentRequest } from "@/lib/types";
import { AdjustmentRequestStatus } from "@/lib/types";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdjustmentStatusBadge } from "./adjustment-status-badge";
import { DifferenceDisplay } from "./difference-display";

export function AdjustmentDetailDialog({
  item,
  open,
  onOpenChange,
  isOwner,
}: {
  item: InventoryAdjustmentRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: boolean;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="workspace" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <DialogTitle>Adjustment request</DialogTitle>
        </DialogHeader>
        <DialogBody className="px-5 py-4 sm:px-6">
        <dl className="grid gap-3 text-sm">
          <Row label="Product" value={`${item.productName} (${item.productSku})`} />
          {item.categoryName && <Row label="Category" value={item.categoryName} />}
          <Row label="Type" value={item.adjustmentTypeLabel} />
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-slate-50 p-3">
            <div>
              <dt className="text-xs text-muted-foreground">Before (system)</dt>
              <dd className="text-lg font-bold">{item.systemQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">After (actual)</dt>
              <dd className="text-lg font-bold">{item.actualQuantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Difference</dt>
              <dd className="text-lg"><DifferenceDisplay value={item.difference} /></dd>
            </div>
          </div>

          {(item.lines ?? []).length > 0 ? (
            <div>
              <dt className="mb-2 text-muted-foreground">Batch lines</dt>
              <dd>
                <div className="overflow-x-auto rounded-lg border">
                  <Table enterprise className="min-w-[40rem]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch code</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">System</TableHead>
                        <TableHead className="text-right">Counted</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        {isOwner ? <TableHead className="text-right">Cost</TableHead> : null}
                        <TableHead className="text-right">Selling</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(item.lines ?? []).map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-xs">
                            {line.batchCode ?? line.productBatchId.slice(0, 8)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDate(line.receivedDate)}
                          </TableCell>
                          <TableCell className="max-w-[8rem] truncate text-xs">
                            {line.supplierName ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{line.systemQuantity}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {line.actualQuantity}
                          </TableCell>
                          <TableCell className="text-right">
                            <DifferenceDisplay value={line.difference} />
                          </TableCell>
                          {isOwner ? (
                            <TableCell className="text-right tabular-nums text-xs">
                              {formatCurrency(line.costPrice)}
                            </TableCell>
                          ) : null}
                          <TableCell className="text-right tabular-nums text-xs">
                            {formatCurrency(line.sellingPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </dd>
            </div>
          ) : null}

          <Row label="Reason" value={item.reason} />
          {item.notes && <Row label="Notes" value={item.notes} />}
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <AdjustmentStatusBadge status={item.status} label={item.statusLabel} />
            </dd>
          </div>
          <Row label="Requested by" value={`${item.requestedByName} · ${formatDate(item.requestedAt)}`} />
          {item.reviewedByName && (
            <Row
              label={item.status === AdjustmentRequestStatus.Rejected ? "Rejected by" : "Approved by"}
              value={`${item.reviewedByName}${item.reviewedAt ? ` · ${formatDate(item.reviewedAt)}` : ""}`}
            />
          )}
          {item.approvalNotes && <Row label="Approval notes" value={item.approvalNotes} />}
          {item.rejectionReason && <Row label="Rejection reason" value={item.rejectionReason} />}
          {isOwner && item.lineInventoryValue != null && (
            <Row label="Inventory value (cost × actual)" value={formatCurrency(item.lineInventoryValue)} />
          )}
        </dl>
        {item.status === AdjustmentRequestStatus.Pending && (
          <p className="text-xs text-amber-800">
            {isOwner
              ? `Submitted by ${item.requestedByName}. Approve from the list to update batch and product stock.`
              : "Stock is unchanged until an owner approves this request. The owner is notified in the sidebar."}
          </p>
        )}
        </DialogBody>
        <DialogFooter showCloseButton={false} className="shrink-0 border-t px-5 py-3 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
