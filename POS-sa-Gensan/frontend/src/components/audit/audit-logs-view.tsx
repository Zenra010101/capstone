"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import {
  AuditLogCategory,
  type AuditLogEntry,
  type AuditLogSearchResult,
} from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";

export const SECURITY_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "PASSWORD_CHANGE",
  "ROLE_CHANGE",
  "ACCOUNT_LOCK",
  "ACCOUNT_UNLOCK",
  "LOGIN",
];

export const OPERATIONAL_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VOID",
  "PAYMENT",
  "APPROVE",
  "REJECT",
  "ADJUST",
  "REQUEST",
  "CORRECTION",
  "PRICE_CHANGE",
  "BARCODE_CHANGE",
  "CHEQUE_CLEARED",
  "CHEQUE_BOUNCED",
];

export const SECURITY_ENTITIES = ["User", "Auth"];

export const OPERATIONAL_ENTITIES = [
  "Sale",
  "Product",
  "Customer",
  "CustomerReceivable",
  "GoodsReturnSlip",
  "StockReceiving",
  "InventoryAdjustment",
  "SaleCheque",
  "Supplier",
  "Category",
];

type Props = {
  category: typeof AuditLogCategory.Security | typeof AuditLogCategory.Operational;
  title: string;
  description: string;
  actions: string[];
  entities: string[];
  exportPrefix: string;
};

function shortenUa(ua?: string) {
  if (!ua) return "—";
  if (ua.length <= 48) return ua;
  return ua.slice(0, 45) + "...";
}

function AuditLogDetailsBody({ log }: { log: AuditLogEntry }) {
  return (
    <dl className="grid gap-3 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Date / time</dt>
        <dd>{formatDate(log.createdAt)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">User</dt>
        <dd>{log.userEmail ?? "—"}</dd>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Action</dt>
          <dd>
            <Badge variant="secondary" className="text-xs font-medium">
              {log.action}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd>{log.status ?? "—"}</dd>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Entity</dt>
          <dd>{log.entityType}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Entity ID</dt>
          <dd className="break-all font-mono text-xs">{log.entityId ?? "—"}</dd>
        </div>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Details</dt>
        <dd className="whitespace-pre-wrap text-muted-foreground">
          {log.oldValue || log.newValue ? (
            <span>
              {log.oldValue && (
                <span className="text-amount-negative line-through">{log.oldValue}</span>
              )}
              {log.oldValue && log.newValue && " → "}
              {log.newValue && (
                <span className="font-medium text-amount-positive">{log.newValue}</span>
              )}
              {log.details && <span className="mt-2 block">{log.details}</span>}
            </span>
          ) : (
            log.details ?? "—"
          )}
        </dd>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">IP address</dt>
          <dd>{log.ipAddress ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Device / browser</dt>
          <dd className="break-words text-xs">{log.userAgent ?? "—"}</dd>
        </div>
      </div>
    </dl>
  );
}

export function AuditLogsView({
  category,
  title,
  description,
  actions,
  entities,
  exportPrefix,
}: Props) {
  const [range, setRange] = useState(defaultReportRange(7));
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AuditLogSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("category", String(category));
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("pageSize", "50");
    try {
      const data = await api.get<AuditLogSearchResult>(`/api/auditlogs?${params}`);
      setResult(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, category, action, entityType, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportFile = async (format: "excel" | "pdf") => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("category", String(category));
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (search.trim()) params.set("search", search.trim());
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(
        `/api/auditlogs/export?${params}&format=${format}`,
        `${exportPrefix}-audit.${ext}`
      );
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const totalPages = result
    ? Math.max(1, Math.ceil(result.totalCount / result.pageSize))
    : 1;

  return (
    <div>
      <PageHeader title={title} description={description} />

      <Card className="mb-4 p-4 shadow-erp">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Input
              type="date"
              value={range.from}
              onChange={(e) => {
                setPage(1);
                setRange((r) => ({ ...r, from: e.target.value }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={range.to}
              onChange={(e) => {
                setPage(1);
                setRange((r) => ({ ...r, to: e.target.value }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={action || "all"}
              onValueChange={(v) => {
                setPage(1);
                setAction(v === "all" ? "" : (v ?? ""));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <Select
              value={entityType || "all"}
              onValueChange={(v) => {
                setPage(1);
                setEntityType(v === "all" ? "" : (v ?? ""));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-4">
            <Label>Search details / user / IP / device</Label>
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Keyword..."
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </Card>

      <TableShell>
        <ResponsiveDataView
          mobile={
            !result?.items.length ? (
              !loading ? (
                <EmptyState compact title="No entries for this filter" />
              ) : null
            ) : (
              result.items.map((log) => (
                <RecordMobileCard
                  key={log.id}
                  title={log.action}
                  subtitle={`${formatDate(log.createdAt)} · ${log.userEmail ?? "—"}`}
                  badge={
                    log.status ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {log.status}
                      </Badge>
                    ) : undefined
                  }
                  meta={<span className="text-muted-foreground">{log.entityType}</span>}
                  onOpen={() => setSelectedLog(log)}
                />
              ))
            )
          }
        >
          <Table enterprise>
            <TableHeader>
              <TableRow>
                <TableHead sticky>Date / time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead hideBelow="lg">Status</TableHead>
                <TableHead hideBelow="md">Entity</TableHead>
                <TableHead hideBelow="xl">IP address</TableHead>
                <TableHead hideBelow="xl">Device / browser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result?.items.map((log) => (
                <TableRow key={log.id} onRowClick={() => setSelectedLog(log)}>
                  <TableCell sticky className="whitespace-nowrap text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{log.userEmail ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell hideBelow="lg" className="text-sm text-muted-foreground">
                    {log.status ?? "—"}
                  </TableCell>
                  <TableCell hideBelow="md" className="text-sm">{log.entityType}</TableCell>
                  <TableCell hideBelow="xl" className="text-sm text-muted-foreground">
                    {log.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell
                    hideBelow="xl"
                    className="max-w-[10rem] truncate text-xs text-muted-foreground"
                    title={log.userAgent}
                  >
                    {shortenUa(log.userAgent)}
                  </TableCell>
                </TableRow>
              ))}
              {!result?.items.length && !loading && (
                <TableEmptyRow colSpan={7} title="No entries for this filter" />
              )}
            </TableBody>
          </Table>
        </ResponsiveDataView>
      </TableShell>

      <Dialog
        open={!!selectedLog}
        dismissible
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Log entry</DialogTitle>
          </DialogHeader>
          {selectedLog && <AuditLogDetailsBody log={selectedLog} />}
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {result && result.totalCount > result.pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {result.page} of {totalPages} ({result.totalCount} entries)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
