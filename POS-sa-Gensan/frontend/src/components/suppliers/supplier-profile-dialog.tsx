"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Download, Pencil, Truck, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  SupplierCostHistoryEntry,
  SupplierDetail,
  SupplierListItem,
} from "@/lib/types";
import { SupplierStatus } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierStatusBadge } from "./supplier-status-badge";

type Props = {
  supplierId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: boolean;
  onEdit: (s: SupplierListItem) => void;
  onRefresh?: () => void;
};

export function SupplierProfileDialog({
  supplierId,
  open,
  onOpenChange,
  isOwner,
  onEdit,
  onRefresh,
}: Props) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [costHistory, setCostHistory] = useState<SupplierCostHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !supplierId) return;
    setLoading(true);
    Promise.all([
      api.get<SupplierDetail>(`/api/suppliers/${supplierId}`),
      api.get<SupplierCostHistoryEntry[]>(`/api/suppliers/${supplierId}/cost-history`).catch(() => []),
    ])
      .then(([d, h]) => {
        setDetail(d);
        setCostHistory(h);
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [open, supplierId]);

  const uploadFile = async (file: File) => {
    if (!supplierId) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.upload(`/api/suppliers/${supplierId}/attachments`, body);
      toast.success("Document uploaded");
      onRefresh?.();
      const d = await api.get<SupplierDetail>(`/api/suppliers/${supplierId}`);
      setDetail(d);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/30 text-muted-foreground">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
                  {detail?.name ?? "Supplier profile"}
                </DialogTitle>
                {detail ? (
                  <div className="mt-2">
                    <SupplierStatusBadge status={detail.status} label={detail.statusLabel} />
                  </div>
                ) : null}
              </div>
            </div>
            {detail ? (
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {isOwner ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(detail)}>
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                ) : null}
                <Link
                  href={`/stock-receiving?supplierId=${detail.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Truck className="mr-1.5 size-3.5" />
                  Receiving history
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadExport(`/api/suppliers/${detail.id}/report`, `supplier-${detail.name}.pdf`)
                  }
                >
                  <Download className="mr-1.5 size-3.5" />
                  PDF report
                </Button>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        {loading || !detail ? (
          <DialogBody className="flex items-center justify-center px-5 py-16">
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          </DialogBody>
        ) : (
          <>
            <div className="shrink-0 border-b bg-muted/15 px-5 py-4 sm:px-6">
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Row label="Payment terms" value={detail.paymentTermsLabel} />
                <Row label="Created" value={`${detail.createdByName} · ${formatDate(detail.createdAt)}`} />
                {detail.phone ? <Row label="Phone" value={detail.phone} /> : null}
                {detail.email ? <Row label="Email" value={detail.email} /> : null}
                {detail.address ? (
                  <Row label="Address" value={detail.address} className="sm:col-span-2 lg:col-span-3" />
                ) : null}
                {detail.notes ? (
                  <Row label="Notes" value={detail.notes} className="sm:col-span-2 lg:col-span-3" />
                ) : null}
              </dl>

              {isOwner ? (
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4">
                  <Metric label="Lifetime value" value={formatCurrency(detail.lifetimePurchaseValue ?? 0)} />
                  <Metric label="Approved RCVs" value={String(detail.approvedReceivingsCount)} />
                  <Metric label="Rejected" value={String(detail.rejectedReceivingsCount)} />
                  <Metric label="Reliability" value={detail.performance.reliabilityLabel} />
                </div>
              ) : null}

              {detail.contacts.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contacts
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.contacts.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground"> · {c.roleLabel ?? c.role}</span>
                        {c.phone ? <span> · {c.phone}</span> : null}
                        {c.isPrimary ? (
                          <span className="ml-1 text-xs text-primary">(primary)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Tabs defaultValue="products" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b bg-card px-5 pt-3 sm:px-6">
                <TabsList className="h-9 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="products">Supplied products</TabsTrigger>
                  <TabsTrigger value="receiving">Recent deliveries</TabsTrigger>
                  <TabsTrigger value="costs">Cost history</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="products"
                className="erp-dialog-body mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
              >
                <Table enterprise>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty received</TableHead>
                      {isOwner ? <TableHead className="text-right">Latest cost</TableHead> : null}
                      <TableHead>Last delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.suppliedProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell className="font-mono text-xs">{p.productSku}</TableCell>
                        <TableCell>{p.productName}</TableCell>
                        <TableCell className="text-right">{p.totalQuantityReceived}</TableCell>
                        {isOwner ? (
                          <TableCell className="text-right">
                            {formatCurrency(p.latestCost)}
                            {p.previousCost != null ? (
                              <span className="block text-xs text-muted-foreground">
                                was {formatCurrency(p.previousCost)}
                              </span>
                            ) : null}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-sm">
                          {p.lastDeliveryDate ? formatDate(p.lastDeliveryDate) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!detail.suppliedProducts.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={isOwner ? 5 : 4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No approved receivings yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent
                value="receiving"
                className="erp-dialog-body mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
              >
                <Table enterprise>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RCV #</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      {isOwner ? <TableHead className="text-right">Cost</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.recentReceivings.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/stock-receiving?search=${encodeURIComponent(r.receivingNumber)}`}
                            className="text-primary hover:underline"
                          >
                            {r.receivingNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(r.deliveryDate)}</TableCell>
                        <TableCell>{r.statusLabel}</TableCell>
                        <TableCell className="text-right">{r.totalQuantity}</TableCell>
                        {isOwner ? (
                          <TableCell className="text-right">
                            {r.totalCost != null ? formatCurrency(r.totalCost) : "—"}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                    {!detail.recentReceivings.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={isOwner ? 5 : 4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No deliveries yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent
                value="costs"
                className="erp-dialog-body mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
              >
                <p className="mb-3 text-xs text-muted-foreground">
                  Price changes from approved stock receivings (stainless/hardware cost tracking).
                </p>
                <Table enterprise>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Old</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead>RCV ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costHistory.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatDate(h.recordedAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{h.productSku}</TableCell>
                        <TableCell>{h.productName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(h.oldCost)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(h.newCost)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{h.receivingReference}</TableCell>
                      </TableRow>
                    ))}
                    {!costHistory.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No cost changes recorded yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent
                value="docs"
                className="erp-dialog-body mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
              >
                {isOwner && detail.status !== SupplierStatus.Archived ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      {uploading ? "Uploading…" : "Upload invoice / contract"}
                    </Button>
                  </>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {detail.attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded border bg-card px-3 py-2 text-sm"
                    >
                      <span>
                        {a.fileName}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {a.uploadedByName} · {formatDate(a.createdAt)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        onClick={() =>
                          downloadExport(`/api/suppliers/attachments/${a.id}`, a.fileName).catch(
                            () => {}
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {!detail.attachments.length ? (
                    <li className="py-8 text-center text-sm text-muted-foreground">
                      No documents uploaded
                    </li>
                  ) : null}
                </ul>
              </TabsContent>
            </Tabs>

            <div className="shrink-0 border-t bg-muted/25 px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
              <strong className="text-foreground">Delivery performance:</strong>{" "}
              {detail.performance.approvalRatePercent}% approval rate ·{" "}
              {detail.performance.partialDeliveryCount} partial deliveries ·{" "}
              {detail.performance.pendingCount} pending RCVs
              {detail.performance.rejectedCount > 0 ? (
                <> · {detail.performance.rejectedCount} rejected</>
              ) : null}
            </div>
          </>
        )}
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
      <dd className="mt-0.5 font-medium leading-snug">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
