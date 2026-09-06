"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  FileText,
  History,
  Package,
  Printer,
  Search,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { formatCurrency, formatDate } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { defaultReportRange, reportQueryParams } from "@/lib/report-dates";
import {
  REPORT_RANGE_PRESETS,
  resolveReportRange,
  type ReportRangePreset,
} from "@/lib/report-range-presets";
import type {
  Category,
  InventoryOnHand,
  InventoryStockListReport,
  InventorySummary,
  InventoryTransaction,
  Paged,
  Product,
} from "@/lib/types";
import { INVENTORY_MOVEMENT_TYPES } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/products/stock-status-badge";
import { LowStockAlerts } from "@/components/inventory/low-stock-alerts";
import { MovementTypeBadge } from "@/components/inventory/movement-type-badge";
import { InventoryLedgerDialog } from "@/components/inventory/inventory-ledger-dialog";
import { InventoryStockListPrint } from "@/components/inventory/inventory-stock-list-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function InventoryPage() {
  const ON_HAND_PAGE_SIZE = 50;
  const STOCK_LIST_PAGE_SIZE = 50;
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId") ?? "";
  const initialTab =
    searchParams.get("tab") === "movements"
      ? "movements"
      : searchParams.get("tab") === "stock-list"
        ? "stock-list"
        : "on-hand";

  const [tab, setTab] = useState(initialTab);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [onHand, setOnHand] = useState<InventoryOnHand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [onHandSearch, setOnHandSearch] = useState("");
  const [onHandCategoryId, setOnHandCategoryId] = useState(initialCategoryId);
  const [onHandLowOnly, setOnHandLowOnly] = useState(false);
  const [onHandPage, setOnHandPage] = useState(1);
  const [onHandTotalPages, setOnHandTotalPages] = useState(1);
  const [onHandTotalCount, setOnHandTotalCount] = useState(0);

  const [range, setRange] = useState(defaultReportRange(30));
  const [rangePreset, setRangePreset] = useState<ReportRangePreset>("thisMonth");
  const [stockListReport, setStockListReport] = useState<InventoryStockListReport | null>(null);
  const [stockListLoading, setStockListLoading] = useState(false);
  const [stockListPage, setStockListPage] = useState(1);
  const [movSearch, setMovSearch] = useState("");
  const [movProductId, setMovProductId] = useState("");
  const [movCategoryId, setMovCategoryId] = useState(initialCategoryId);
  const [movType, setMovType] = useState("");
  const [movReference, setMovReference] = useState("");
  const [movLowOnly, setMovLowOnly] = useState(false);
  const [movPage, setMovPage] = useState(1);
  const [movResult, setMovResult] = useState<{
    items: InventoryTransaction[];
    totalPages: number;
    page: number;
  } | null>(null);

  const [ledgerProductId, setLedgerProductId] = useState<string | null>(null);
  const [ledgerProductName, setLedgerProductName] = useState("");

  const openLedger = (productId: string, productName: string) => {
    setLedgerProductId(productId);
    setLedgerProductName(productName);
  };

  const loadSummary = useCallback(async () => {
    try {
      const s = await api.get<InventorySummary>("/api/inventory/summary");
      setSummary(s);
    } catch {
      /* optional */
    }
  }, []);

  const loadOnHand = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(onHandPage));
    params.set("pageSize", String(ON_HAND_PAGE_SIZE));
    if (onHandSearch.trim()) params.set("search", onHandSearch.trim());
    if (onHandCategoryId) params.set("categoryId", onHandCategoryId);
    if (onHandLowOnly) params.set("lowStockOnly", "true");
    try {
      const rows = await api.get<Paged<InventoryOnHand>>(`/api/inventory/on-hand?${params}`);
      setOnHand(rows.items ?? []);
      setOnHandTotalPages(Math.max(1, rows.totalPages ?? 1));
      setOnHandTotalCount(rows.totalCount ?? 0);
      setOnHandPage(rows.page ?? onHandPage);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load inventory");
    }
  }, [onHandPage, onHandSearch, onHandCategoryId, onHandLowOnly, ON_HAND_PAGE_SIZE]);

  const loadMovements = useCallback(async () => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", String(movPage));
    params.set("pageSize", "50");
    if (movSearch.trim()) params.set("search", movSearch.trim());
    if (movProductId) params.set("productId", movProductId);
    if (movCategoryId) params.set("categoryId", movCategoryId);
    if (movType) params.set("type", movType);
    if (movReference.trim()) params.set("reference", movReference.trim());
    if (movLowOnly) params.set("lowStockOnly", "true");
    try {
      const res = await api.get<{
        items: InventoryTransaction[];
        totalPages: number;
        page: number;
      }>(`/api/inventory?${params}`);
      setMovResult(res);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load movements");
    }
  }, [range, movPage, movSearch, movProductId, movCategoryId, movType, movReference, movLowOnly]);

  const loadStockList = useCallback(async () => {
    if (!isOwner) return;
    setStockListLoading(true);
    try {
      const params = new URLSearchParams();
      if (onHandSearch.trim()) params.set("search", onHandSearch.trim());
      if (onHandCategoryId) params.set("categoryId", onHandCategoryId);
      if (onHandLowOnly) params.set("lowStockOnly", "true");
      const data = await api.get<InventoryStockListReport>(`/api/inventory/stock-list?${params}`);
      setStockListReport({ ...data, lines: data.lines ?? [] });
      setStockListPage(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load stock list");
    } finally {
      setStockListLoading(false);
    }
  }, [isOwner, onHandSearch, onHandCategoryId, onHandLowOnly]);

  useEffect(() => {
    loadSummary();
    cachedGet(ReferenceKeys.categoriesActive, REFERENCE_TTL_MS, () =>
      api.get<ListResponse<Category>>("/api/categories?withActiveProductsOnly=true")
    )
      .then((data) => setCategories(asList(data)))
      .catch(() => {});
    api
      .get<ListResponse<Product>>("/api/products?activeOnly=true")
      .then((data) => setProducts(asList(data)))
      .catch(() => {});
  }, [loadSummary]);

  useDebouncedEffect(() => {
    void loadOnHand();
  }, [loadOnHand], 300);

  useDebouncedEffect(() => {
    if (tab !== "movements") return;
    void loadMovements();
  }, [tab, loadMovements], 300);

  useDebouncedEffect(() => {
    if (tab !== "stock-list" || !isOwner) return;
    void loadStockList();
  }, [tab, loadStockList, isOwner], 300);

  const applyRangePreset = (preset: ReportRangePreset) => {
    setRangePreset(preset);
    if (preset !== "custom") {
      setRange(resolveReportRange(preset));
      setMovPage(1);
    }
  };

  const exportStockList = async (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (onHandSearch.trim()) params.set("search", onHandSearch.trim());
    if (onHandCategoryId) params.set("categoryId", onHandCategoryId);
    if (onHandLowOnly) params.set("lowStockOnly", "true");
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(`/api/inventory/export/stock-list?${params}`, `inventory-stock-list.${ext}`);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const printStockList = async () => {
    setStockListLoading(true);
    try {
      const params = new URLSearchParams();
      if (onHandSearch.trim()) params.set("search", onHandSearch.trim());
      if (onHandCategoryId) params.set("categoryId", onHandCategoryId);
      if (onHandLowOnly) params.set("lowStockOnly", "true");
      const data = await api.get<InventoryStockListReport>(`/api/inventory/stock-list?${params}`);
      setStockListReport({ ...data, lines: data.lines ?? [] });
      setStockListPage(1);
      window.setTimeout(() => window.print(), 150);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to prepare print");
    } finally {
      setStockListLoading(false);
    }
  };

  const exportOnHand = async (format: "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (onHandSearch.trim()) params.set("search", onHandSearch.trim());
    if (onHandCategoryId) params.set("categoryId", onHandCategoryId);
    if (onHandLowOnly) params.set("lowStockOnly", "true");
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(`/api/inventory/export/on-hand?${params}`, `inventory-on-hand.${ext}`);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const exportMovements = async (format: "excel" | "pdf") => {
    const params = new URLSearchParams(reportQueryParams(range.from, range.to));
    params.set("page", "1");
    params.set("pageSize", "5000");
    if (movSearch.trim()) params.set("search", movSearch.trim());
    if (movProductId) params.set("productId", movProductId);
    if (movCategoryId) params.set("categoryId", movCategoryId);
    if (movType) params.set("type", movType);
    if (movReference.trim()) params.set("reference", movReference.trim());
    if (movLowOnly) params.set("lowStockOnly", "true");
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(`/api/inventory/export/movements?${params}`, `inventory-movements.${ext}`);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const stockListLines = stockListReport?.lines ?? [];
  const stockListTotalPages = Math.max(
    1,
    Math.ceil(stockListLines.length / STOCK_LIST_PAGE_SIZE)
  );
  const stockListPagedLines = useMemo(() => {
    const page = Math.min(stockListPage, stockListTotalPages);
    const start = (page - 1) * STOCK_LIST_PAGE_SIZE;
    return stockListLines.slice(start, start + STOCK_LIST_PAGE_SIZE);
  }, [stockListLines, stockListPage, stockListTotalPages, STOCK_LIST_PAGE_SIZE]);

  return (
    <>
    <div className="print:hidden">
      <PageHeader
        title="Inventory"
        description="On-hand stock and full movement audit trail — all changes are logged, never silent"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total units" value={String(summary?.totalUnits ?? "—")} icon={Boxes} subtitle={`${summary?.activeSkuCount ?? 0} SKUs`} />
        <StatCard title="Low stock" value={String(summary?.lowStockCount ?? "—")} icon={AlertTriangle} subtitle="<= 15 units" />
        <StatCard title="Critical" value={String(summary?.criticalStockCount ?? "—")} icon={AlertTriangle} subtitle="<= 5 units" />
        <StatCard title="Out of stock" value={String(summary?.outOfStockCount ?? "—")} icon={Package} />
        {isOwner && (
          <StatCard
            title="Inventory value"
            value={summary?.totalInventoryValue != null ? formatCurrency(summary.totalInventoryValue) : "—"}
            icon={Warehouse}
            subtitle="Cost x on hand"
          />
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 w-full max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="on-hand" className="shrink-0">Current inventory</TabsTrigger>
          <TabsTrigger value="movements" className="shrink-0">Movement history</TabsTrigger>
          {isOwner ? (
            <TabsTrigger value="stock-list" className="shrink-0">Stock list report</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="on-hand">
          <LowStockAlerts items={onHand} onViewLedger={openLedger} />

          <Card className="mb-4 shadow-erp">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search product or SKU..."
                  value={onHandSearch}
                  onChange={(e) => { setOnHandPage(1); setOnHandSearch(e.target.value); }}
                />
              </div>
              <Select value={onHandCategoryId || "all"} onValueChange={(v) => { setOnHandPage(1); setOnHandCategoryId(v === "all" ? "" : (v ?? "")); }}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={onHandLowOnly}
                  onChange={(e) => { setOnHandPage(1); setOnHandLowOnly(e.target.checked); }}
                  className="rounded border-slate-300"
                />
                Low stock only
              </label>
            </CardContent>
            <div className="flex flex-wrap gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={() => exportOnHand("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportOnHand("pdf")}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </Card>

          <Card className="border-border/80 shadow-erp">
            <ResponsiveDataView
              mobile={
                <>
                  {onHand.map((r) => (
                    <RecordMobileCard
                      key={r.productId}
                      title={r.productName}
                      subtitle={`${r.productSku} · ${r.categoryName}`}
                      badge={<StockStatusBadge status={r.stockStatus} label={r.stockStatusLabel} />}
                      meta={
                        <span>
                          On hand: {r.stockQuantity} {r.unitOfMeasure}
                          {r.lastMovementAt
                            ? ` · Last move ${formatDate(r.lastMovementAt)}`
                            : ""}
                        </span>
                      }
                      amount={
                        isOwner && r.inventoryValue != null
                          ? formatCurrency(r.inventoryValue)
                          : undefined
                      }
                      onOpen={() => openLedger(r.productId, r.productName)}
                      onAction={() => openLedger(r.productId, r.productName)}
                      actionLabel="View ledger"
                    />
                  ))}
                  {!onHand.length && (
                    <EmptyState compact title="No inventory rows match filters" />
                  )}
                </>
              }
            >
            <Table enterprise>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead hideBelow="lg">Category</TableHead>
                  <TableHead hideBelow="xl">Unit</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead hideBelow="xl">Last movement</TableHead>
                  {isOwner && <TableHead hideBelow="md" className="text-right">Value</TableHead>}
                  <TableHead className="w-[56px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {onHand.map((r) => (
                  <TableRow
                    key={r.productId}
                    onRowClick={() => openLedger(r.productId, r.productName)}
                  >
                    <TableCell sticky className="font-medium">{r.productName}</TableCell>
                    <TableCell className="font-mono text-xs">{r.productSku}</TableCell>
                    <TableCell hideBelow="lg" className="text-sm text-muted-foreground">{r.categoryName}</TableCell>
                    <TableCell hideBelow="xl" className="text-sm">{r.unitOfMeasure}</TableCell>
                    <TableCell className="text-right font-semibold">{r.stockQuantity}</TableCell>
                    <TableCell>
                      <StockStatusBadge status={r.stockStatus} label={r.stockStatusLabel} />
                    </TableCell>
                    <TableCell hideBelow="xl" className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.lastMovementAt ? formatDate(r.lastMovementAt) : "—"}
                    </TableCell>
                    {isOwner && (
                      <TableCell hideBelow="md" className="text-right text-sm text-muted-foreground">
                        {r.inventoryValue != null ? formatCurrency(r.inventoryValue) : "—"}
                      </TableCell>
                    )}
                    <TableRowActions>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openLedger(r.productId, r.productName)}>
                            <History className="mr-2 h-4 w-4" />
                            View ledger
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableRowActions>
                  </TableRow>
                ))}
                {!onHand.length && (
                  <TableEmptyRow colSpan={isOwner ? 9 : 8} title="No inventory rows match filters" />
                )}
              </TableBody>
            </Table>
            </ResponsiveDataView>
            {onHandTotalPages > 1 ? (
              <div className="flex flex-col items-center justify-between gap-2 border-t p-4 sm:flex-row">
                <span className="text-sm text-muted-foreground">
                  Page {onHandPage} of {onHandTotalPages} · {onHandTotalCount} item
                  {onHandTotalCount === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={onHandPage <= 1}
                    onClick={() => setOnHandPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={onHandPage >= onHandTotalPages}
                    onClick={() => setOnHandPage((p) => Math.min(onHandTotalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card className="mb-4 shadow-erp">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap gap-2">
                {REPORT_RANGE_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={rangePreset === p.id ? "default" : "outline"}
                    onClick={() => applyRangePreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="date" value={range.from} onChange={(e) => { setMovPage(1); setRangePreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input type="date" value={range.to} onChange={(e) => { setMovPage(1); setRangePreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Search product / SKU</Label>
                <Input value={movSearch} onChange={(e) => { setMovPage(1); setMovSearch(e.target.value); }} />
              </div>
              <div className="space-y-1">
                <Label>Product</Label>
                <Select value={movProductId || "all"} onValueChange={(v) => { setMovPage(1); setMovProductId(v === "all" ? "" : (v ?? "")); }}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={movCategoryId || "all"} onValueChange={(v) => { setMovPage(1); setMovCategoryId(v === "all" ? "" : (v ?? "")); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Movement type</Label>
                <Select value={movType || "all"} onValueChange={(v) => { setMovPage(1); setMovType(v === "all" ? "" : (v ?? "")); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {INVENTORY_MOVEMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reference #</Label>
                <Input value={movReference} onChange={(e) => { setMovPage(1); setMovReference(e.target.value); }} placeholder="Sale #, SR-, GRS..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground lg:col-span-2">
                <input type="checkbox" checked={movLowOnly} onChange={(e) => { setMovPage(1); setMovLowOnly(e.target.checked); }} className="rounded" />
                Products currently low stock only
              </label>
            </div>
            </CardContent>
            <div className="flex flex-wrap gap-2 border-t px-6 py-3">
              <Button variant="outline" size="sm" onClick={() => exportMovements("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportMovements("pdf")}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </Card>

          <Card className="border-border/80 shadow-erp">
            <ResponsiveDataView
              mobile={
                <>
                  {movResult?.items.map((t) => (
                    <RecordMobileCard
                      key={t.id}
                      title={t.productName}
                      subtitle={`${t.productSku} · ${formatDate(t.createdAt)}`}
                      badge={<MovementTypeBadge label={t.movementTypeLabel} />}
                      meta={
                        <span>
                          {t.stockBefore} → {t.stockAfter} · Ref {t.reference ?? "—"}
                          {t.userName ? ` · ${t.userName}` : ""}
                        </span>
                      }
                      amount={`${t.quantity >= 0 ? "+" : ""}${t.quantity}`}
                      amountTone={t.quantity >= 0 ? "positive" : "negative"}
                      onOpen={() => openLedger(t.productId, t.productName)}
                      onAction={() => openLedger(t.productId, t.productName)}
                      actionLabel="View ledger"
                    />
                  ))}
                  {!movResult?.items.length && (
                    <EmptyState compact title="No movements for this filter" />
                  )}
                </>
              }
            >
            <Table enterprise>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Date / time</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead hideBelow="md">Type</TableHead>
                  <TableHead hideBelow="lg">Batch</TableHead>
                  <TableHead hideBelow="xl">Reference</TableHead>
                  <TableHead hideBelow="lg" className="text-right">Before</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead hideBelow="xl">Reason</TableHead>
                  <TableHead hideBelow="lg">Processed by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movResult?.items.map((t) => (
                  <TableRow
                    key={t.id}
                    onRowClick={() => openLedger(t.productId, t.productName)}
                  >
                    <TableCell sticky className="whitespace-nowrap text-xs">{formatDate(t.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{t.productName}</span>
                      <p className="font-mono text-[10px] text-muted-foreground">{t.productSku}</p>
                    </TableCell>
                    <TableCell hideBelow="md"><MovementTypeBadge label={t.movementTypeLabel} /></TableCell>
                    <TableCell hideBelow="lg" className="font-mono text-xs">{t.batchCode ?? "—"}</TableCell>
                    <TableCell hideBelow="xl" className="font-mono text-xs">{t.reference ?? "—"}</TableCell>
                    <TableCell hideBelow="lg" className="text-right">{t.stockBefore}</TableCell>
                    <TableCell className={`text-right font-medium ${t.quantity >= 0 ? "text-amount-positive" : "text-amount-negative"}`}>
                      {t.quantity >= 0 ? "+" : ""}{t.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium">{t.stockAfter}</TableCell>
                    <TableCell hideBelow="xl" className="max-w-[160px] truncate text-xs text-muted-foreground" title={t.reason}>
                      {t.reason ?? "—"}
                    </TableCell>
                    <TableCell hideBelow="lg" className="text-xs text-muted-foreground">{t.userName ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!movResult?.items.length && (
                  <TableEmptyRow colSpan={10} title="No movements for this filter" />
                )}
              </TableBody>
            </Table>
            {movResult && movResult.totalPages > 1 && (
              <div className="flex flex-col items-center justify-center gap-2 border-t p-4 sm:flex-row sm:gap-4">
                <Button variant="outline" size="sm" disabled={movPage <= 1} onClick={() => setMovPage((p) => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {movResult.page} of {movResult.totalPages}</span>
                <Button variant="outline" size="sm" disabled={movPage >= movResult.totalPages} onClick={() => setMovPage((p) => p + 1)}>Next</Button>
              </div>
            )}
            </ResponsiveDataView>
          </Card>
        </TabsContent>

        {isOwner ? (
          <TabsContent value="stock-list">
            <Card className="mb-4 shadow-erp">
              <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search product, SKU, or batch..."
                    value={onHandSearch}
                    onChange={(e) => { setOnHandPage(1); setOnHandSearch(e.target.value); }}
                  />
                </div>
                <Select value={onHandCategoryId || "all"} onValueChange={(v) => { setOnHandPage(1); setOnHandCategoryId(v === "all" ? "" : (v ?? "")); }}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={onHandLowOnly}
                    onChange={(e) => { setOnHandPage(1); setOnHandLowOnly(e.target.checked); }}
                    className="rounded border-slate-300"
                  />
                  Low stock only
                </label>
              </CardContent>
              <div className="flex flex-wrap gap-2 border-t px-6 py-3">
                <Button variant="outline" size="sm" onClick={() => void loadStockList()} disabled={stockListLoading}>
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => void printStockList()} disabled={stockListLoading}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button size="sm" onClick={() => void exportStockList("pdf")} disabled={stockListLoading}>
                  <FileText className="mr-2 h-4 w-4" /> Save as PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => void exportStockList("excel")} disabled={stockListLoading}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
                </Button>
              </div>
            </Card>

            {stockListReport ? (
              <Card className="shadow-erp">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Printed {stockListReport.printedAtLabel}
                    <span className="text-xs"> · system timestamp (read-only)</span>
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Total inventory value at cost: {formatCurrency(stockListReport.totalValueAtCost)}
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b">
                          {["Product", "SKU", "Batch", "Received", "Original", "Remaining", "Cost", "Sell", "Value"].map((h) => (
                            <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stockListPagedLines.map((line, idx) => (
                          <tr key={`${line.productSku}-${idx}`} className="border-b">
                            <td className="px-2 py-1.5">{line.productName}</td>
                            <td className="px-2 py-1.5 font-mono">{line.productSku}</td>
                            <td className="px-2 py-1.5">{line.batchCode}</td>
                            <td className="px-2 py-1.5">{line.receivedDate}</td>
                            <td className="px-2 py-1.5 text-right">{line.receivedQuantity}</td>
                            <td className="px-2 py-1.5 text-right">{line.remainingQuantity}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(line.costPrice)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(line.sellingPrice)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(line.valueAtCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stockListLines.length > STOCK_LIST_PAGE_SIZE && (
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 border-t pt-4 sm:flex-row sm:gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={stockListPage <= 1}
                        onClick={() => setStockListPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {stockListPage} of {stockListTotalPages} ({stockListLines.length} lines)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={stockListPage >= stockListTotalPages}
                        onClick={() => setStockListPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-erp">
                <CardContent className="py-12 text-center text-muted-foreground">
                  {stockListLoading ? "Loading stock list…" : "No batch stock data"}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <InventoryLedgerDialog
        productId={ledgerProductId}
        productName={ledgerProductName}
        open={!!ledgerProductId}
        onOpenChange={(o) => !o && setLedgerProductId(null)}
      />
    </div>
    {stockListReport ? <InventoryStockListPrint report={stockListReport} /> : null}
    </>
  );
}
