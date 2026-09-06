"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, FolderOpen, Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import type {
  ExpenseCategory,
  ExpenseReport,
  ExpenseSummary,
  ExpenseVoucher,
  ExpenseVoucherListItem,
  Paged,
  StoreSettings,
} from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { ExpenseCategoryDialog } from "@/components/expenses/expense-category-dialog";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { ExpenseVoucherPrintDialog } from "@/components/expenses/expense-voucher-print-dialog";
import { FilterBar, FilterField } from "@/components/enterprise/filter-bar";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/enterprise/kpi-grid";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExpensesPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [tab, setTab] = useState("list");
  const [list, setList] = useState<ExpenseVoucherListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState(defaultReportRange(90));
  const [reportRange, setReportRange] = useState(defaultReportRange(30));

  const [formOpen, setFormOpen] = useState(false);
  const [editVoucher, setEditVoucher] = useState<ExpenseVoucher | null>(null);
  const [detail, setDetail] = useState<ExpenseVoucher | null>(null);
  const [printVoucher, setPrintVoucher] = useState<ExpenseVoucher | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.get<ExpenseCategory[]>("/api/expenses/categories?includeArchived=true");
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (search.trim()) params.set("search", search.trim());
    return params;
  }, [page, statusFilter, categoryFilter, search, range]);

  const loadList = useCallback(async () => {
    try {
      const [paged, sum] = await Promise.all([
        api.get<Paged<ExpenseVoucherListItem>>(`/api/expenses?${buildParams()}`),
        api.get<ExpenseSummary>("/api/expenses/summary"),
      ]);
      setList(paged.items);
      setPage(paged.page);
      setPageSize((paged.pageSize as TablePageSize) ?? pageSize);
      setTotalPages(paged.totalPages);
      setTotalCount(paged.totalCount);
      setSummary(sum);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load expenses");
    }
  }, [buildParams, pageSize]);

  const loadReport = useCallback(async () => {
    try {
      const params = new URLSearchParams(reportQueryParams(reportRange.from, reportRange.to));
      const data = await api.get<ExpenseReport>(`/api/expenses/reports?${params}`);
      setReport(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load expense report");
    }
  }, [reportRange]);

  useEffect(() => {
    void loadCategories();
    api.get<StoreSettings>("/api/settings/store").then(setSettings).catch(() => {});
  }, [loadCategories]);

  useEffect(() => {
    if (tab === "list") void loadList();
  }, [tab, loadList]);

  useEffect(() => {
    if (tab === "reports") void loadReport();
  }, [tab, loadReport]);

  const openDetail = async (id: string) => {
    try {
      const voucher = await api.get<ExpenseVoucher>(`/api/expenses/${id}`);
      setDetail(voucher);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load voucher");
    }
  };

  const openEdit = async (id: string) => {
    try {
      const voucher = await api.get<ExpenseVoucher>(`/api/expenses/${id}`);
      setEditVoucher(voucher);
      setFormOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load voucher");
    }
  };

  const refreshAll = () => {
    void loadCategories();
    void loadList();
    if (tab === "reports") void loadReport();
    if (detail) void openDetail(detail.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense tracker"
        description="Record, print, and track business expenses — independent from sales and inventory."
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Button variant="outline" onClick={() => setCategoriesOpen(true)}>
                <Tags className="mr-2 h-4 w-4" />
                Categories
              </Button>
            )}
            <Button
              onClick={() => {
                setEditVoucher(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New voucher
            </Button>
          </div>
        }
      />

      {summary && (
        <KpiGrid>
          <StatCard title="Total vouchers" value={String(summary.totalCount)} icon={Banknote} />
          <StatCard title="Unpaid amount" value={formatCurrency(summary.unpaidAmount)} icon={FolderOpen} />
          <StatCard title="Paid amount" value={formatCurrency(summary.paidAmount)} icon={Banknote} accent="profit" />
          <StatCard title="Active total" value={formatCurrency(summary.totalAmount)} icon={Banknote} />
        </KpiGrid>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Vouchers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="overflow-hidden shadow-erp">
            <FilterBar>
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
                <Label className="text-xs">Search</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Voucher, payee, reference…"
                />
              </FilterField>
              <FilterField>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="0">Unpaid</SelectItem>
                    <SelectItem value="1">Paid</SelectItem>
                    <SelectItem value="2">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField>
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" || !v ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.filter((c) => c.isActive).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterBar>
          </Card>

          <ResponsiveDataView
            mobile={
              list.length ? (
                list.map((row) => (
                  <RecordMobileCard
                    key={row.id}
                    title={row.payee}
                    subtitle={row.voucherNumber}
                    meta={`${formatDateOnly(row.expenseDate)} · ${row.categoryName}`}
                    badge={<ExpenseStatusBadge status={row.status} label={row.statusLabel} />}
                    amount={formatCurrency(row.amount)}
                    onOpen={() => void openDetail(row.id)}
                  />
                ))
              ) : (
                <EmptyState title="No expense vouchers" description="Create a voucher to get started." />
              )
            }
          >
              <TableShell>
                <Table enterprise>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">{formatDateOnly(row.expenseDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{row.voucherNumber}</TableCell>
                        <TableCell>{row.categoryName}</TableCell>
                        <TableCell className="max-w-[12rem] truncate">{row.payee}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell>
                          <ExpenseStatusBadge status={row.status} label={row.statusLabel} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => void openDetail(row.id)}>
                            View
                          </Button>
                          {row.status === 0 && (
                            <Button size="sm" variant="ghost" onClick={() => void openEdit(row.id)}>
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!list.length && <TableEmptyRow colSpan={7} title="No expense vouchers found" />}
                  </TableBody>
                </Table>
              </TableShell>
          </ResponsiveDataView>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            itemLabel="expense vouchers"
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            className="rounded-lg border bg-card"
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="overflow-hidden shadow-erp">
            <FilterBar>
              <FilterField>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={reportRange.from}
                  onChange={(e) => setReportRange((r) => ({ ...r, from: e.target.value }))}
                />
              </FilterField>
              <FilterField>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={reportRange.to}
                  onChange={(e) => setReportRange((r) => ({ ...r, to: e.target.value }))}
                />
              </FilterField>
            </FilterBar>
          </Card>
          {report && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{formatCurrency(report.grandTotal)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(report.from)} – {formatDateOnly(report.to)} (excludes cancelled)
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <ReportTable title="Daily expenses" rows={report.dailyTotals} />
                <ReportTable title="Monthly expenses" rows={report.monthlyTotals} />
                <ReportTable
                  title="By category"
                  rows={report.byCategory.map((r) => ({
                    periodLabel: r.categoryName,
                    count: r.count,
                    totalAmount: r.totalAmount,
                  }))}
                />
                <ReportTable
                  title="By status"
                  rows={report.byStatus.map((r) => ({
                    periodLabel: r.statusLabel,
                    count: r.count,
                    totalAmount: r.totalAmount,
                  }))}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        voucher={editVoucher}
        onCategoriesChanged={loadCategories}
        onSaved={(created) => {
          refreshAll();
          if (created) setPrintVoucher(created);
        }}
      />
      <ExpenseCategoryDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        onChanged={loadCategories}
      />
      <ExpenseDetailDialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        voucher={detail}
        onChanged={refreshAll}
        onPrint={() => {
          if (detail) setPrintVoucher(detail);
        }}
      />
      <ExpenseVoucherPrintDialog
        open={Boolean(printVoucher)}
        onOpenChange={(open) => !open && setPrintVoucher(null)}
        voucher={printVoucher}
        settings={settings}
      />
    </div>
  );
}

function ReportTable({
  title,
  rows,
}: {
  title: string;
  rows: { periodLabel: string; count: number; totalAmount: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.periodLabel}>
                <TableCell>{r.periodLabel}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableEmptyRow colSpan={3} title="No data in range" />}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
