"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Cheque, ChequesSummary, Paged } from "@/lib/types";
import {
  CHEQUE_STATUS_LABELS,
  CHEQUE_TYPE_LABELS,
  ChequeStatus,
} from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkBouncedDialog } from "@/components/cheques/mark-bounced-dialog";

export default function ChequesPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [list, setList] = useState<Cheque[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<ChequesSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [detail, setDetail] = useState<Cheque | null>(null);
  const [bounceId, setBounceId] = useState<string | null>(null);

  const load = useCallback(async (pageNum = page, pageSizeNum = pageSize) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("pageSize", String(pageSizeNum));
    if (statusFilter === "pending") params.set("status", "0");
    else if (statusFilter === "cleared") params.set("status", "1");
    else if (statusFilter === "bounced") params.set("status", "2");
    const [paged, sum] = await Promise.all([
      api.get<Paged<Cheque>>(`/api/cheques?${params}`),
      api.get<ChequesSummary>("/api/cheques/summary"),
    ]);
    setList(paged.items ?? []);
    setPage(paged.page ?? pageNum);
    setPageSize((paged.pageSize as TablePageSize) ?? pageSizeNum);
    setTotalPages(Math.max(1, paged.totalPages ?? 1));
    setTotalCount(paged.totalCount ?? 0);
    setSummary(sum);
  }, [statusFilter, page, pageSize]);

  useEffect(() => {
    void load(page, pageSize);
  }, [load, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const updateStatus = async (id: string, status: number) => {
    try {
      await api.post(`/api/cheques/${id}/status`, { status });
      toast.success(status === ChequeStatus.Cleared ? "Cheque cleared" : "Cheque marked bounced");
      setDetail(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  };

  const statusVariant = (s: number) =>
    s === ChequeStatus.Cleared ? "default" : s === ChequeStatus.Bounced ? "destructive" : "outline";

  return (
    <div>
      <PageHeader
        title="Cheques & PDC"
        description="Track current cheques and post-dated checks until cleared or bounced"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Pending"
          value={String(summary?.pendingCount ?? 0)}
          subtitle={formatCurrency(summary?.pendingAmount ?? 0)}
          icon={CheckSquare}
        />
        <StatCard
          title="PDC pending"
          value={String(summary?.postDatedPendingCount ?? 0)}
          subtitle="Post-dated not yet due"
          icon={CheckSquare}
        />
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="cleared">Cleared</TabsTrigger>
          <TabsTrigger value="bounced">Bounced</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <TableShell>
        <ResponsiveDataView
          mobile={
            !list.length ? (
              <EmptyState compact title="No cheques found" />
            ) : (
              list.map((c) => (
                <RecordMobileCard
                  key={c.id}
                  title={c.saleNumber}
                  subtitle={`${c.bankName} · ${c.chequeNumber}`}
                  meta={`Maturity ${formatDate(c.maturityDate)} · ${CHEQUE_TYPE_LABELS[c.type] ?? "—"}`}
                  amount={formatCurrency(c.amount)}
                  badge={
                    <Badge variant={statusVariant(c.status)} className="text-[10px]">
                      {CHEQUE_STATUS_LABELS[c.status]}
                    </Badge>
                  }
                  onOpen={() => setDetail(c)}
                />
              ))
            )
          }
        >
          <Table enterprise>
            <TableHeader>
              <TableRow>
                <TableHead>Sale</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank / Cheque #</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id} onRowClick={() => setDetail(c)}>
                  <TableCell className="font-medium">{c.saleNumber}</TableCell>
                  <TableCell>{CHEQUE_TYPE_LABELS[c.type] ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{c.bankName}</div>
                    <div className="text-xs text-muted-foreground">{c.chequeNumber}</div>
                  </TableCell>
                  <TableCell>{formatDate(c.maturityDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>
                      {CHEQUE_STATUS_LABELS[c.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!list.length && (
                <TableEmptyRow colSpan={6} title="No cheques found" />
              )}
            </TableBody>
          </Table>
        </ResponsiveDataView>
      </TableShell>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemLabel="cheques"
        onPageChange={(nextPage) => setPage(nextPage)}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        className="mt-4 rounded-lg border bg-card"
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Cheque — {detail?.chequeNumber}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Sale:</span> {detail.saleNumber}</p>
              <p><span className="text-muted-foreground">Type:</span> {CHEQUE_TYPE_LABELS[detail.type]}</p>
              <p>
                <span className="text-muted-foreground">Bank:</span> {detail.bankName}
              </p>
              {detail.branch ? (
                <p>
                  <span className="text-muted-foreground">Branch / address:</span> {detail.branch}
                </p>
              ) : null}
              <p><span className="text-muted-foreground">Account:</span> {detail.accountName}</p>
              <p><span className="text-muted-foreground">Maturity:</span> {formatDate(detail.maturityDate)}</p>
              <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(detail.amount)}</p>
              <p><span className="text-muted-foreground">Status:</span> {CHEQUE_STATUS_LABELS[detail.status]}</p>
              {detail.bounceReason && (
                <p><span className="text-muted-foreground">Bounce reason:</span> {detail.bounceReason}</p>
              )}
            </div>
          )}
          {detail?.status === ChequeStatus.Pending && isOwner && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setBounceId(detail.id); setDetail(null); }}>
                Mark bounced
              </Button>
              <Button onClick={() => updateStatus(detail.id, ChequeStatus.Cleared)}>
                Mark cleared
              </Button>
            </DialogFooter>
          )}
          {detail && (!isOwner || detail.status !== ChequeStatus.Pending) && (
            <DialogFooter>
              <Button onClick={() => setDetail(null)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <MarkBouncedDialog
        chequeId={bounceId}
        open={!!bounceId}
        onOpenChange={(o) => !o && setBounceId(null)}
        onSuccess={load}
        isOwner={isOwner}
      />
    </div>
  );
}
