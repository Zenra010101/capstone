"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Barcode,
  FileText,
  Printer,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { formatCurrency } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScannableBarcode } from "./scannable-barcode";
import { StockStatusBadge } from "./stock-status-badge";
import {
  DEFAULT_LABEL_OPTIONS,
  estimateLabelPages,
  LABEL_SIZE_OPTIONS,
  openBarcodePrintWindow,
  productsMissingBarcode,
  type BarcodeLabelOptions,
} from "./barcode-label-utils";

type CatalogFilter = "active" | "all" | "lowStock" | "missingBarcode";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  categories: Category[];
  onProductsUpdated: () => void;
};

function LabelPreview({
  product,
  options,
}: {
  product: Product | null;
  options: BarcodeLabelOptions;
}) {
  const barcode = product?.barcode?.trim() || "8901002001001";
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-white p-3 text-center shadow-inner">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Label preview
      </p>
      <div className="mx-auto max-w-[11rem] rounded border border-border/60 bg-muted/20 px-2 py-2">
        {options.showName && product ? (
          <p className="truncate text-[10px] font-semibold leading-tight">{product.name}</p>
        ) : options.showName ? (
          <p className="text-[10px] font-semibold text-muted-foreground">Product name</p>
        ) : null}
        {options.showSku && product ? (
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">SKU: {product.sku}</p>
        ) : null}
        {options.showCategory && product?.categoryName ? (
          <p className="mt-0.5 text-[9px] text-muted-foreground">{product.categoryName}</p>
        ) : null}
        {options.showUnit && product ? (
          <p className="mt-0.5 text-[9px] text-muted-foreground">Unit: {product.unitOfMeasure}</p>
        ) : null}
        {options.showPrice && product ? (
          <p className="mt-1 text-[10px] font-bold">{formatCurrency(product.unitPrice)}</p>
        ) : null}
        <ScannableBarcode value={barcode} size="sm" showHumanReadable className="mt-1" />
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        highlight ? "border-primary/25 bg-primary/5" : "border-border/60 bg-muted/25"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums tracking-tight", highlight && "text-primary")}>
        {value}
      </p>
    </div>
  );
}

export function BulkBarcodePrintDialog({
  open,
  onOpenChange,
  isOwner,
  categories,
  onProductsUpdated,
}: Props) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<BarcodeLabelOptions>(DEFAULT_LABEL_OPTIONS);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("activeOnly", "false");
      const rows = await api.get<ListResponse<Product>>(`/api/products?${params}`);
      setCatalog(asList(rows));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load products");
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch("");
      setCategoryFilter("");
      setCatalogFilter("active");
      setOptions(DEFAULT_LABEL_OPTIONS);
      return;
    }
    void loadCatalog();
  }, [open, loadCatalog]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((p) => {
      if (catalogFilter === "active" && !p.isActive) return false;
      if (catalogFilter === "lowStock" && (!p.isActive || !p.isLowStock)) return false;
      if (catalogFilter === "missingBarcode" && (!p.isActive || !!p.barcode?.trim())) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (!term) return true;
      return (
        p.sku.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        (p.barcode?.toLowerCase().includes(term) ?? false) ||
        p.categoryName.toLowerCase().includes(term)
      );
    });
  }, [catalog, search, categoryFilter, catalogFilter]);

  const selectedProducts = useMemo(
    () => catalog.filter((p) => selectedIds.has(p.id)),
    [catalog, selectedIds]
  );

  const previewProduct = selectedProducts.find((p) => p.barcode?.trim()) ?? filtered[0] ?? null;
  const categoryFilterLabel =
    !categoryFilter
      ? "All categories"
      : categories.find((c) => c.id === categoryFilter)?.name ?? "All categories";
  const missingInSelection = productsMissingBarcode(selectedProducts);
  const readyCount = selectedProducts.filter((p) => p.barcode?.trim()).length;
  const totalLabels = readyCount * options.copiesPerProduct;
  const estimatedPages = estimateLabelPages(totalLabels, options.size);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const selectAllMissingBarcodes = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      catalog.forEach((p) => {
        if (p.isActive && !p.barcode?.trim()) next.add(p.id);
      });
      return next;
    });
    setCatalogFilter("missingBarcode");
    toast.message("Selected all active products without a barcode");
  };

  const generateAllMissingActive = async () => {
    if (!isOwner) return;
    setGenerating(true);
    try {
      const result = await api.post<{ generatedCount: number }>(
        "/api/products/generate-missing-barcodes",
        {}
      );
      if (!result.generatedCount) {
        toast.message("Every active product already has a barcode");
        return;
      }
      toast.success(`Generated ${result.generatedCount} barcode${result.generatedCount === 1 ? "" : "s"}`);
      await loadCatalog();
      onProductsUpdated();
      setCatalogFilter("missingBarcode");
      setSelectedIds(
        new Set(
          catalog
            .filter((p) => p.isActive && p.barcode?.trim())
            .map((p) => p.id)
        )
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Barcode generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const generateMissing = async () => {
    if (!isOwner) return;
    const targets = missingInSelection;
    if (!targets.length) {
      toast.message("All selected products already have barcodes");
      return;
    }
    setGenerating(true);
    let ok = 0;
    try {
      for (const p of targets) {
        await api.post(`/api/products/${p.id}/generate-barcode`, {});
        ok++;
      }
      toast.success(`Generated ${ok} barcode${ok === 1 ? "" : "s"}`);
      await loadCatalog();
      onProductsUpdated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Barcode generation failed");
      if (ok > 0) {
        await loadCatalog();
        onProductsUpdated();
      }
    } finally {
      setGenerating(false);
    }
  };

  const runPrint = (mode: "print" | "pdf") => {
    const ready = selectedProducts.filter((p) => p.barcode?.trim());
    if (!ready.length) {
      toast.error("Select products with barcodes, or generate barcodes first");
      return;
    }
    if (missingInSelection.length) {
      toast.error(`${missingInSelection.length} selected product(s) still need barcodes`);
      return;
    }
    const opened = openBarcodePrintWindow(ready, options, mode);
    if (!opened) {
      toast.error("Allow pop-ups to print labels");
      return;
    }
    if (mode === "pdf") {
      toast.message("Use Print → Save as PDF in the preview window");
    }
  };

  const sheetOptions = LABEL_SIZE_OPTIONS.filter((s) => s.group === "sheet");
  const thermalOptions = LABEL_SIZE_OPTIONS.filter((s) => s.group === "thermal");
  const sizeHint = LABEL_SIZE_OPTIONS.find((s) => s.value === options.size)?.hint;

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-4 py-2.5 sm:px-5">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                <span className="flex size-7 items-center justify-center rounded-md border border-border/70 bg-muted/40">
                  <Barcode className="size-3.5 text-primary" />
                </span>
                Bulk barcode printing
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Generate missing barcodes in bulk, then print labels or save as PDF.
              </p>
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  disabled={generating}
                  onClick={() => void generateAllMissingActive()}
                >
                  <Sparkles className="mr-1 size-3" />
                  {generating ? "Generating…" : "Generate barcodes for ALL active products missing one"}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_19.5rem]">
          {/* LEFT — selection workspace */}
          <div className="flex min-h-0 flex-col border-b bg-muted/10 lg:border-b-0 lg:border-r">
            {/* Toolbar */}
            <div className="shrink-0 space-y-2 border-b bg-card px-3 py-2.5 sm:px-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 text-sm"
                    placeholder="Search SKU, name, barcode, category…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={categoryFilter || "all"}
                  onValueChange={(v) => setCategoryFilter(v === "all" ? "" : (v ?? ""))}
                >
                  <SelectTrigger className="h-8 w-full shrink-0 text-xs sm:w-[11rem]">
                    <span className="truncate">{categoryFilterLabel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex rounded-md border border-border/70 bg-muted/30 p-0.5">
                  <button
                    type="button"
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      catalogFilter === "active"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCatalogFilter("active")}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      catalogFilter === "all"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCatalogFilter("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      catalogFilter === "lowStock"
                        ? "bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-300/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCatalogFilter("lowStock")}
                  >
                    Low stock
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      catalogFilter === "missingBarcode"
                        ? "bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-300/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setCatalogFilter("missingBarcode")}
                  >
                    No barcode
                  </button>
                </div>
                <span className="hidden h-4 w-px bg-border sm:inline" />
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selectAllMissingBarcodes}>
                  Select all missing
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={toggleAllFiltered}>
                  {allFilteredSelected ? "Deselect filtered" : "Select filtered"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearSelection}
                  disabled={!selectedIds.size}
                >
                  Clear
                </Button>
              </div>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {categories.map((c) => {
                    const active = categoryFilter === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryFilter(active ? "" : c.id)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* List header */}
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/20 px-3 py-1.5 sm:px-4">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span> shown
                {selectedIds.size ? (
                  <>
                    {" · "}
                    <span className="font-medium text-primary">{selectedIds.size}</span> selected
                  </>
                ) : null}
              </p>
              <button
                type="button"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={toggleAllFiltered}
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Product list */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
              {loading ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Loading catalog…</p>
              ) : !filtered.length ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No products match your filters
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map((p) => {
                    const checked = selectedIds.has(p.id);
                    const hasBarcode = !!p.barcode?.trim();
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
                            checked
                              ? "border-primary/35 bg-primary/[0.06] shadow-sm ring-1 ring-primary/15"
                              : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 shrink-0 rounded border-input accent-primary"
                            checked={checked}
                            onChange={(e) => toggleOne(p.id, e.target.checked)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight" title={p.name}>
                                {p.name}
                              </p>
                              <StockStatusBadge
                                status={p.stockStatus}
                                label={p.stockStatusLabel}
                                inactive={!p.isActive}
                                inactiveLabel="Archived"
                              />
                            </div>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.sku}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Badge
                                variant="outline"
                                className="h-4 rounded px-1.5 text-[9px] font-normal text-muted-foreground"
                              >
                                {p.categoryName}
                              </Badge>
                              {hasBarcode ? (
                                <span className="font-mono text-[10px] text-muted-foreground/80">
                                  {p.barcode}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-amber-800">No barcode</span>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT — sticky print settings */}
          <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-muted/25 px-3 py-3 sm:px-4">
            <div className="space-y-3 lg:sticky lg:top-0">
              <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Label layout
                </h3>
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Format</Label>
                    <Select
                      value={options.size}
                      onValueChange={(v) =>
                        setOptions((o) => ({
                          ...o,
                          size: (v ?? "sheet") as BarcodeLabelOptions["size"],
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Sheet labels</SelectLabel>
                          {sheetOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Thermal labels</SelectLabel>
                          {thermalOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {sizeHint ? (
                      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{sizeHint}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Copies per product</Label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      className="mt-1 h-8 text-sm"
                      value={options.copiesPerProduct}
                      onChange={(e) =>
                        setOptions((o) => ({
                          ...o,
                          copiesPerProduct: Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1)),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <LabelPreview product={previewProduct} options={options} />
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Display options
                </h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                  {(
                    [
                      ["showName", "Name"],
                      ["showSku", "SKU"],
                      ["showPrice", "Price"],
                      ["showUnit", "Unit"],
                      ["showCategory", "Category"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                        options[key]
                          ? "border-primary/30 bg-primary/5 font-medium text-foreground"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-3 rounded border-input accent-primary"
                        checked={options[key]}
                        onChange={(e) =>
                          setOptions((o) => ({ ...o, [key]: e.target.checked }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Selection summary
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  <SummaryMetric label="Products" value={String(selectedProducts.length)} />
                  <SummaryMetric label="Labels" value={String(totalLabels)} highlight />
                  <SummaryMetric label="Pages" value={String(estimatedPages)} />
                </div>
                {missingInSelection.length ? (
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-900">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    <span>{missingInSelection.length} selected without barcode</span>
                  </div>
                ) : null}
                {isOwner && missingInSelection.length ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 w-full text-xs"
                    disabled={generating}
                    onClick={() => void generateMissing()}
                  >
                    <Sparkles className="mr-1 size-3" />
                    {generating ? "Generating…" : "Generate missing barcodes"}
                  </Button>
                ) : null}
              </section>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t bg-card px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[11px] text-muted-foreground">
            {selectedProducts.length
              ? `${readyCount} ready · ${totalLabels} label${totalLabels === 1 ? "" : "s"} · ~${estimatedPages} page${estimatedPages === 1 ? "" : "s"}`
              : "Select products to print"}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="mr-1 size-3.5" />
              Close
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => runPrint("pdf")}>
              <FileText className="mr-1.5 size-3.5" />
              Export PDF
            </Button>
            <Button type="button" size="sm" className="min-w-[7.5rem]" onClick={() => runPrint("print")}>
              <Printer className="mr-1.5 size-3.5" />
              Print labels
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
