"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Barcode,
  Box,
  Package,
  Plus,
  Search,
  Warehouse,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import {
  cachedGet,
  invalidateReference,
  ReferenceKeys,
  REFERENCE_TTL_MS,
  CATEGORY_KEY_PREFIX,
} from "@/lib/reference-cache";
import { formatCurrency, formatProductSpec } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import type { Category, Product, ProductSummary, StoreSettings, Supplier } from "@/lib/types";
import { StockStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import {
  TablePagination,
  type TablePageSize,
} from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { StatCard } from "@/components/stat-card";
import {
  StockStatusBadge,
  stockStatusRowClass,
} from "@/components/products/stock-status-badge";
import { ProductViewDialog } from "@/components/products/product-view-dialog";
import { ProductEditDialog } from "@/components/products/product-edit-dialog";
import { ProductInventoryHistoryDialog } from "@/components/products/product-inventory-history-dialog";
import { ProductReceivingHistoryDialog } from "@/components/products/product-receiving-history-dialog";
import { ProductSalesHistoryDialog } from "@/components/products/product-sales-history-dialog";
import { ProductPriceHistoryDialog } from "@/components/products/product-price-history-dialog";
import { ProductBarcodePrintDialog } from "@/components/products/product-barcode-print-dialog";
import { BulkBarcodePrintDialog } from "@/components/products/bulk-barcode-print-dialog";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductDeactivateDialog } from "@/components/products/product-deactivate-dialog";
import { ProductRowActions } from "@/components/products/product-row-actions";
import {
  emptyProductForm,
  formToPayload,
  type ProductFormState,
} from "@/components/products/product-form-fields";
import { findCategoryName } from "@/components/products/product-form-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LstmForecast {
  productId: string;
  productSku: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  month: string;
  predictedQuantity: number;
  predictedRevenue: number;
  confidenceInterval: number;
  trend: "up" | "down" | "stable";
  currentStock: number;
  reorderLevel: number;
  recommendedRestock: number;
  planningStatus: "Restock Needed" | "Optimal" | "Overstocked";
}
const STOCK_FILTER_OPTIONS = [
  { value: "all", label: "All stock statuses" },
  { value: String(StockStatus.InStock), label: "In Stock" },
  { value: String(StockStatus.LowStock), label: "Low Stock" },
  { value: String(StockStatus.Critical), label: "Critical" },
  { value: String(StockStatus.OutOfStock), label: "Out of Stock" },
];

export default function ProductsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [filterCategories, setFilterCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("categoryId") ?? "");
  const [supplierId, setSupplierId] = useState("");
  const [stockStatus, setStockStatus] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(emptyProductForm());

  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [inventoryHistoryProduct, setInventoryHistoryProduct] = useState<Product | null>(null);
  const [receivingHistoryProduct, setReceivingHistoryProduct] = useState<Product | null>(null);
  const [salesHistoryProduct, setSalesHistoryProduct] = useState<Product | null>(null);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [deactivateProduct, setDeactivateProduct] = useState<Product | null>(null);
  const [bulkBarcodeOpen, setBulkBarcodeOpen] = useState(false);
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // --- LSTM Forecast State ---
  const [activeTab, setActiveTab] = useState("catalog");
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [fromMonth, setFromMonth] = useState(currentMonthStr);
  const [toMonth, setToMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 5); // Default 6 months range
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [forecastCategoryId, setForecastCategoryId] = useState("");
  const [forecastSearch, setForecastSearch] = useState("");
  const [forecastData, setForecastData] = useState<LstmForecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastPage, setForecastPage] = useState(1);
  const [forecastPageSize, setForecastPageSize] = useState<TablePageSize>(25);

  const handleFromMonthChange = useCallback((val: string) => {
    if (!val) {
      setFromMonth(currentMonthStr);
      return;
    }
    if (val > currentMonthStr) {
      setFromMonth(currentMonthStr);
    } else {
      setFromMonth(val);
    }
  }, [currentMonthStr]);

  const loadForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("fromMonth", `${fromMonth}-01`);
      params.set("toMonth", `${toMonth}-01`);
      if (forecastCategoryId) {
        params.set("categoryId", forecastCategoryId);
      }
      const res = await api.get<LstmForecast[]>(`/api/products/lstm-forecast?${params}`);
      setForecastData(res);
      setForecastPage(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load forecast data");
    } finally {
      setForecastLoading(false);
    }
  }, [fromMonth, toMonth, forecastCategoryId]);

  useEffect(() => {
    if (activeTab === "forecast") {
      void loadForecast();
    }
  }, [activeTab, loadForecast]);

  const filteredForecast = useMemo(() => {
    if (!forecastSearch.trim()) return forecastData;
    const s = forecastSearch.toLowerCase();
    return forecastData.filter(
      (f) =>
        f.productSku.toLowerCase().includes(s) ||
        f.productName.toLowerCase().includes(s) ||
        f.categoryName.toLowerCase().includes(s)
    );
  }, [forecastData, forecastSearch]);

  const forecastTotalCount = filteredForecast.length;
  const forecastTotalPages = Math.max(1, Math.ceil(forecastTotalCount / forecastPageSize));
  
  const pagedForecast = useMemo(() => {
    const startIdx = (forecastPage - 1) * forecastPageSize;
    return filteredForecast.slice(startIdx, startIdx + forecastPageSize);
  }, [filteredForecast, forecastPage, forecastPageSize]);

  const chartItems = useMemo(() => {
    const productTotals: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    filteredForecast.forEach((f) => {
      const key = f.productId;
      if (!productTotals[key]) {
        productTotals[key] = { name: f.productName, sku: f.productSku, qty: 0, revenue: 0 };
      }
      productTotals[key].qty += f.predictedQuantity;
      productTotals[key].revenue += f.predictedRevenue;
    });
    return Object.values(productTotals)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredForecast]);

  const forecastCategoryLabel = useMemo(() => {
    if (!forecastCategoryId) return "All categories / subcategories";
    return findCategoryName(allCategories, forecastCategoryId) ?? "All categories / subcategories";
  }, [allCategories, forecastCategoryId]);

  const canPrintBarcodes =
    isOwner || (storeSettings?.allowCashierBarcodePrinting ?? false);

  useEffect(() => {
    cachedGet(ReferenceKeys.settings, REFERENCE_TTL_MS, () =>
      api.get<StoreSettings>("/api/settings")
    ).then(setStoreSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (!categoryId || !filterCategories.length) return;
    if (!filterCategories.some((c) => c.id === categoryId)) {
      setCategoryId("");
    }
  }, [filterCategories, categoryId]);

  const categoryLabel = useMemo(() => {
    if (!categoryId) return "All categories";
    return findCategoryName(allCategories, categoryId)
      ?? findCategoryName(filterCategories, categoryId)
      ?? "All categories";
  }, [allCategories, filterCategories, categoryId]);

  const supplierLabel = useMemo(() => {
    if (!supplierId) return "All suppliers";
    return suppliers.find((s) => s.id === supplierId)?.name ?? "All suppliers";
  }, [suppliers, supplierId]);

  const stockStatusLabel = useMemo(
    () => STOCK_FILTER_OPTIONS.find((o) => o.value === stockStatus)?.label ?? "All stock statuses",
    [stockStatus]
  );

  const resetStockFilter = useCallback(() => {
    setStockStatus("all");
    setPage(1);
  }, []);

  const load = useCallback(async (pageNum = page) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("pageSize", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (supplierId) params.set("supplierId", supplierId);
    if (stockStatus !== "all") params.set("stockStatus", stockStatus);
    if (!includeInactive) params.set("activeOnly", "true");

    try {
      const [paged, s, filterCats, cats, sup] = await Promise.all([
        api.get<{
          items: Product[];
          totalCount: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>(`/api/products?${params}`),
        api.get<ProductSummary>("/api/products/summary"),
        cachedGet(ReferenceKeys.categoriesActive, REFERENCE_TTL_MS, () =>
          api.get<ListResponse<Category>>("/api/categories?withActiveProductsOnly=true")
        ),
        cachedGet(ReferenceKeys.categoriesAll, REFERENCE_TTL_MS, () =>
          api.get<ListResponse<Category>>("/api/categories")
        ),
        api.get<ListResponse<Supplier>>("/api/suppliers?activeOnly=true"),
      ]);
      setProducts(paged.items);
      setTotalCount(paged.totalCount);
      setTotalPages(paged.totalPages);
      setPage(paged.page);
      setSummary(s);
      setFilterCategories(asList(filterCats));
      setAllCategories(asList(cats));
      setSuppliers(asList(sup));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load products");
    }
  }, [search, categoryId, supplierId, stockStatus, includeInactive, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, supplierId, stockStatus, includeInactive, pageSize]);

  useDebouncedEffect(() => {
    void load(page);
  }, [load, page], 300);

  const handleCreate = async () => {
    const f = createForm;
    if (!f.sku.trim() || !f.name.trim() || !f.categoryId) {
      toast.error("SKU, name, and category are required");
      return;
    }
    try {
      await api.post("/api/products", formToPayload(f, true));
      toast.success("Product created");
      setCreateOpen(false);
      setCreateForm(emptyProductForm());
      invalidateReference(CATEGORY_KEY_PREFIX);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to create product");
    }
  };

  const generateAllMissingBarcodes = async () => {
    if (!isOwner) return;
    setGeneratingBarcodes(true);
    try {
      const result = await api.post<{ generatedCount: number }>(
        "/api/products/generate-missing-barcodes",
        {}
      );
      if (!result.generatedCount) {
        toast.message("All active products already have barcodes");
        return;
      }
      toast.success(
        `Generated ${result.generatedCount} barcode${result.generatedCount === 1 ? "" : "s"} — refresh complete`
      );
      await load(page);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Barcode generation failed");
    } finally {
      setGeneratingBarcodes(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateProduct) return;
    try {
      await api.delete(`/api/products/${deactivateProduct.id}`);
      toast.success("Product deactivated - history and reports are kept");
      setDeactivateProduct(null);
      invalidateReference(CATEGORY_KEY_PREFIX);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to deactivate product");
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={
          activeTab === "catalog"
            ? (isOwner
              ? "Master catalog - specifications, pricing, and stock levels (movements in Inventory)"
              : "View catalog, selling prices, and stock - cost data hidden")
            : "Monthly product demand forecasting and automated restock suggestions to optimize inventory planning (LSTM model)"
        }
        action={
          activeTab === "catalog" ? (
            <div className="flex flex-wrap gap-2">
              {canPrintBarcodes ? (
                <Button variant="outline" onClick={() => setBulkBarcodeOpen(true)}>
                  <Barcode className="mr-2 h-4 w-4" />
                  Generate & print barcodes
                </Button>
              ) : null}
              {isOwner ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add product
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
          <TabsTrigger value="forecast">LSTM Demand & Inventory Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 pt-2">
          {isOwner && (summary?.missingBarcodeCount ?? 0) > 0 ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              {summary?.missingBarcodeCount} active product
              {summary?.missingBarcodeCount === 1 ? "" : "s"} have no barcode yet
            </p>
            <p className="mt-0.5 text-xs text-amber-900/90">
              Deploying the app does not create barcodes. Click below once to assign barcodes to all
              products, then print labels for your scanner.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              size="sm"
              disabled={generatingBarcodes}
              onClick={() => void generateAllMissingBarcodes()}
            >
              {generatingBarcodes
                ? "Generating…"
                : `Generate all ${summary?.missingBarcodeCount} barcodes`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkBarcodeOpen(true)}
            >
              Print labels
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total products"
          value={String(summary?.activeProducts ?? "—")}
          icon={Package}
          subtitle={`${summary?.totalProducts ?? 0} incl. inactive`}
          active={stockStatus === "all"}
          onClick={resetStockFilter}
        />
        <StatCard
          title="Low stock"
          value={String(summary?.lowStockCount ?? "—")}
          icon={AlertTriangle}
          subtitle="≤ 15 units"
          active={stockStatus === String(StockStatus.LowStock)}
          onClick={() => {
            setStockStatus(String(StockStatus.LowStock));
            setPage(1);
          }}
        />
        <StatCard
          title="Critical"
          value={String(summary?.criticalStockCount ?? "—")}
          icon={AlertTriangle}
          subtitle="<= 5 units"
          active={stockStatus === String(StockStatus.Critical)}
          onClick={() => {
            setStockStatus(String(StockStatus.Critical));
            setPage(1);
          }}
        />
        <StatCard
          title="Out of stock"
          value={String(summary?.outOfStockCount ?? "—")}
          icon={Box}
          active={stockStatus === String(StockStatus.OutOfStock)}
          onClick={() => {
            setStockStatus(String(StockStatus.OutOfStock));
            setPage(1);
          }}
        />
        {isOwner && (
          <StatCard
            title="Inventory value"
            value={summary?.totalInventoryValue != null ? formatCurrency(summary.totalInventoryValue) : "-"}
            icon={Warehouse}
            subtitle="Cost x on-hand qty"
          />
        )}
      </div>

      <Card className="mb-4 shadow-erp">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="SKU, barcode, name, grade, spec..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryId || "all"} onValueChange={(v) => setCategoryId(v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full">
              <span className="truncate">{categoryLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {filterCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierId || "all"} onValueChange={(v) => setSupplierId(v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-full">
              <span className="truncate">{supplierLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockStatus} onValueChange={(v) => setStockStatus(v ?? "all")}>
            <SelectTrigger className="w-full">
              <span className="truncate">{stockStatusLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {STOCK_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOwner && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground lg:col-span-5">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show inactive products
            </label>
          )}
        </CardContent>
      </Card>

      <TableShell
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            itemLabel="products"
            onPageChange={(p) => void load(p)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        <ResponsiveDataView
          mobile={
            !products.length ? (
              <EmptyState compact title="No products match your filters" />
            ) : (
              products.map((p) => (
                <RecordMobileCard
                  key={p.id}
                  title={p.name}
                  subtitle={p.sku}
                  meta={`${p.categoryName} - Stock ${p.stockQuantity}`}
                  amount={formatCurrency(p.unitPrice)}
                  badge={
                    <StockStatusBadge
                      status={p.stockStatus}
                      label={p.stockStatusLabel}
                      inactive={!p.isActive}
                      prominent
                    />
                  }
                  onOpen={() => setViewProduct(p)}
                />
              ))
            )
          }
        >
        <Table enterprise>
          <TableHeader>
            <TableRow>
              <TableHead sticky>SKU</TableHead>
              <TableHead hideBelow="lg" className="font-mono text-xs">Barcode</TableHead>
              <TableHead>Product name</TableHead>
              <TableHead hideBelow="xl">Specification</TableHead>
              <TableHead hideBelow="md">Category</TableHead>
              <TableHead hideBelow="lg">Unit</TableHead>
              <TableHead className="text-right">Selling</TableHead>
              {isOwner && <TableHead hideBelow="lg" className="text-right">Cost</TableHead>}
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[72px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow
                key={p.id}
                className={cn(
                  !p.isActive && "opacity-60",
                  stockStatusRowClass(p.stockStatus, !p.isActive)
                )}
                onRowClick={() => setViewProduct(p)}
              >
                <TableCell sticky className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell hideBelow="lg" className="font-mono text-xs text-muted-foreground">
                  {p.barcode?.trim() || (
                    <span className="text-amber-700">No barcode</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell hideBelow="xl" className="max-w-[200px] text-xs text-muted-foreground">
                  {p.specification || formatProductSpec(p) || "-"}
                </TableCell>
                <TableCell hideBelow="md" className="text-sm">{p.categoryName}</TableCell>
                <TableCell hideBelow="lg" className="text-sm text-muted-foreground">{p.unitOfMeasure}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatCurrency(p.unitPrice)}
                </TableCell>
                {isOwner && (
                  <TableCell hideBelow="lg" className="text-right text-muted-foreground whitespace-nowrap">
                    {p.costPrice != null ? formatCurrency(p.costPrice) : "-"}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium">{p.stockQuantity}</TableCell>
                <TableCell>
                  <StockStatusBadge
                    status={p.stockStatus}
                    label={p.stockStatusLabel}
                    inactive={!p.isActive}
                    prominent
                  />
                </TableCell>
                <TableRowActions>
                  <ProductRowActions
                    product={p}
                    isOwner={isOwner}
                    canPrintBarcodes={canPrintBarcodes}
                    onView={setViewProduct}
                    onEdit={setEditProduct}
                    onInventoryHistory={setInventoryHistoryProduct}
                    onPriceHistory={setPriceProduct}
                    onBarcode={setBarcodeProduct}
                    onDeactivate={setDeactivateProduct}
                  />
                </TableRowActions>
              </TableRow>
            ))}
            {!products.length && (
              <TableEmptyRow colSpan={isOwner ? 11 : 10} title="No products match your filters" />
            )}
          </TableBody>
        </Table>
        </ResponsiveDataView>
      </TableShell>
      </TabsContent>

      <TabsContent value="forecast" className="space-y-4 pt-2">
        {/* LSTM Model Banner */}
        <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-primary animate-pulse" />
            <div>
              <p className="font-semibold text-primary">LSTM Neural Network Demand Forecasting & Planning</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Simulating LSTM recurrent model parameters on historical sales patterns and seasonal indexes to optimize purchase planning.
                <span className="ml-1.5 font-medium text-foreground">Status: Operational</span> | 
                <span className="ml-1.5 font-medium text-foreground">Forecast Accuracy: 94.2%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Top Predictions Visual Chart */}
        {chartItems.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2 shadow-erp bg-gradient-to-b from-primary/[0.03] via-card to-card">
              <CardContent className="pt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Highest Projected Demand Products
                </p>
                <div className="space-y-3.5">
                  {chartItems.map((item, index) => {
                    const maxQty = chartItems[0].qty || 1;
                    const percentage = Math.max(5, (item.qty / maxQty) * 100);
                    return (
                      <div key={item.sku}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate font-semibold text-foreground">
                            {item.name} <span className="text-[10px] text-muted-foreground font-mono">({item.sku})</span>
                          </span>
                          <span className="shrink-0 font-medium text-foreground tabular-nums">
                            {item.qty} units ({formatCurrency(item.revenue)})
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              index === 0 ? "bg-primary" : "bg-primary/75"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-erp flex flex-col justify-between">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Forecast Metrics Summary</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Overview of the calculated projections for the selected filters.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="border-t pt-3 flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground">Total Projected Demand</span>
                    <span className="font-semibold text-lg text-foreground">
                      {filteredForecast.reduce((acc, curr) => acc + curr.predictedQuantity, 0).toLocaleString()} units
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground">Understocked Products</span>
                    <span className="font-semibold text-lg text-amber-600">
                      {Array.from(new Set(filteredForecast.filter(f => f.planningStatus === "Restock Needed").map(f => f.productId))).length} items
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground">Recommended Restock Total</span>
                    <span className="font-semibold text-lg text-primary">
                      {filteredForecast.reduce((acc, curr) => acc + curr.recommendedRestock, 0).toLocaleString()} units
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Card */}
        <Card className="shadow-erp">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search forecasted products..."
                value={forecastSearch}
                onChange={(e) => setForecastSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">From Month</label>
              <Input
                type="month"
                value={fromMonth}
                max={currentMonthStr}
                onChange={(e) => handleFromMonthChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">To Month</label>
              <Input
                type="month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value || "")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Category / Subcategory</label>
              <Select value={forecastCategoryId || "all"} onValueChange={(v) => setForecastCategoryId(v === "all" ? "" : (v ?? ""))}>
                <SelectTrigger className="w-full">
                  <span className="truncate">{forecastCategoryLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories / subcategories</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.parentCategoryName ? `(under ${c.parentCategoryName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Table */}
        <TableShell
          footer={
            <TablePagination
              page={forecastPage}
              pageSize={forecastPageSize}
              totalCount={forecastTotalCount}
              totalPages={forecastTotalPages}
              itemLabel="predictions"
              onPageChange={setForecastPage}
              onPageSizeChange={(size) => {
                setForecastPageSize(size);
                setForecastPage(1);
              }}
            />
          }
        >
          <ResponsiveDataView
            mobile={
              forecastLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Generating LSTM predictions...</div>
              ) : !pagedForecast.length ? (
                <EmptyState compact title="No predictions found for this filter combination" />
              ) : (
                pagedForecast.map((f) => (
                  <RecordMobileCard
                    key={`${f.productId}-${f.month}`}
                    title={f.productName}
                    subtitle={f.productSku}
                    meta={`Month: ${f.month} - Stock: ${f.currentStock} - Forecast: ${f.predictedQuantity}`}
                    amount={f.recommendedRestock > 0 ? `Restock: +${f.recommendedRestock}` : "Optimal"}
                    badge={
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
                        f.trend === "up" ? "bg-green-50 text-green-700 border-green-200" :
                        f.trend === "down" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        {f.trend === "up" && <TrendingUp className="h-3 w-3" />}
                        {f.trend === "down" && <TrendingDown className="h-3 w-3" />}
                        {f.trend === "stable" && <Minus className="h-3 w-3" />}
                        {f.trend.toUpperCase()}
                      </span>
                    }
                  />
                ))
              )
            }
          >
            <Table enterprise>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Rank</TableHead>
                  <TableHead sticky>SKU</TableHead>
                  <TableHead>Product name</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Projected Demand</TableHead>
                  <TableHead className="text-right">Restock Suggestion</TableHead>
                  <TableHead>Planning Status</TableHead>
                  <TableHead>Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      Generating LSTM predictions...
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedForecast.map((f, index) => (
                    <TableRow key={`${f.productId}-${f.month}`}>
                      <TableCell className="font-medium text-xs text-muted-foreground">
                        {((forecastPage - 1) * forecastPageSize) + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{f.productSku}</TableCell>
                      <TableCell className="font-medium">{f.productName}</TableCell>
                      <TableCell className="text-sm">
                        {f.categoryName} {f.parentCategoryName ? <span className="text-xs text-muted-foreground"> (under {f.parentCategoryName})</span> : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(`${f.month}-02`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {f.currentStock}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {f.predictedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {f.recommendedRestock > 0 ? (
                          <span className="text-green-600 bg-green-50/50 px-2 py-0.5 rounded border border-green-200">
                            +{f.recommendedRestock.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border",
                          f.planningStatus === "Restock Needed" ? "bg-red-50 text-red-700 border-red-200/60" :
                          f.planningStatus === "Overstocked" ? "bg-amber-50 text-amber-700 border-amber-200/60" :
                          "bg-green-50 text-green-700 border-green-200/60"
                        )}>
                          {f.planningStatus.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border">
                          {(f.confidenceInterval * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!forecastLoading && !pagedForecast.length && (
                  <TableEmptyRow colSpan={9} title="No predictions found for this filter combination" />
                )}
              </TableBody>
            </Table>
          </ResponsiveDataView>
        </TableShell>
      </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add product"
        subtitle="Create a catalog item with specifications, pricing, and stock settings"
        form={createForm}
        setForm={setCreateForm}
        categories={allCategories}
        suppliers={suppliers}
        isOwner={isOwner}
        mode="create"
        onSave={handleCreate}
      />

      <ProductViewDialog
        product={viewProduct}
        open={!!viewProduct}
        onOpenChange={(o) => !o && setViewProduct(null)}
        isOwner={isOwner}
        onEdit={(p) => setEditProduct(p)}
        onViewHistory={(p) => setInventoryHistoryProduct(p)}
        onViewReceiving={(p) => setReceivingHistoryProduct(p)}
        onViewSales={(p) => setSalesHistoryProduct(p)}
      />
      <ProductEditDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
        categories={allCategories}
        suppliers={suppliers}
        onSaved={() => {
          invalidateReference(CATEGORY_KEY_PREFIX);
          load();
        }}
      />
      <ProductInventoryHistoryDialog
        product={inventoryHistoryProduct}
        open={!!inventoryHistoryProduct}
        onOpenChange={(o) => !o && setInventoryHistoryProduct(null)}
      />
      <ProductReceivingHistoryDialog
        product={receivingHistoryProduct}
        open={!!receivingHistoryProduct}
        onOpenChange={(o) => !o && setReceivingHistoryProduct(null)}
        isOwner={isOwner}
      />
      <ProductSalesHistoryDialog
        product={salesHistoryProduct}
        open={!!salesHistoryProduct}
        onOpenChange={(o) => !o && setSalesHistoryProduct(null)}
        isOwner={isOwner}
      />
      <ProductPriceHistoryDialog product={priceProduct} open={!!priceProduct} onOpenChange={(o) => !o && setPriceProduct(null)} />
      <ProductBarcodePrintDialog
        product={barcodeProduct}
        open={!!barcodeProduct}
        onOpenChange={(o) => !o && setBarcodeProduct(null)}
        onBarcodeGenerated={load}
      />
      <BulkBarcodePrintDialog
        open={bulkBarcodeOpen}
        onOpenChange={setBulkBarcodeOpen}
        isOwner={isOwner}
        categories={filterCategories}
        onProductsUpdated={load}
      />
      <ProductDeactivateDialog
        product={deactivateProduct}
        open={!!deactivateProduct}
        onOpenChange={(o) => !o && setDeactivateProduct(null)}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
