"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Package,
  Plus,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { formatCurrency, formatDate } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type {
  Paged,
  Product,
  StockReceiving,
  StockReceivingSummary,
  Supplier,
  UserManagement,
} from "@/lib/types";
import { StockReceivingStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { StatCard } from "@/components/stat-card";
import { ReceivingRequestDialog } from "@/components/receiving/receiving-request-dialog";
import { ReceivingDetailDialog } from "@/components/receiving/receiving-detail-dialog";
import { ReceivingInventoryImpact } from "@/components/receiving/receiving-inventory-impact";
import { ReceivingStatusBadge } from "@/components/receiving/receiving-status-badge";
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

export default function StockReceivingPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const searchParams = useSearchParams();

  const [list, setList] = useState<StockReceiving[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<StockReceivingSummary | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserManagement[]>([]);

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [range, setRange] = useState(defaultReportRange(90));

  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<StockReceiving | null>(null);
  const [approveItem, setApproveItem] = useState<StockReceiving | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectItem, setRejectItem] = useState<StockReceiving | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (supplierFilter) params.set("supplierId", supplierFilter);
    if (requesterFilter && isOwner) params.set("requestedByUserId", requesterFilter);
    if (referenceFilter.trim()) params.set("referenceNumber", referenceFilter.trim());
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    return params;
  }, [page, statusFilter, supplierFilter, requesterFilter, referenceFilter, debouncedSearch, range, isOwner]);

  const load = useCallback(async () => {
    try {
      const [paged, sum] = await Promise.all([
        api.get<Paged<StockReceiving>>(`/api/stockreceiving?${buildParams()}`),
        api.get<StockReceivingSummary>("/api/stockreceiving/summary"),
      ]);
      setList(paged.items);
      setTotalPages(paged.totalPages);
      setTotalCount(paged.totalCount);
      setSummary(sum);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load receiving");
    }
  }, [buildParams]);

  useDebouncedEffect(() => {
    setDebouncedSearch(search);
  }, [search], 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, supplierFilter, requesterFilter, referenceFilter, range]);

  useDebouncedEffect(() => {
    void load();
  }, [load, page], 250);

  useEffect(() => {
    const supplierId = searchParams.get("supplierId");
    const create = searchParams.get("create");
    if (supplierId) setSupplierFilter(supplierId);
    if (searchParams.get("search")) setSearch(searchParams.get("search") ?? "");
    if (create === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    api
      .get<ListResponse<Supplier>>("/api/suppliers?activeOnly=true")
      .then((data) => setSuppliers(asList(data)))
      .catch(() => {});
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

  const openDetail = async (id: string) => {
    try {
      const item = await api.get<StockReceiving>(`/api/stockreceiving/${id}`);
      setDetailItem(item);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load details");
    }
  };

  const approve = async () => {
    if (!approveItem) return;
    try {
      const result = await api.post<StockReceiving>(
        `/api/stockreceiving/${approveItem.id}/approve`,
        { approvalNotes: approvalNotes.trim() || null }
      );
      const batchCount =
        result.batchesCreatedCount ?? result.createdBatches?.length ?? 0;
      toast.success(
        batchCount > 0
          ? `Receiving approved. ${batchCount} inventory batch${batchCount === 1 ? "" : "es"} created.`
          : "Receiving approved — inventory updated"
      );
      setApproveItem(null);
      setApprovalNotes("");
      if (detailItem?.id === result.id) setDetailItem(result);
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
      await api.post(`/api/stockreceiving/${rejectItem.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success("Receiving rejected — inventory unchanged");
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
      await downloadExport(`/api/stockreceiving/export?${params}`, `stock-receiving.${ext}`);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock receiving"
        description={
          isOwner
            ? "Controlled inventory intake — approve deliveries before stock updates"
            : "Encode incoming deliveries — inventory does not change until owner approval"
        }
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New receiving request
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Pending receiving"
          value={String(summary?.pendingCount ?? "—")}
          icon={ClipboardList}
          subtitle={
            summary?.totalIncomingUnits
              ? `${summary.totalIncomingUnits} units awaiting approval`
              : undefined
          }
        />
        {isOwner ? (
          <>
            <StatCard
              title="Approved today"
              value={String(summary?.approvedTodayCount ?? "—")}
              icon={Check}
            />
            <StatCard
              title="Rejected requests"
              value={String(summary?.rejectedCount ?? "—")}
              icon={X}
            />
            <StatCard
              title="Total incoming stock"
              value={String(summary?.totalIncomingUnits ?? "—")}
              icon={Package}
              subtitle="Units on pending RCVs"
            />
            <StatCard
              title="Total receiving cost"
              value={
                summary?.totalReceivingCost != null
                  ? formatCurrency(summary.totalReceivingCost)
                  : "—"
              }
              icon={Truck}
              subtitle="Pending deliveries (cost x qty)"
            />
          </>
        ) : (
          <StatCard
            title="Your pending units"
            value={String(summary?.totalIncomingUnits ?? "—")}
            icon={Package}
          />
        )}
      </div>

      <Card className="mb-4 shadow-erp">
        <CardContent className="grid gap-4 pt-6 lg:grid-cols-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="lg:col-span-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="0">Pending</TabsTrigger>
              <TabsTrigger value="1">Approved</TabsTrigger>
              <TabsTrigger value="2">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1">
            <Label>From</Label>
            <Input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select
              value={supplierFilter || "all"}
              onValueChange={(v) => setSupplierFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference / DR #</Label>
            <Input
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              placeholder="Reference or delivery receipt"
            />
          </div>
          {isOwner && (
            <div className="space-y-1">
              <Label>Requester</Label>
              <Select
                value={requesterFilter || "all"}
                onValueChange={(v) => setRequesterFilter(v === "all" ? "" : (v ?? ""))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1 lg:col-span-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="RCV #, supplier, container, reference..."
            />
          </div>
        </CardContent>
        <div className="flex flex-wrap gap-2 border-t px-6 py-3">
          <Button variant="outline" size="sm" onClick={() => exportList("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportList("pdf")}>
            <FileText className="mr-2 h-4 w-4" /> PDF list
          </Button>
        </div>
      </Card>

      <TableShell>
        <ResponsiveDataView
          mobile={
            !list.length ? (
              <EmptyState compact title="No receiving records match your filters" />
            ) : (
              list.map((r) => (
                <RecordMobileCard
                  key={r.id}
                  title={r.receivingNumber}
                  subtitle={r.supplierName}
                  meta={`${formatDate(r.deliveryDate)} · ${r.requestedByName}`}
                  amount={r.totalQuantity.toString()}
                  badge={<ReceivingStatusBadge status={r.status} label={r.statusLabel} />}
                  onOpen={() => void openDetail(r.id)}
                  onAction={() => void openDetail(r.id)}
                  actionLabel={
                    isOwner && r.status === StockReceivingStatus.Pending
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
              <TableHead sticky>RCV #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead hideBelow="md">Delivery</TableHead>
              <TableHead hideBelow="xl">References</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              {isOwner && <TableHead hideBelow="lg" className="text-right">Cost</TableHead>}
              <TableHead hideBelow="lg">Requested by</TableHead>
              <TableHead>Status</TableHead>
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id} onRowClick={() => void openDetail(r.id)}>
                <TableCell sticky className="font-mono text-xs">{r.receivingNumber}</TableCell>
                <TableCell>{r.supplierName}</TableCell>
                <TableCell hideBelow="md" className="text-sm">{formatDate(r.deliveryDate)}</TableCell>
                <TableCell hideBelow="xl" className="max-w-[140px] truncate text-xs text-muted-foreground">
                  {r.containerNumber} · {r.referenceNumber}
                  {r.deliveryReceiptNumber ? ` · DR ${r.deliveryReceiptNumber}` : ""}
                </TableCell>
                <TableCell className="text-right">
                  {r.totalQuantity}
                  {r.remainingQuantity > 0 ? (
                    <span className="block text-xs text-amber-700">
                      +{r.remainingQuantity} pending
                    </span>
                  ) : null}
                </TableCell>
                {isOwner && (
                  <TableCell hideBelow="lg" className="text-right text-sm">
                    {r.totalCost > 0 ? formatCurrency(r.totalCost) : "—"}
                  </TableCell>
                )}
                <TableCell hideBelow="lg" className="text-sm">{r.requestedByName}</TableCell>
                <TableCell>
                  <ReceivingStatusBadge status={r.status} label={r.statusLabel} />
                </TableCell>
                {isOwner && (
                  <TableRowActions>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openDetail(r.id)}
                      >
                        View
                      </Button>
                      {r.status === StockReceivingStatus.Pending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setApproveItem(r);
                              setApprovalNotes("");
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectItem(r);
                              setRejectReason("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableRowActions>
                )}
              </TableRow>
            ))}
            {!list.length && (
              <TableEmptyRow colSpan={isOwner ? 9 : 7} title="No receiving records match your filters" />
            )}
          </TableBody>
        </Table>
        </ResponsiveDataView>
      </TableShell>

      {totalPages > 1 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          itemLabel="receiving records"
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          className="mt-4 rounded-lg border bg-card"
        />
      )}

      <ReceivingRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suppliers={suppliers}
        products={products}
        onSubmitted={load}
        initialSupplierId={searchParams.get("supplierId") ?? undefined}
        initialProductId={searchParams.get("productId") ?? undefined}
      />

      <ReceivingDetailDialog
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(v) => !v && setDetailItem(null)}
        isOwner={isOwner}
        onRefresh={async () => {
          if (detailItem) await openDetail(detailItem.id);
          load();
        }}
      />

      <Dialog dismissible open={!!approveItem} onOpenChange={() => setApproveItem(null)}>
        <DialogContent
          size="xl"
          scrollBody={false}
          className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5">
            <DialogTitle>Approve receiving request</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {approveItem?.receivingNumber} · {approveItem?.supplierName} ·{" "}
              {approveItem?.totalQuantity} units ·{" "}
              {approveItem ? formatCurrency(approveItem.totalCost) : ""}
            </p>
          </DialogHeader>
          <div className="erp-dialog-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
            <p className="text-sm text-muted-foreground">
              One inventory batch will be created for each line on this receipt (batch identity
              follows the receiving event, not price). Review projected stock levels below.
            </p>
            {approveItem ? (
              <ReceivingInventoryImpact items={approveItem.items} showCosts />
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs">Approval notes (optional)</Label>
              <Input
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Verified against DR, seal intact, etc."
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="shrink-0 border-t px-5 py-3">
            <Button variant="outline" onClick={() => setApproveItem(null)}>
              Cancel
            </Button>
            <Button onClick={approve}>Approve & update stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectItem} onOpenChange={() => setRejectItem(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reject receiving</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason (required)</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Quantity mismatch, wrong supplier, etc."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject}>
              Reject — no stock change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
