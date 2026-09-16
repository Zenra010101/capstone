"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  ClipboardCopy,
  History,
  Package,
  PackagePlus,
  Pencil,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import type { Product, ProductMovement } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StockStatusBadge } from "./stock-status-badge";
import {
  getProductSpecPills,
  summarizeProductActivity,
  type ProductActivitySummary,
} from "./product-view-utils";
import { ProductBatchesPanel } from "./product-batches-panel";
import { ScannableBarcode } from "./scannable-barcode";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: boolean;
  onEdit?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
  onViewReceiving?: (product: Product) => void;
  onViewSales?: (product: Product) => void;
};

function InfoRow({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-sm font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        highlight
          ? "border-primary/25 bg-primary/5 shadow-sm"
          : "border-border/70 bg-muted/20"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-base font-semibold tabular-nums tracking-tight",
          highlight && "text-primary"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ProductViewDialog({
  product,
  open,
  onOpenChange,
  isOwner,
  onEdit,
  onViewHistory,
  onViewReceiving,
  onViewSales,
}: Props) {
  const [activity, setActivity] = useState<ProductActivitySummary>({});
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!product || !open) {
      setActivity({});
      return;
    }
    setLoadingActivity(true);
    api
      .get<ProductMovement[]>(`/api/products/${product.id}/movements`)
      .then((rows) => setActivity(summarizeProductActivity(rows)))
      .catch(() => setActivity({}))
      .finally(() => setLoadingActivity(false));
  }, [product, open]);

  if (!product) return null;

  const specPills = getProductSpecPills(product);
  const inventoryValue =
    product.inventoryValue ??
    (product.costPrice != null ? product.costPrice * product.stockQuantity : null);

  const copyBarcode = async () => {
    if (!product.barcode) return;
    const ok = await copyTextToClipboard(product.barcode);
    if (ok) {
      toast.success("Barcode copied — paste into POS scan box (Ctrl+V)");
    } else {
      toast.error("Could not copy — select and copy the code manually");
    }
  };

  const runAction = (fn?: (p: Product) => void) => {
    if (!fn) return;
    const selectedProduct = product;
    onOpenChange(false);
    // Let Base UI finish removing this dialog before mounting another portal.
    // Opening both in the same React update can trigger a DOM cleanup error.
    window.setTimeout(() => fn(selectedProduct), 150);
  };

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="workspace"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/30 text-muted-foreground">
                <Package className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
                  {product.name}
                </DialogTitle>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-5 text-[11px] font-medium">
                    {product.categoryName}
                  </Badge>
                  <StockStatusBadge
                    status={product.stockStatus}
                    label={product.stockStatusLabel}
                    inactive={!product.isActive}
                    inactiveLabel="Archived"
                  />
                </div>
                {product.barcode ? (
                  <div className="mt-2.5 flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/25 px-2.5 py-2">
                    <ScannableBarcode
                      value={product.barcode}
                      size="sm"
                      showHumanReadable={false}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs tracking-widest">{product.barcode}</p>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Code 128 — paste into POS or print a label
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 px-2.5"
                      onClick={copyBarcode}
                    >
                      <ClipboardCopy className="mr-1 size-3.5" />
                      Copy
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              {product.isActive ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    window.location.assign(
                      `/stock-receiving?create=1&productId=${encodeURIComponent(product.id)}`
                    )
                  }
                >
                  <PackagePlus className="mr-1.5 size-3.5" />
                  Add batch
                </Button>
              ) : null}
              {isOwner && onEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={() => runAction(onEdit)}>
                  <Pencil className="mr-1.5 size-3.5" />
                  Edit product
                </Button>
              ) : null}
              {onViewHistory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runAction(onViewHistory)}
                >
                  <History className="mr-1.5 size-3.5" />
                  Inventory history
                </Button>
              ) : null}
              {onViewReceiving ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => runAction(onViewReceiving)}
                >
                  <Truck className="mr-1.5 size-3.5" />
                  Receiving history
                </Button>
              ) : null}
              {onViewSales ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => runAction(onViewSales)}
                >
                  <ShoppingCart className="mr-1.5 size-3.5" />
                  Sales history
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-2 lg:overflow-hidden">
          <div className="space-y-3 border-b bg-muted/15 px-4 py-4 sm:px-5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r">
            <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
              <h3 className="mb-2.5 border-b border-border/60 pb-2 text-sm font-semibold tracking-tight">
                Product information
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Product name" value={product.name} />
                <InfoRow label="SKU" value={product.sku} mono />
                <InfoRow label="Category" value={product.categoryName} />
                <InfoRow label="Unit" value={product.unitOfMeasure} />
                {product.supplierName ? (
                  <InfoRow
                    label="Supplier"
                    value={product.supplierName}
                    className="sm:col-span-2"
                  />
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Specifications
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {specPills.length ? (
                      specPills.map((pill) => (
                        <Badge
                          key={pill}
                          variant="outline"
                          className="h-6 rounded-md bg-muted/40 px-2 text-[11px] font-medium"
                        >
                          {pill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                {product.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Description
                    </dt>
                    <dd className="mt-1 max-w-prose text-sm leading-relaxed text-foreground/90">
                      {product.description}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
  <div className="mb-2.5 flex items-center justify-between border-b border-border/60 pb-2">
    <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <Building2 className="size-4 text-muted-foreground" />
      Interbranch Price Comparison
    </h3>

    <Badge
      variant="outline"
      className="font-mono text-[10px] text-muted-foreground"
    >
      Mock Data
    </Badge>
  </div>

  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
    Comparison of old and new batch selling prices across branches.
    This helps identify price increases between batches and branches.
  </p>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[520px] text-left text-xs">
      <thead>
        <tr className="border-b border-border/60 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <th className="px-2.5 py-2">Branch</th>
          <th className="px-2.5 py-2 text-right">Old Batch</th>
          <th className="px-2.5 py-2 text-right">New Batch</th>
          <th className="px-2.5 py-2 text-right">Difference</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-border/40">
        {[
          {
            branch: "Branch 1",
            oldPrice: 1000,
            newPrice: 1100,
          },
          {
            branch: "Branch 2",
            oldPrice: 1050,
            newPrice: 1150,
          },
          {
            branch: "Branch 3",
            oldPrice: 1000,
            newPrice: 1200,
          },
          {
            branch: "Branch 4",
            oldPrice: 980,
            newPrice: 1080,
          },
        ].map((item) => {
          const difference = item.newPrice - item.oldPrice;

          return (
            <tr key={item.branch} className="hover:bg-muted/30">
              <td className="px-2.5 py-2 font-medium text-foreground">
                {item.branch}
              </td>

              <td className="px-2.5 py-2 text-right font-mono tabular-nums">
                {formatCurrency(item.oldPrice)}
              </td>

              <td className="px-2.5 py-2 text-right font-mono font-semibold tabular-nums">
                {formatCurrency(item.newPrice)}
              </td>

              <td className="px-2.5 py-2 text-right">
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    difference > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : difference < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  )}
                >
                  {difference > 0 ? "+" : ""}
                  {formatCurrency(difference)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>
          </div>

          <div className="space-y-3 bg-muted/20 px-4 py-4 sm:px-5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
            <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
              <h3 className="mb-2.5 border-b border-border/60 pb-2 text-sm font-semibold tracking-tight">
                Inventory & financial summary
              </h3>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Current stock
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">
                    {product.stockQuantity}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {product.unitOfMeasure}
                    </span>
                  </p>
                </div>
                <StockStatusBadge
                  status={product.stockStatus}
                  label={product.stockStatusLabel}
                  inactive={!product.isActive}
                  inactiveLabel="Archived"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <MetricCard
                  label="Selling price"
                  value={formatCurrency(product.unitPrice)}
                  sub={`per ${product.unitOfMeasure}`}
                />
                {isOwner && product.costPrice != null ? (
                  <MetricCard label="Cost price" value={formatCurrency(product.costPrice)} />
                ) : null}
                {isOwner && product.marginPercent != null ? (
                  <MetricCard label="Margin" value={`${product.marginPercent.toFixed(1)}%`} />
                ) : null}
                {isOwner && inventoryValue != null ? (
                  <MetricCard
                    label="Inventory value"
                    value={formatCurrency(inventoryValue)}
                    sub={`${product.stockQuantity} ${product.unitOfMeasure} on hand`}
                    highlight
                  />
                ) : null}
              </div>

              {product.isLowStock && product.isActive ? (
                <p className="mt-2.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                  Low stock — review replenishment or receiving
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm">
              <h3 className="mb-2.5 border-b border-border/60 pb-2 text-sm font-semibold tracking-tight">
                Product activity
              </h3>
              {loadingActivity ? (
                <p className="text-xs text-muted-foreground">Loading activity…</p>
              ) : (
                <dl className="grid gap-2.5 sm:grid-cols-3">
                  <InfoRow
                    label="Last received"
                    value={
                      activity.lastReceived
                        ? formatDateOnly(activity.lastReceived)
                        : "No record"
                    }
                  />
                  <InfoRow
                    label="Last sold"
                    value={
                      activity.lastSold ? formatDateOnly(activity.lastSold) : "No record"
                    }
                  />
                  <InfoRow
                    label="Last adjustment"
                    value={
                      activity.lastAdjustment
                        ? formatDateOnly(activity.lastAdjustment)
                        : "No record"
                    }
                  />
                </dl>
              )}
              <p className="mt-2.5 text-[10px] leading-snug text-muted-foreground">
                Derived from inventory movement history. Full ledger available via inventory
                history.
              </p>
            </section>
          </div>
        </div>

        <div className="flex max-h-[min(18rem,32vh)] shrink-0 flex-col border-t bg-muted/10 px-4 py-3 sm:px-5">
          <ProductBatchesPanel product={product} isOwner={isOwner} className="flex min-h-0 flex-1 flex-col" />
        </div>

        <div className="shrink-0 border-t bg-card px-5 py-2.5 text-[11px] text-muted-foreground">
          Stock changes are managed in Inventory and Receiving. This view is master catalog and
          operational intelligence.
        </div>
      </DialogContent>
    </Dialog>
  );
}
