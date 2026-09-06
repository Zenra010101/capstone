"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalRequestType,
  Paged,
} from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";

const TYPE_FILTERS: { value: "all" | ApprovalRequestType; label: string }[] = [
  { value: "all", label: "All types" },
  { value: 0, label: "Returns / Exchanges" },
  { value: 1, label: "Sale Void" },
  { value: 2, label: "Sale Correction" },
];

type SaleCorrectionPayload = {
  saleId?: string;
  reason?: string;
  incorrectItem?: string;
  correctItem?: string;
  sale?: {
    paymentMethod?: number;
    amountPaid?: number;
    dueDate?: string;
    customerName?: string;
    items?: Array<{
      productId?: string;
      quantity?: number;
      discount?: number;
    }>;
  };
};

function parsePayload(request: ApprovalRequest): unknown {
  if (!request.payloadJson) return null;
  try {
    return JSON.parse(request.payloadJson);
  } catch {
    return null;
  }
}

function paymentMethodLabel(method?: number): string {
  if (method === 0) return "Cash";
  if (method === 1) return "QRPH";
  if (method === 2) return "Online Bank";
  if (method === 3) return "Charge";
  if (method === 4) return "Cheque";
  return "Unknown";
}

export default function ApprovalsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");

  const [rows, setRows] = useState<ApprovalRequest[]>([]);
  const [status, setStatus] = useState<ApprovalRequestStatus>(0);
  const [typeFilter, setTypeFilter] = useState<"all" | ApprovalRequestType>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);

  const [approveTarget, setApproveTarget] = useState<ApprovalRequest | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<ApprovalRequest | null>(null);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerOptions, setOwnerOptions] = useState<{ id: string; fullName: string; email: string }[]>([]);

  const load = useCallback(async () => {
    if (!isOwner) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", String(status));
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (typeFilter !== "all") params.set("type", String(typeFilter));
      const data = await api.get<Paged<ApprovalRequest>>(`/api/approvals?${params}`);
      setRows(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
      setPage(data.page ?? page);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load approvals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isOwner, page, pageSize, status, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [status, typeFilter, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isOwner) return;
    api
      .get<{ id: string; fullName: string; email: string }[]>("/api/approvals/owners")
      .then((data) => setOwnerOptions(data ?? []))
      .catch(() => {});
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div>
        <PageHeader title="Approval Center" description="Owner access required." />
        <EmptyState title="Not authorized" description="Only owner can access this page." />
      </div>
    );
  }

  const approve = async () => {
    if (!approveTarget) return;
    try {
      await api.post(`/api/approvals/${approveTarget.id}/approve`, {
        notes: approveNotes.trim() || undefined,
        deviceName: navigator.userAgent,
      });
      toast.success("Request approved");
      setApproveTarget(null);
      setApproveNotes("");
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approval failed");
    }
  };

  const reject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await api.post(`/api/approvals/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim(),
        deviceName: navigator.userAgent,
      });
      toast.success("Request rejected");
      setRejectTarget(null);
      setRejectReason("");
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reject failed");
    }
  };

  const approveViaOverride = async () => {
    if (!overrideTarget || !ownerUsername.trim() || !ownerPassword) return;
    try {
      await api.post(`/api/approvals/${overrideTarget.id}/approve-override`, {
        ownerUsername: ownerUsername.trim(),
        ownerPassword,
        notes: "Approved via immediate owner override",
        deviceName: navigator.userAgent,
      });
      toast.success("Approved via owner override");
      setOverrideTarget(null);
      setOwnerUsername("");
      setOwnerPassword("");
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Owner override failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Approval Center"
        description="Owner approval queue for returns, exchanges, voids, and post-sale corrections."
      />

      <Card className="mb-4 shadow-erp">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Tabs value={String(status)} onValueChange={(v) => setStatus(Number(v) as ApprovalRequestStatus)}>
              <TabsList>
                <TabsTrigger value="0">Pending</TabsTrigger>
                <TabsTrigger value="1">Approved</TabsTrigger>
                <TabsTrigger value="2">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-1">
            <Label>Request type</Label>
            <Select
              value={typeFilter === "all" ? "all" : String(typeFilter)}
              onValueChange={(v) => setTypeFilter(v === "all" ? "all" : (Number(v) as ApprovalRequestType))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((f) => (
                  <SelectItem key={String(f.value)} value={String(f.value)}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Requested by</TableHead>
            <TableHead>Requested at</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} onRowClick={() => setSelected(r)}>
              <TableCell>{r.typeLabel}</TableCell>
              <TableCell className="max-w-[18rem] truncate" title={r.reason}>{r.title}</TableCell>
              <TableCell>{r.requestedByName}</TableCell>
              <TableCell>{formatDate(r.requestedAt)}</TableCell>
              <TableCell>{r.statusLabel}</TableCell>
              <TableCell className="font-mono text-xs">
                {r.resultEntityType && r.resultEntityId ? `${r.resultEntityType}:${r.resultEntityId}` : "—"}
              </TableCell>
              <TableCell className="text-right">
                {r.status === 0 ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setApproveTarget(r);
                        setApproveNotes("");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejectTarget(r);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverrideTarget(r);
                        setOwnerUsername("");
                        setOwnerPassword("");
                      }}
                    >
                      Immediate override
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(r);
                    }}
                  >
                    View
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!loading && !rows.length && (
            <TableEmptyRow colSpan={7} title="No approval requests in this view" />
          )}
        </TableBody>
      </Table>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemLabel="requests"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        className="mt-4 rounded-lg border bg-card"
      />

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Approve request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Approval notes (optional)</Label>
            <Input
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="Notes for audit trail"
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={approve}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Approval request details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Type:</span> {selected.typeLabel}</p>
              <p><span className="text-muted-foreground">Status:</span> {selected.statusLabel}</p>
              <p><span className="text-muted-foreground">Requested by:</span> {selected.requestedByName}</p>
              <p><span className="text-muted-foreground">Requested at:</span> {formatDate(selected.requestedAt)}</p>
              <p><span className="text-muted-foreground">Reason:</span> {selected.reason}</p>
              {selected.approvedByName && (
                <p><span className="text-muted-foreground">Approved by:</span> {selected.approvedByName} ({selected.approvedAt ? formatDate(selected.approvedAt) : "—"})</p>
              )}
              {selected.rejectedByName && (
                <p><span className="text-muted-foreground">Rejected by:</span> {selected.rejectedByName} ({selected.rejectedAt ? formatDate(selected.rejectedAt) : "—"})</p>
              )}
              {selected.approvalNotes && (
                <p><span className="text-muted-foreground">Approval notes:</span> {selected.approvalNotes}</p>
              )}
              {selected.rejectionReason && (
                <p><span className="text-muted-foreground">Rejection reason:</span> {selected.rejectionReason}</p>
              )}
              {(() => {
                const payload = parsePayload(selected);
                if (!payload) return null;

                if (selected.type === 1) {
                  const p = payload as { saleId?: string; reason?: string };
                  return (
                    <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                      <p className="font-medium">Void details</p>
                      <p>Sale ID: <span className="font-mono text-xs">{p.saleId ?? "—"}</span></p>
                      <p>Reason: {p.reason ?? "—"}</p>
                    </div>
                  );
                }

                if (selected.type === 0) {
                  const p = payload as {
                    originalSaleId?: string;
                    reason?: string;
                    items?: Array<{ saleItemId?: string; quantity?: number }>;
                    replacementItems?: Array<{ productId?: string; quantity?: number }>;
                  };
                  return (
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                      <p className="font-medium">Return / exchange details</p>
                      <p>Original sale ID: <span className="font-mono text-xs">{p.originalSaleId ?? "—"}</span></p>
                      <p>Reason: {p.reason ?? "—"}</p>
                      <p>Returned lines: {p.items?.length ?? 0}</p>
                      <p>Replacement lines: {p.replacementItems?.length ?? 0}</p>
                    </div>
                  );
                }

                if (selected.type === 2) {
                  const p = payload as SaleCorrectionPayload;
                  return (
                    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                      <p className="font-medium">Correction details</p>
                      <p>Source sale ID: <span className="font-mono text-xs">{p.saleId ?? "—"}</span></p>
                      {p.incorrectItem && <p>Incorrect entry: {p.incorrectItem}</p>}
                      {p.correctItem && <p>Correct entry: {p.correctItem}</p>}
                      {p.reason && <p>Correction reason: {p.reason}</p>}
                      <p>
                        Payment method: {paymentMethodLabel(p.sale?.paymentMethod)} · Amount paid:{" "}
                        {formatCurrency(p.sale?.amountPaid ?? 0)}
                      </p>
                      {p.sale?.dueDate && <p>Due date: {formatDate(p.sale.dueDate)}</p>}
                      {p.sale?.customerName && <p>Customer: {p.sale.customerName}</p>}
                      <div>
                        <p className="mb-1 text-muted-foreground">Corrected lines</p>
                        <ul className="space-y-1 text-xs">
                          {(p.sale?.items ?? []).map((line, idx) => (
                            <li key={`${line.productId ?? "missing"}-${idx}`} className="rounded border bg-background px-2 py-1">
                              Product {line.productId ?? "—"} · Qty {line.quantity ?? 0} · Discount {formatCurrency(line.discount ?? 0)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                }

                return (
                  <details className="rounded-lg border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-sm font-medium">Raw request payload</summary>
                    <pre className="mt-2 max-h-[220px] overflow-auto rounded border bg-background p-2 text-xs">
                      {selected.payloadJson}
                    </pre>
                  </details>
                );
              })()}
            </div>
          )}
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (required)</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideTarget} onOpenChange={(open) => !open && setOverrideTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Immediate owner override</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerUsername} onValueChange={(v) => setOwnerUsername(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((o) => (
                  <SelectItem key={o.id} value={o.email}>
                    {o.fullName} ({o.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Owner password</Label>
            <Input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <Button onClick={approveViaOverride} disabled={!ownerUsername.trim() || !ownerPassword}>
              Approve now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
