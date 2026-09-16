"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, PackagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { api, ApiError, downloadExport } from "@/lib/api";

import type { StockReceiving } from "@/lib/types";
import { StockReceivingStatus } from "@/lib/types";
import {
  Dialog,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ReceivingStatusBadge } from "./receiving-status-badge";
import { ReceivingInventoryImpact } from "./receiving-inventory-impact";

export function ReceivingDetailDialog({
  item,
  open,
  onOpenChange,
  isOwner,
  onRefresh,
}: {
  item: StockReceiving | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: boolean;
  onRefresh?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!item) return null;

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.upload(`/api/stockreceiving/${item.id}/attachments`, body);
      toast.success("Attachment uploaded");
      onRefresh?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const printReport = async () => {
    await downloadExport(
      `/api/stockreceiving/${item.id}/report`,
      `RCV-${item.receivingNumber}.pdf`
    );
  };

  const isPending = item.status === StockReceivingStatus.Pending;
  const isApproved = item.status === StockReceivingStatus.Approved;
  const createdBatches = item.createdBatches ?? [];

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="workspace"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="font-mono text-base font-semibold sm:text-lg">
                  {item.receivingNumber}
                </DialogTitle>
                <ReceivingStatusBadge status={item.status} label={item.statusLabel} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.supplierName} · {formatDate(item.deliveryDate)}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={printReport}>
              <Download className="mr-1.5 size-3.5" />
              RCV report
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-4 sm:px-5 sm:py-4">
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-3 border-b border-border/60 pb-2 text-sm font-semibold">
              Delivery information
            </h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Row label="Supplier" value={item.supplierName} />
              {item.supplierPhone ? <Row label="Supplier phone" value={item.supplierPhone} /> : null}
              <Row label="Delivery date" value={formatDate(item.deliveryDate)} />
              <Row label="Container #" value={item.containerNumber} />
              <Row label="Stock #" value={item.stockNumber} />
              <Row label="Reference #" value={item.referenceNumber} />
              {item.deliveryReceiptNumber ? (
                <Row label="Delivery receipt #" value={item.deliveryReceiptNumber} />
              ) : null}
              {item.notes ? <Row label="Delivery notes" value={item.notes} className="sm:col-span-2 lg:col-span-3" /> : null}
            </dl>
            <p className="mt-3 text-xs">
              <Link
                href="/suppliers"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                View supplier record
                <ExternalLink className="size-3" />
              </Link>
            </p>
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-3 border-b border-border/60 pb-2 text-sm font-semibold">
              Audit trail
            </h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row
                label="Requested by"
                value={`${item.requestedByName} · ${formatDate(item.requestedAt)}`}
              />
              {item.reviewedByName ? (
                <Row
                  label={
                    item.status === StockReceivingStatus.Rejected ? "Rejected by" : "Approved by"
                  }
                  value={`${item.reviewedByName}${item.reviewedAt ? ` · ${formatDate(item.reviewedAt)}` : ""}`}
                />
              ) : null}
              {isOwner && item.totalCost > 0 ? (
                <Row label="Receiving value" value={formatCurrency(item.totalCost)} />
              ) : null}
              <Row label="Total quantity" value={`${item.totalQuantity} units`} />
              {item.approvalNotes ? (
                <Row label="Approval notes" value={item.approvalNotes} className="sm:col-span-2" />
              ) : null}
              {item.rejectionReason ? (
                <Row label="Rejection reason" value={item.rejectionReason} className="sm:col-span-2" />
              ) : null}
            </dl>
          </section>

          {isPending ? (
            <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <h3 className="mb-1 text-sm font-semibold text-amber-950 dark:text-amber-100">
                Inventory impact after approval
              </h3>
              <p className="mb-3 text-[11px] text-amber-900/90 dark:text-amber-100/80">
                {isOwner
                  ? "Review current stock levels before approving this receiving request."
                  : "Inventory remains unchanged until an owner approves this request."}
              </p>
              <ReceivingInventoryImpact items={item.items} showCosts={isOwner} />
            </section>
          ) : null}

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-3 border-b border-border/60 pb-2 text-sm font-semibold">
              Delivered products
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table enterprise>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    {isOwner ? (
                      <>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Line total</TableHead>
                      </>
                    ) : null}
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.items.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-xs">{line.productSku}</TableCell>
                      <TableCell>{line.productName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.quantity} {line.unitOfMeasure}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {line.expectedQuantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {line.remainingQuantity ?? "—"}
                      </TableCell>
                      {isOwner ? (
                        <>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.costPrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(line.lineTotal)}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="text-xs text-muted-foreground">
                        {line.remarks ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {isOwner && item.totalCost > 0 ? (
              <p className="mt-2 text-right text-sm font-semibold tabular-nums">
                Total receiving value: {formatCurrency(item.totalCost)}
              </p>
            ) : null}
          </section>

          {isApproved && createdBatches.length > 0 ? (
            <section className="rounded-xl border border-green-200/80 bg-green-50/40 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/20">
              <h3 className="mb-1 text-sm font-semibold text-green-950 dark:text-green-100">
                Inventory batches created
              </h3>
              <p className="mb-3 text-xs text-green-900/90 dark:text-green-100/80">
                {createdBatches.length} batch{createdBatches.length === 1 ? "" : "es"} were
                generated automatically from this approval — one per line item.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
                <Table enterprise>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch code</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      {isOwner ? <TableHead className="text-right">Cost</TableHead> : null}
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-xs">{batch.batchCode ?? "—"}</TableCell>
                        <TableCell className="max-w-[12rem] truncate text-sm">
                          {batch.productName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {batch.receivedQuantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {batch.remainingQuantity}
                        </TableCell>
                        {isOwner ? (
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(batch.costPrice)}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(batch.sellingPrice)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateOnly(batch.receivedDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.status === "Active" ? "default" : "secondary"}>
                            {batch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-sm font-semibold">Attachments</h3>
              {isPending ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAttachment(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-1.5 size-3.5" />
                    {uploading ? "Uploading…" : "Upload document"}
                  </Button>
                </>
              ) : null}
            </div>
            {item.attachments.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {item.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded border px-3 py-2"
                  >
                    <span>
                      {a.fileName}
                      {a.description ? ` — ${a.description}` : ""}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {a.uploadedByName} · {formatDate(a.createdAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex")}
                      onClick={() =>
                        downloadExport(
                          `/api/stockreceiving/attachments/${a.id}`,
                          a.fileName
                        ).catch(() => {})
                      }
                    >
                      <Download className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No attachments</p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
