"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileDown,
  FileSpreadsheet,
  Plus,
  Printer,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { buildQuery } from "@/lib/query";
import { formatCurrency, formatCurrencyDeduction, formatDate } from "@/lib/format";
import type { GoodsReturnSlip, GoodsReturnSlipPaged, StoreSettings } from "@/lib/types";
import { GrsStatus, grsStatusDisplay } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { GRS_STORE_POLICY } from "@/lib/grs-policy";
import { PageHeader } from "@/components/page-header";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { NewReturnDialog } from "@/components/grs/new-return-dialog";
import { GrsReceiptDialog } from "@/components/grs/grs-receipt-dialog";
import { ExchangeReceiptDialog } from "@/components/grs/exchange-receipt-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function canVoidGrs(g: GoodsReturnSlip, isOwner: boolean): boolean {
  return isOwner && g.status === GrsStatus.Completed;
}

export default function ReturnsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [list, setList] = useState<GoodsReturnSlip[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customer, setCustomer] = useState("");
  const [invoice, setInvoice] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [newOpen, setNewOpen] = useState(false);
  const [receiptGrs, setReceiptGrs] = useState<GoodsReturnSlip | null>(null);
  const [exchangeReceiptGrs, setExchangeReceiptGrs] = useState<GoodsReturnSlip | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [detail, setDetail] = useState<GoodsReturnSlip | null>(null);
  const [voidTarget, setVoidTarget] = useState<GoodsReturnSlip | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const load = useCallback(
    async (pageNum = page) => {
      try {
        const qs = buildQuery({
          page: pageNum,
          pageSize,
          from: from || undefined,
          to: to || undefined,
          customer: customer || undefined,
          invoice: invoice || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        const res = await api.get<GoodsReturnSlipPaged>(`/api/goods-return-slips?${qs}`);
        setList(res.items);
        setTotalPages(res.totalPages);
        setPage(res.page);
        setPageSize((res.pageSize as TablePageSize) ?? pageSize);
        setTotalCount(res.totalCount);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not load returns");
        setList([]);
      }
    },
    [page, pageSize, from, to, customer, invoice, statusFilter]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    api.get<StoreSettings>("/api/settings").then(setStoreSettings).catch(() => {});
  }, []);

  const openDetail = async (id: string) => {
    try {
      const grs = await api.get<GoodsReturnSlip>(`/api/goods-return-slips/${id}`);
      setDetail(grs);
    } catch {
      toast.error("Could not load GRS details");
    }
  };

  const printGrs = async (id: string) => {
    try {
      const grs = await api.get<GoodsReturnSlip>(`/api/goods-return-slips/${id}`);
      setReceiptGrs(grs);
    } catch {
      toast.error("Could not load GRS for printing");
    }
  };

  const voidGrs = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    try {
      await api.post(`/api/goods-return-slips/${voidTarget.id}/void`, {
        reason: voidReason.trim(),
      });
      toast.success("GRS voided — stock and sales movements reversed where applicable");
      setVoidTarget(null);
      setVoidReason("");
      setDetail(null);
      load(page);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Void failed");
    }
  };

  const exportList = async (format: "excel" | "pdf") => {
    const qs = buildQuery({
      page: 1,
      pageSize: 5000,
      from: from || undefined,
      to: to || undefined,
      customer: customer || undefined,
      invoice: invoice || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      format,
    });
    await downloadExport(`/api/goods-return-slips/export?${qs}`, `grs-list.${format === "pdf" ? "pdf" : "xlsx"}`);
  };

  const onCreated = (grs?: GoodsReturnSlip) => {
    if (grs?.exchange) setExchangeReceiptGrs(grs);
    else if (grs) setReceiptGrs(grs);
    load(1);
  };

  return (
    <>
      <div
        className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        role="status"
      >
        {isOwner ? (
          <>
            <strong className="font-medium">Owner override available.</strong> Owner can complete
            returns/exchanges immediately when validation passes. No cash refunds.
          </>
        ) : (
          <>
            <strong className="font-medium">Owner approval required.</strong> Cashier submits
            return/exchange requests for owner authorization before final stock and sales effects.
          </>
        )}
      </div>

      <PageHeader
        title="Goods Return Slip (GRS)"
        description={GRS_STORE_POLICY.pageDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportList("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void exportList("pdf")}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF list
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New return
            </Button>
          </div>
        }
      />

      <Card className="mb-4 p-4 shadow-erp">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Customer</Label>
            <Input
              placeholder="Name"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice #</Label>
            <Input
              placeholder="S2026..."
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="0">Completed</SelectItem>
                <SelectItem value="2">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage(1);
              void load(1);
            }}
          >
            Apply filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setCustomer("");
              setInvoice("");
              setStatusFilter("all");
              setPage(1);
            }}
          >
            Clear
          </Button>
        </div>
      </Card>

      <TableShell>
        <ResponsiveDataView
          mobile={
            !list.length ? (
              <EmptyState
                compact
                title="No returns found"
                description="Use New return for operational returns (wrong item, size, or specification)."
              />
            ) : (
              list.map((g) => {
                const st = grsStatusDisplay(g.status, g.statusLabel);
                return (
                  <RecordMobileCard
                    key={g.id}
                    title={g.grsNumber}
                    subtitle={`${g.originalSaleNumber}${g.customerName ? ` · ${g.customerName}` : ""}`}
                    amount={formatCurrencyDeduction(g.totalReturnAmount)}
                    amountTone="negative"
                    badge={
                      <Badge variant={st?.variant ?? "secondary"} className="text-[10px]">
                        {st?.label ?? "—"}
                      </Badge>
                    }
                    onOpen={() => void openDetail(g.id)}
                    meta={
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void printGrs(g.id)}
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Print
                        </Button>
                        {canVoidGrs(g, isOwner) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              setVoidTarget(g);
                              setVoidReason("");
                            }}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            Void
                          </Button>
                        )}
                      </div>
                    }
                  />
                );
              })
            )
          }
        >
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead sticky>GRS #</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead hideBelow="lg">Customer</TableHead>
              <TableHead hideBelow="md" className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
                  <TableHead hideBelow="xl">Return type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead hideBelow="xl">Processed by</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((g) => {
              const st = grsStatusDisplay(g.status, g.statusLabel);
              return (
                <TableRow key={g.id} onRowClick={() => void openDetail(g.id)}>
                  <TableCell sticky className="font-mono text-xs">{g.grsNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{g.originalSaleNumber}</TableCell>
                  <TableCell hideBelow="lg" className="max-w-[8rem] truncate text-sm">
                    {g.customerName || "—"}
                  </TableCell>
                  <TableCell hideBelow="md" className="text-right">{g.totalQuantity ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-amount-negative">
                    {formatCurrencyDeduction(g.totalReturnAmount)}
                  </TableCell>
                  <TableCell hideBelow="xl">
                    <Badge variant="outline" className="text-xs">
                      Operational
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={st?.variant ?? "secondary"}>{st?.label ?? "—"}</Badge>
                  </TableCell>
                  <TableCell hideBelow="xl" className="text-sm">{g.processedByName}</TableCell>
                  <TableRowActions>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Print GRS"
                      aria-label={`Print GRS ${g.grsNumber}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void printGrs(g.id);
                      }}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canVoidGrs(g, isOwner) && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Void GRS"
                        aria-label={`Void GRS ${g.grsNumber}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setVoidTarget(g);
                          setVoidReason("");
                        }}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </TableRowActions>
                </TableRow>
              );
            })}
            {!list.length && (
              <TableEmptyRow
                colSpan={9}
                title="No returns found"
                description="Use New return for operational returns (wrong item, size, or specification)."
              />
            )}
          </TableBody>
        </Table>
        </ResponsiveDataView>
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          itemLabel="returns"
          onPageChange={(nextPage) => void load(nextPage)}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          className="rounded-none border-0 border-t"
        />
      </TableShell>

      <NewReturnDialog open={newOpen} onOpenChange={setNewOpen} onCreated={onCreated} />

      <GrsReceiptDialog
        open={!!receiptGrs}
        onOpenChange={(o) => !o && setReceiptGrs(null)}
        grs={receiptGrs}
      />

      <ExchangeReceiptDialog
        open={!!exchangeReceiptGrs}
        onOpenChange={(o) => !o && setExchangeReceiptGrs(null)}
        grs={exchangeReceiptGrs}
        storeSettings={storeSettings}
      />

      <Dialog open={!!detail} dismissible onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent size="xl" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
            <DialogTitle>GRS {detail?.grsNumber}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="erp-dialog-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 text-sm sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    grsStatusDisplay(detail.status, detail.statusLabel).variant
                  }
                >
                  {grsStatusDisplay(detail.status, detail.statusLabel).label}
                </Badge>
                {detail.exchange && (
                  <Badge variant="outline">{detail.exchange.exchangeNumber}</Badge>
                )}
                <Badge variant="outline">{GRS_STORE_POLICY.acknowledgmentShort}</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Original sale
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Invoice</dt>
                      <dd className="font-mono text-xs">{detail.originalSaleNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Created by</dt>
                      <dd className="font-medium">{detail.originalSaleCashierName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Sale date</dt>
                      <dd>{formatDate(detail.originalSaleDate)}</dd>
                    </div>
                    {detail.customerName ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Customer</dt>
                        <dd className="font-medium">{detail.customerName}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {detail.exchange ? "Return / exchange" : "Return"}
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Processed by</dt>
                      <dd className="font-medium">{detail.processedByName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Processed date</dt>
                      <dd>{formatDate(detail.returnDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Customer action</dt>
                      <dd>{GRS_STORE_POLICY.customerAction}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                {detail.exchange && (
                  <>
                    <div>
                      <dt className="text-xs text-muted-foreground">Replacement total</dt>
                      <dd>{formatCurrency(detail.exchange.replacementTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Customer paid</dt>
                      <dd>{formatCurrency(detail.exchange.amountPaid)}</dd>
                    </div>
                  </>
                )}
                {detail.stockRestoredAt && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Stock restored</dt>
                    <dd>{formatDate(detail.stockRestoredAt)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Total qty</dt>
                  <dd>{detail.totalQuantity ?? detail.items.reduce((n, i) => n + i.quantity, 0)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Return amount</dt>
                  <dd className="font-semibold tabular-nums text-amount-negative">
                    {formatCurrencyDeduction(detail.totalReturnAmount)}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Items returned
                </p>
                <ul className="space-y-1 rounded-lg border bg-muted/30 p-3">
                  {detail.items.map((i) => (
                    <li key={i.productId} className="flex justify-between gap-2">
                      <span>
                        {i.productName} <span className="text-muted-foreground">× {i.quantity}</span>
                        {i.productBatchId && (
                          <span className="block text-xs text-muted-foreground">
                            Batch {i.batchCode ?? i.productBatchId.slice(0, 8)}
                            {i.batchReceivedDate ? ` · received ${i.batchReceivedDate}` : ""}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatCurrency(i.returnAmount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {detail.reason && (
                <p>
                  <span className="text-muted-foreground">Reason: </span>
                  {detail.reason}
                </p>
              )}
              {detail.rejectionReason && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                  {detail.status === GrsStatus.Rejected ? "Rejected" : "Cancelled"}:{" "}
                  {detail.rejectionReason}
                </p>
              )}
              {detail.approvalNotes && (
                <p className="text-sm text-muted-foreground">
                  Approval notes: {detail.approvalNotes}
                </p>
              )}
              {detail.voidReason && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                  Void: {detail.voidReason}
                  {detail.voidedByName && (
                    <span className="mt-1 block text-xs">By {detail.voidedByName}</span>
                  )}
                </p>
              )}
            </div>
          )}
          <DialogFooter showCloseButton={false} className="shrink-0 border-t px-5 py-3 sm:px-6">
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detail?.exchange && (
              <Button
                onClick={() => {
                  setExchangeReceiptGrs(detail);
                  setDetail(null);
                }}
              >
                Exchange receipt
              </Button>
            )}
            <Button onClick={() => detail && setReceiptGrs(detail)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidTarget} dismissible onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Void GRS {voidTarget?.grsNumber}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reverses return/exchange stock movements and sales deductions. Original invoice
            unchanged. Owner only.
          </p>
          <Input
            placeholder="Void reason (required)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void voidGrs()} disabled={!voidReason.trim()}>
              Void GRS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
