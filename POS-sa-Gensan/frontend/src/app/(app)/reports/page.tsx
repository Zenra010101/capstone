"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  defaultReportRange,
  reportQueryParams,
  unifiedReportFilterParams,
} from "@/lib/report-dates";
import {
  REPORT_TYPE_OPTIONS,
  type ReportTypeKind,
  type UnifiedReport,
} from "@/lib/report-types";
import type { ProfitReport } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { EmptyState } from "@/components/enterprise/empty-state";

const PAGE_SIZE = 50;

export default function ReportsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [range, setRange] = useState(defaultReportRange);
  const [period, setPeriod] = useState<"custom" | "monthly" | "yearly">("custom");
  const [reportType, setReportType] = useState<ReportTypeKind>("Sales");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<UnifiedReport | null>(null);
  const [profitLegacy, setProfitLegacy] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(false);

  const buildQuery = useCallback((pageNum = page) => {
    const q = new URLSearchParams(unifiedReportFilterParams(range.from, range.to));
    q.set("type", reportType);
    q.set("filter.page", String(pageNum));
    q.set("filter.pageSize", String(PAGE_SIZE));
    q.set("filter.period", period);
    q.set("filter.includeArchived", String(includeArchived));
    return q.toString();
  }, [range.from, range.to, reportType, page, period, includeArchived]);

  const load = useCallback(async (pageNum = page) => {
    if (period === "custom" && range.from && range.to && range.from > range.to) {
      toast.error("From date must be on or before To date");
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<UnifiedReport>(`/api/reports/query?${buildQuery(pageNum)}`);
      setReport(data);
      if (reportType === "Profit" && data.profitDetail) {
        setProfitLegacy(data.profitDetail);
      } else {
        setProfitLegacy(null);
      }
    } catch (e) {
      const message =
        e instanceof ApiError
          ? [e.message, ...(e.errors ?? [])].filter(Boolean).join(" — ")
          : "Failed to load report";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, reportType, page, period, range.from, range.to]);

  const exportLegacy = async (kind: "sales" | "profit", format: "excel" | "pdf") => {
    const q = reportQueryParams(range.from, range.to);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(
        `/api/reports/${kind}/export?${q}&format=${format}`,
        `${kind}-report.${ext}`
      );
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const exportUnified = async () => {
    try {
      await downloadExport(
        `/api/reports/export?type=${reportType}&${buildQuery()}&format=excel`,
        `${reportType}-report.xlsx`
      );
      toast.success("Downloaded Excel");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const totalPages =
    report?.salesRows?.totalPages ??
    report?.movementRows?.totalPages ??
    report?.receivableRows?.totalPages ??
    report?.taxRows?.totalPages ??
    report?.voidRows?.totalPages ??
    report?.grsRows?.totalPages ??
    report?.inventoryRows?.totalPages ??
    report?.stockReceivingRows?.totalPages ??
    report?.auditRows?.totalPages ??
    0;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Server-filtered reports with pagination — safe for years of history"
      />

      <Card className="mb-6 shadow-erp">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Report type</Label>
            <Select
              value={reportType}
              onValueChange={(v) => {
                setReportType(v as ReportTypeKind);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as typeof period)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom range</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </div>
            </>
          )}
          {period !== "custom" && (
            <div className="space-y-2">
              <Label>Anchor date</Label>
              <Input
                type="date"
                className="w-40"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include archived
          </label>
          <Button
            onClick={() => {
              setPage(1);
              load();
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : "Run report"}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(reportType === "Sales" || reportType === "Profit") && (
              <>
                <Button variant="outline" size="sm" onClick={() => exportLegacy(reportType === "Sales" ? "sales" : "profit", "excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportLegacy(reportType === "Sales" ? "sales" : "profit", "pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={exportUnified}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export page (Excel)
            </Button>
          </div>

          <SummaryCards report={report} reportType={reportType} />

          {reportType === "Sales" && report.salesRows && (
            <>
              <DataTable
                title="Transactions"
                headers={[
                  "Invoice",
                  "Date",
                  ...(isOwner ? ["Cashier"] : []),
                  "Payment",
                  "Invoice amount",
                  "Collected at sale",
                  "Receivable",
                ]}
                rows={report.salesRows.items.map((r) => [
                  r.saleNumber,
                  formatDate(r.createdAt),
                  ...(isOwner ? [r.cashierName] : []),
                  r.paymentMethod,
                  formatCurrency(r.totalAmount),
                  formatCurrency(r.collectedAmount ?? 0),
                  formatCurrency(r.receivableAmount ?? 0),
                ])}
              />
              {report.summary.paymentBreakdown?.length ? (
                <DataTable
                  title="Payment breakdown"
                  headers={["Payment", "Transactions", "Invoice amount", "Collected at sale"]}
                  rows={report.summary.paymentBreakdown.map((p) => [
                    p.method,
                    String(p.count),
                    formatCurrency(p.invoiceAmount ?? p.amount ?? 0),
                    formatCurrency(p.collectedAmount ?? 0),
                  ])}
                />
              ) : null}
            </>
          )}

          {reportType === "Profit" && profitLegacy && (
            <ProfitSection profit={profitLegacy} />
          )}

          {reportType === "InventoryMovement" && report.movementRows && (
            <DataTable
              title="Movements"
              headers={["Date", "Product", "Type", "Qty", "Balance"]}
              rows={report.movementRows.items.map((r) => [
                formatDate(r.createdAt),
                r.productName,
                r.type,
                String(r.quantity),
                String(r.stockAfter),
              ])}
            />
          )}

          {reportType === "Inventory" && report.inventoryRows && (
            <DataTable
              title="Current stock"
              headers={["SKU", "Product", "Category", "On hand"]}
              rows={report.inventoryRows.items.map((r) => [
                r.sku,
                r.productName,
                r.category,
                String(r.stockQuantity),
              ])}
            />
          )}

          {reportType === "Receivables" && report.receivableRows && (
            <DataTable
              title="Receivables"
              headers={["Invoice", "Customer", "Due", "Balance", "Status"]}
              rows={report.receivableRows.items.map((r) => [
                r.saleNumber,
                r.customerName,
                formatDate(r.dueDate),
                formatCurrency(r.remainingBalance),
                r.status,
              ])}
            />
          )}

          {reportType === "Tax" && report.taxRows && (
            <DataTable
              title="Tax"
              headers={["Invoice", "Date", "Type", "Tax", "Total"]}
              rows={report.taxRows.items.map((r) => [
                r.saleNumber,
                formatDate(r.createdAt),
                r.taxTypeLabel,
                formatCurrency(r.taxAmount),
                formatCurrency(r.totalAmount),
              ])}
            />
          )}

          {reportType === "Voids" && report.voidRows && (
            <DataTable
              title="Voided sales"
              headers={["Invoice", "Voided", "Cashier", "Amount", "Reason"]}
              rows={report.voidRows.items.map((r) => [
                r.saleNumber,
                formatDate(r.voidedAt),
                r.cashierName,
                formatCurrency(r.totalAmount),
                r.voidReason ?? "",
              ])}
            />
          )}

          {reportType === "Grs" && report.grsRows && (
            <DataTable
              title="Goods return slips"
              headers={["GRS", "Sale", "Date", "Amount"]}
              rows={report.grsRows.items.map((r) => [
                r.grsNumber,
                r.saleNumber,
                formatDate(r.returnDate),
                formatCurrency(r.totalReturnAmount),
              ])}
            />
          )}

          {reportType === "StockReceiving" && report.stockReceivingRows && (
            <DataTable
              title="Stock receiving"
              headers={["Number", "Supplier", "Delivery", "Status", "Items"]}
              rows={report.stockReceivingRows.items.map((r) => [
                r.receivingNumber,
                r.supplierName,
                formatDate(r.deliveryDate),
                r.status,
                String(r.itemCount),
              ])}
            />
          )}

          {reportType === "Audit" && report.auditRows && (
            <DataTable
              title="Audit log"
              headers={["Date", "Action", "Entity", "User", "Details"]}
              rows={report.auditRows.items.map((r) => [
                formatDate(r.createdAt),
                r.action,
                r.entityType,
                r.userEmail ?? "",
                (r.details ?? "").slice(0, 80),
              ])}
            />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  void load(next);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void load(next);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {!report && !loading && (
        <p className="text-muted-foreground">Choose a report type and date range, then run.</p>
      )}
    </div>
  );
}

function SummaryCards({
  report,
  reportType,
}: {
  report: UnifiedReport;
  reportType: ReportTypeKind;
}) {
  const t = report.summary.totals;
  const c = report.summary.counts;
  const cards: { label: string; value: string }[] = [];

  if (reportType === "Sales") {
    cards.push(
      { label: "Transactions", value: String(c.transactions ?? 0) },
      { label: "Gross invoice sales", value: formatCurrency(t.grossSales ?? 0) },
      { label: "Net invoice sales", value: formatCurrency(t.netSales ?? 0) },
      { label: "Collected in period", value: formatCurrency(t.collectedInPeriod ?? 0) }
    );
  } else if (reportType === "Profit" && report.profitDetail) {
    cards.push(
      { label: "Net sales", value: formatCurrency(report.profitDetail.netSales) },
      { label: "Gross profit", value: formatCurrency(report.profitDetail.grossProfit) },
      { label: "Margin", value: `${report.profitDetail.profitMarginPercent.toFixed(1)}%` }
    );
  } else {
    Object.entries(t).slice(0, 3).forEach(([k, v]) =>
      cards.push({ label: k, value: formatCurrency(v) })
    );
    Object.entries(c).slice(0, 1).forEach(([k, v]) =>
      cards.push({ label: k, value: String(v) })
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-erp">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card className="shadow-erp">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <ResponsiveDataView
        mobile={
          rows.length === 0 ? (
            <EmptyState compact title="No rows in this report" />
          ) : (
            rows.map((row, i) => (
              <RecordMobileCard
                key={i}
                title={String(row[0])}
                subtitle={row.slice(1, 3).filter(Boolean).join(" · ") || undefined}
                amount={
                  row.length > 1 && /[₱$]|^\d/.test(String(row[row.length - 1]))
                    ? String(row[row.length - 1])
                    : undefined
                }
                meta={
                  row.length > 3 ? (
                    <span className="text-xs">{row.slice(3).join(" · ")}</span>
                  ) : undefined
                }
              />
            ))
          )
        }
      >
        <div className="erp-table-scroll">
          <Table enterprise>
            <TableHeader>
              <TableRow>
                {headers.map((h, hi) => (
                  <TableHead key={h} sticky={hi === 0}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell
                      key={j}
                      sticky={j === 0}
                      className={j === row.length - 1 ? "text-right font-medium" : ""}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ResponsiveDataView>
    </Card>
  );
}

function ProfitSection({ profit }: { profit: ProfitReport }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Profit uses cost and selling price saved on each line at checkout — not current product cost.
      </p>
      {profit.byCategory && profit.byCategory.length > 0 && (
        <Card className="shadow-erp">
          <CardHeader>
            <CardTitle className="text-base">Profit by category</CardTitle>
          </CardHeader>
          <Table enterprise>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profit.byCategory.map((c) => (
                <TableRow key={c.categoryName}>
                  <TableCell>{c.categoryName}</TableCell>
                  <TableCell className="text-right">{c.quantitySold}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.revenue)}</TableCell>
                  <TableCell className="text-right font-medium text-amount-positive">
                    {formatCurrency(c.profit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Card className="shadow-erp">
        <CardHeader>
          <CardTitle className="text-base">Top products by profit</CardTitle>
        </CardHeader>
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profit.byProduct.map((p) => (
              <TableRow key={p.sku + p.productName}>
                <TableCell>{p.productName}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="text-right">{p.quantitySold}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                <TableCell className="text-right font-medium text-amount-positive">
                  {formatCurrency(p.profit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
