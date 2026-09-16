"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { formatDate } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type {
  InventoryAdjustmentRequest,
  InventoryAdjustmentSummary,
  Paged,
  Product,
  UserManagement,
} from "@/lib/types";
import { AdjustmentRequestStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/enterprise/kpi-grid";
import { FilterBar, FilterField } from "@/components/enterprise/filter-bar";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { AdjustmentRequestDialog } from "@/components/adjustments/adjustment-request-dialog";
import { AdjustmentDetailDialog } from "@/components/adjustments/adjustment-detail-dialog";
import { AdjustmentStatusBadge } from "@/components/adjustments/adjustment-status-badge";
import { DifferenceDisplay } from "@/components/adjustments/difference-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 50;

export default function AdjustmentsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const searchParams = useSearchParams();

  const [list, setList] = useState<InventoryAdjustmentRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<InventoryAdjustmentSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserManagement[]>([]);

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [productFilter, setProductFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [range, setRange] = useState(defaultReportRange(90));

  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryAdjustmentRequest | null>(null);
  const [approveItem, setApproveItem] = useState<InventoryAdjustmentRequest | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectItem, setRejectItem] = useState<InventoryAdjustmentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (productFilter) params.set("productId", productFilter);
    if (requesterFilter && isOwner) params.set("requestedByUserId", requesterFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    return params;
  }, [page, statusFilter, productFilter, requesterFilter, debouncedSearch, range, isOwner]);

  const load = useCallback(async () => {
    try {
      const [paged, sum] = await Promise.all([
        api.get<Paged<InventoryAdjustmentRequest>>(`/api/inventory-adjustments?${buildParams()}`),
        api.get<InventoryAdjustmentSummary>("/api/inventory-adjustments/summary"),
      ]);
      setList(paged.items);
      setTotalPages(paged.totalPages);
      setSummary(sum);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load adjustments");
    }
  }, [buildParams]);

  useDebouncedEffect(() => {
    setDebouncedSearch(search);
  }, [search], 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, productFilter, requesterFilter, range]);

  useDebouncedEffect(() => {
    void load();
  }, [load, page], 250);

  useEffect(() => {
    api
      .get<ListResponse<Product>>("/api/products?activeOnly=true")
      .then((data) => setProducts(asList(data)))
      .catch(() => {});
    if (isOwner) {
      cachedGet(ReferenceKeys.users, REFERENCE_TTL_MS, () =>
        api.get<UserManagement[]>("/api/users")
      ).then(setUsers).catch(() => {});
    }
  }, [isOwner]);

  const approve = async () => {
    if (!approveItem) return;
    try {
      await api.post(`/api/inventory-adjustments/${approveItem.id}/approve`, {
        approvalNotes: approvalNotes.trim() || null,
      });
      toast.success("Approved — stock updated with movement & audit log");
      setApproveItem(null);
      setApprovalNotes("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Approve failed");
    }
  };

  const reject = async () => {
    if (!rejectItem || !rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      await api.post(`/api/inventory-adjustments/${rejectItem.id}/reject`, {
        rejectionReason: rejectReason.trim(),
      });
      toast.success("Request rejected — stock unchanged");
      setRejectItem(null);
      setRejectReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reject failed");
    }
  };

  const exportList = async (format: "excel" | "pdf") => {
    const params = buildParams();
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(
        `/api/inventory-adjustments/export?${params}`,
        `inventory-adjustments.${ext}`
      );
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory adjustments"
        description={
          isOwner
            ? "Review physical counts — approve to post stock changes with full audit trail"
            : "Submit count corrections — inventory does not change until owner approval"
        }
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New adjustment request
          </Button>
        }
      />

      <KpiGrid>
        <StatCard
          title="Pending"
          value={String(summary?.pendingCount ?? "—")}
          icon={ClipboardList}
          subtitle={
            summary?.netUnitsPendingAdjustment
              ? `Net ${summary.netUnitsPendingAdjustment >= 0 ? "+" : ""}${summary.netUnitsPendingAdjustment} units if approved`
              : undefined
          }
        />
        {isOwner && (
          <>
            <StatCard title="Approved" value={String(summary?.approvedCount ?? "—")} icon={Check} />
            <StatCard title="Rejected" value={String(summary?.rejectedCount ?? "—")} icon={X} />
          </>
        )}
      </KpiGrid>

      <Card className="mb-4 shadow-erp overflow-hidden">
        <FilterBar
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => exportList("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportList("pdf")}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </>
          }
        >
          <FilterField className="xl:col-span-4">
            <Label className="text-xs">Status</Label>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="flex-wrap h-auto w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="0">Pending</TabsTrigger>
                <TabsTrigger value="1">Approved</TabsTrigger>
                <TabsTrigger value="2">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </FilterField>
          <FilterField>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </FilterField>
          <FilterField>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </FilterField>
          <FilterField>
            <Label className="text-xs">Product</Label>
            <Select value={productFilter || "all"} onValueChange={(v) => setProductFilter(v === "all" ? "" : (v ?? ""))}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.sku}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          {isOwner && (
            <FilterField>
              <Label className="text-xs">Requester</Label>
              <Select value={requesterFilter || "all"} onValueChange={(v) => setRequesterFilter(v === "all" ? "" : (v ?? ""))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          )}
          <FilterField span={2}>
            <Label className="text-xs">Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU, product, reason…"
            />
          </FilterField>
        </FilterBar>
      </Card>

      <TableShell>
        <ResponsiveDataView
          mobile={
            list.length === 0 ? (
              <EmptyState compact title="No adjustments" />
            ) : (
              list.map((a) => (
                <RecordMobileCard
                  key={a.id}
                  title={a.productName}
                  subtitle={`${a.productSku} · ${a.adjustmentTypeLabel}`}
                  meta={
                    <>
                      <DifferenceDisplay value={a.difference} /> · {a.requestedByName}
                    </>
                  }
                  badge={<AdjustmentStatusBadge status={a.status} label={a.statusLabel} />}
                  onOpen={() => setDetailItem(a)}
                  onAction={
                    isOwner && a.status === AdjustmentRequestStatus.Pending
                      ? () => setApproveItem(a)
                      : () => setDetailItem(a)
                  }
                  actionLabel={
                    isOwner && a.status === AdjustmentRequestStatus.Pending
                      ? "Review / approve"
                      : "View details"
                  }
                />
              ))
            )
          }
        >
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead sticky>Product / SKU</TableHead>
              <TableHead hideBelow="md">Type</TableHead>
              <TableHead hideBelow="lg" className="text-right">Before</TableHead>
              <TableHead hideBelow="lg" className="text-right">Actual</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead hideBelow="xl">Reason</TableHead>
              <TableHead hideBelow="lg">Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => (
              <TableRow key={a.id} onRowClick={() => setDetailItem(a)}>
                <TableCell sticky>
                  <div className="font-medium">{a.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{a.productSku}</div>
                </TableCell>
                <TableCell hideBelow="md" className="text-sm">{a.adjustmentTypeLabel}</TableCell>
                <TableCell hideBelow="lg" className="text-right tabular-nums">{a.systemQuantity}</TableCell>
                <TableCell hideBelow="lg" className="text-right tabular-nums font-medium">{a.actualQuantity}</TableCell>
                <TableCell className="text-right">
                  <DifferenceDisplay value={a.difference} />
                </TableCell>
                <TableCell hideBelow="xl" className="max-w-[140px] truncate text-sm" title={a.reason}>
                  {a.reason}
                </TableCell>
                <TableCell hideBelow="lg" className="text-sm">
                  <div>{a.requestedByName}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(a.requestedAt)}</div>
                </TableCell>
                <TableCell>
                  <AdjustmentStatusBadge status={a.status} label={a.statusLabel} />
                </TableCell>
                <TableRowActions>
                  {isOwner && a.status === AdjustmentRequestStatus.Pending && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => { setApproveItem(a); setApprovalNotes(""); }}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectItem(a)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableRowActions>
              </TableRow>
            ))}
            {!list.length && (
              <TableEmptyRow colSpan={9} title="No adjustment requests match filters" />
            )}
          </TableBody>
        </Table>
        </ResponsiveDataView>
      </TableShell>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <AdjustmentRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={products}
        isOwner={isOwner}
        onSubmitted={load}
      />

      <AdjustmentDetailDialog
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(o) => !o && setDetailItem(null)}
        isOwner={isOwner}
      />

      <Dialog open={!!approveItem} onOpenChange={(o) => !o && setApproveItem(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Approve adjustment</DialogTitle>
          </DialogHeader>
          {approveItem && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>{approveItem.productName}</strong> ({approveItem.productSku})
              </p>
              <p>
                Stock will change from <strong>{approveItem.systemQuantity}</strong> to{" "}
                <strong>{approveItem.actualQuantity}</strong> (
                <DifferenceDisplay value={approveItem.difference} />).
              </p>
              <p className="text-muted-foreground">
                An inventory movement (ADJUSTMENT) and audit log will be created.
              </p>
              <div className="space-y-1">
                <Label>Approval notes (optional)</Label>
                <Input value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveItem(null)}>Cancel</Button>
            <Button onClick={approve}>Approve & update stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectItem} onOpenChange={(o) => !o && setRejectItem(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reject adjustment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Stock remains unchanged. Rejection is recorded in the audit log.
          </p>
          <div className="space-y-1 py-2">
            <Label>Rejection reason *</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
