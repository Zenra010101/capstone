"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  PackagePlus,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatProductSpec } from "@/lib/format";
import type { DuplicateReferenceCheck, Product, Supplier } from "@/lib/types";
import { StockReceivingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { ReceivingStatusBadge } from "./receiving-status-badge";

type LineItem = {
  productId: string;
  quantity: string;
  expectedQuantity: string;
  costPrice: string;
  sellingPrice: string;
  remarks: string;
};

const emptyLine = (): LineItem => ({
  productId: "",
  quantity: "1",
  expectedQuantity: "",
  costPrice: "",
  sellingPrice: "",
  remarks: "",
});

const COST_VARIANCE_THRESHOLD = 0.15;

function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-foreground/90">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3 border-b border-border/60 pb-2.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function isAbnormalCost(product: Product | undefined, cost: number): boolean {
  if (!product?.costPrice || product.costPrice <= 0 || cost <= 0) return false;
  return Math.abs(cost - product.costPrice) / product.costPrice > COST_VARIANCE_THRESHOLD;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliers: Supplier[];
  products: Product[];
  onSubmitted: () => void;
  initialSupplierId?: string;
  initialProductId?: string;
};

export function ReceivingRequestDialog({
  open,
  onOpenChange,
  suppliers,
  products,
  onSubmitted,
  initialSupplierId,
  initialProductId,
}: Props) {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");

  const [form, setForm] = useState({
    supplierId: "",
    containerNumber: "",
    stockNumber: "",
    referenceNumber: "",
    deliveryReceiptNumber: "",
    deliveryDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const initialLine = (): LineItem => ({
    ...emptyLine(),
    productId: initialProductId ?? "",
  });
  const [lines, setLines] = useState<LineItem[]>([initialLine()]);
  const [dupWarning, setDupWarning] = useState<DuplicateReferenceCheck | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of activeProducts) map.set(p.id, p);
    return map;
  }, [activeProducts]);

  const productOptions = useMemo(
    () =>
      activeProducts.map((p) => ({
        value: p.id,
        label: `${p.sku} — ${p.name}`,
        searchText: `${p.sku} ${p.name} ${p.barcode ?? ""} ${formatProductSpec(p)}`,
      })),
    [activeProducts]
  );

  const checkDuplicates = useCallback(async () => {
    if (!form.referenceNumber.trim() && !form.deliveryReceiptNumber.trim()) {
      setDupWarning(null);
      return;
    }
    setCheckingDup(true);
    try {
      const params = new URLSearchParams();
      if (form.referenceNumber.trim()) params.set("referenceNumber", form.referenceNumber.trim());
      if (form.deliveryReceiptNumber.trim()) {
        params.set("deliveryReceiptNumber", form.deliveryReceiptNumber.trim());
      }
      const result = await api.get<DuplicateReferenceCheck>(
        `/api/stockreceiving/validate-references?${params}`
      );
      setDupWarning(result);
    } catch {
      setDupWarning(null);
    } finally {
      setCheckingDup(false);
    }
  }, [form.referenceNumber, form.deliveryReceiptNumber]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(checkDuplicates, 400);
    return () => clearTimeout(t);
  }, [open, checkDuplicates]);

  useEffect(() => {
    if (open && initialSupplierId) {
      setForm((f) => ({ ...f, supplierId: initialSupplierId }));
    }
  }, [open, initialSupplierId]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      document.getElementById("receiving-supplier-select")?.focus();
    });
  }, [open]);

  const reset = () => {
    setForm({
      supplierId: "",
      containerNumber: "",
      stockNumber: "",
      referenceNumber: "",
      deliveryReceiptNumber: "",
      deliveryDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setLines([initialLine()]);
    setDupWarning(null);
    setSubmitting(false);
  };

  const lineTotal = (line: LineItem) => {
    const qty = parseInt(line.quantity, 10);
    const cost = parseFloat(line.costPrice);
    if (Number.isNaN(qty) || Number.isNaN(cost)) return 0;
    return qty * cost;
  };

  const summary = useMemo(() => {
    const valid = lines.filter((l) => l.productId && parseInt(l.quantity, 10) > 0);
    const totalQty = valid.reduce((sum, l) => sum + parseInt(l.quantity, 10), 0);
    const totalValue = valid.reduce((sum, l) => sum + lineTotal(l), 0);
    return {
      productCount: new Set(valid.map((l) => l.productId)).size,
      totalQty,
      totalValue,
    };
  }, [lines]);

  const hasDuplicate =
    dupWarning?.referenceNumberExists || dupWarning?.deliveryReceiptNumberExists;

  const hasAbnormalCosts = useMemo(
    () =>
      lines.some((l) => {
        if (!l.productId) return false;
        const cost = parseFloat(l.costPrice);
        if (Number.isNaN(cost) || cost <= 0) return false;
        return isAbnormalCost(productById.get(l.productId), cost);
      }),
    [lines, productById]
  );

  const updateLine = (index: number, patch: Partial<LineItem>) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const onProductPick = (index: number, productId: string) => {
    if (!productId) {
      updateLine(index, { productId: "" });
      return;
    }

    const existingIndex = lines.findIndex((l, i) => i !== index && l.productId === productId);
    if (existingIndex >= 0) {
      const addQty = parseInt(lines[index].quantity, 10) || 1;
      const existingQty = parseInt(lines[existingIndex].quantity, 10) || 0;
      setLines((prev) => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: String(existingQty + addQty),
        };
        next.splice(index, 1);
        return next.length ? next : [emptyLine()];
      });
      toast.info("Product already on this receipt — quantities merged");
      return;
    }

    const product = productById.get(productId);
    const next = [...lines];
    next[index] = {
      ...next[index],
      productId,
      costPrice:
        next[index].costPrice ||
        (product?.costPrice != null ? String(product.costPrice) : ""),
      sellingPrice:
        next[index].sellingPrice ||
        (product?.unitPrice != null ? String(product.unitPrice) : ""),
    };
    setLines(next);
  };

  const submit = async () => {
    if (
      !form.supplierId ||
      !form.containerNumber.trim() ||
      !form.stockNumber.trim() ||
      !form.referenceNumber.trim()
    ) {
      toast.error("Supplier, container, stock #, and reference # are required");
      return;
    }
    if (hasDuplicate) {
      toast.error("Resolve duplicate reference or delivery receipt numbers before submitting");
      return;
    }

    const items = lines
      .filter((l) => l.productId && parseInt(l.quantity, 10) > 0)
      .map((l) => {
        const product = productById.get(l.productId);
        const cost = parseFloat(l.costPrice);
        const sellingPrice = parseFloat(l.sellingPrice);
        const expected = l.expectedQuantity ? parseInt(l.expectedQuantity, 10) : undefined;
        return {
          productId: l.productId,
          quantity: parseInt(l.quantity, 10),
          expectedQuantity: expected && !Number.isNaN(expected) ? expected : undefined,
          costPrice: !Number.isNaN(cost) && cost > 0 ? cost : (product?.costPrice ?? 0),
          sellingPrice:
            !Number.isNaN(sellingPrice) && sellingPrice > 0
              ? sellingPrice
              : (product?.unitPrice ?? 0),
          remarks: l.remarks.trim() || undefined,
        };
      });

    if (!items.length) {
      toast.error("Add at least one product line with delivered quantity");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/stockreceiving", {
        ...form,
        deliveryReceiptNumber: form.deliveryReceiptNumber.trim() || undefined,
        deliveryDate: new Date(form.deliveryDate).toISOString(),
        notes: form.notes.trim() || undefined,
        items,
      });
      toast.success("Receiving request submitted — awaiting owner approval");
      reset();
      onOpenChange(false);
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (!submitting && !hasDuplicate) void submit();
  };

  const canSubmit =
    form.supplierId &&
    form.containerNumber.trim() &&
    form.stockNumber.trim() &&
    form.referenceNumber.trim() &&
    summary.productCount > 0 &&
    !hasDuplicate &&
    !submitting;

  return (
    <Dialog
      dismissible
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        size="workspace"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                  Stock Receiving Request
                </DialogTitle>
                <ReceivingStatusBadge
                  status={StockReceivingStatus.Pending}
                  label="Pending Owner Approval"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted receiving requests require owner approval before inventory is updated.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onKeyDown={handleKeyDown}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-3 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium">Approval-based receiving</p>
                <p className="mt-0.5 leading-snug">
                  Inventory, valuation, and movement records are created only after owner review
                  and approval. All submissions are audit-logged.
                </p>
              </div>
            </div>

            <Section
              title="Delivery information"
              description="Document-level receiving metadata from supplier delivery"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Supplier" required className="sm:col-span-2 lg:col-span-3">
                  <OptionSelect
                    triggerId="receiving-supplier-select"
                    value={form.supplierId}
                    onValueChange={(v) => setForm({ ...form, supplierId: v })}
                    searchable
                    searchPlaceholder="Search supplier name..."
                    placeholder="Select supplier"
                    options={suppliers
                      .filter((s) => s.isActive)
                      .map((s) => ({
                        value: s.id,
                        label: s.name,
                        searchText: `${s.name} ${s.contactPerson ?? ""}`,
                      }))}
                  />
                </Field>
                <Field label="Delivery date" required>
                  <Input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="h-9"
                  />
                </Field>
                <Field label="Container number" required>
                  <Input
                    value={form.containerNumber}
                    onChange={(e) => setForm({ ...form, containerNumber: e.target.value })}
                    className="h-9"
                  />
                </Field>
                <Field label="Stock number" required>
                  <Input
                    value={form.stockNumber}
                    onChange={(e) => setForm({ ...form, stockNumber: e.target.value })}
                    className="h-9"
                  />
                </Field>
                <Field label="Reference number" required>
                  <Input
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    className="h-9"
                  />
                </Field>
                <Field label="Delivery receipt #">
                  <Input
                    value={form.deliveryReceiptNumber}
                    onChange={(e) =>
                      setForm({ ...form, deliveryReceiptNumber: e.target.value })
                    }
                    className="h-9"
                  />
                </Field>
              </div>

              {hasDuplicate && !checkingDup ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    {dupWarning?.referenceNumberExists ? (
                      <p>
                        Reference number already used
                        {dupWarning.existingReceivingNumber
                          ? ` on ${dupWarning.existingReceivingNumber}`
                          : ""}
                        .
                      </p>
                    ) : null}
                    {dupWarning?.deliveryReceiptNumberExists ? (
                      <p>
                        Delivery receipt number already used
                        {dupWarning.existingReceivingNumber
                          ? ` on ${dupWarning.existingReceivingNumber}`
                          : ""}
                        .
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </Section>

            <Section
              title="Delivery notes"
              description="Seal condition, packaging, delays, or incomplete delivery remarks"
            >
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Seal intact, minor dents on outer cartons, 2 pallets delayed..."
                rows={3}
                className="flex min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </Section>

            <Section
              title="Delivered products"
              description="Line items for this receiving — search by SKU, barcode, or product name"
            >
              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur-sm">
                    <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2.5 font-medium">Product</th>
                      <th className="w-24 px-2 py-2.5 font-medium">Delivered</th>
                      <th className="w-24 px-2 py-2.5 font-medium">Expected</th>
                      <th className="w-28 px-2 py-2.5 font-medium">Cost / unit</th>
                      <th className="w-28 px-2 py-2.5 font-medium">Selling price</th>
                      <th className="w-28 px-2 py-2.5 text-right font-medium">Line total</th>
                      <th className="min-w-[120px] px-2 py-2.5 font-medium">Remarks</th>
                      <th className="w-10 px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {lines.map((line, i) => {
                      const product = line.productId
                        ? productById.get(line.productId)
                        : undefined;
                      const cost = parseFloat(line.costPrice);
                      const abnormal =
                        product && !Number.isNaN(cost) && isAbnormalCost(product, cost);

                      return (
                        <tr key={i} className="align-top bg-card/50">
                          <td className="px-2 py-2">
                            <OptionSelect
                              value={line.productId}
                              onValueChange={(v) => onProductPick(i, v)}
                              searchable
                              searchPlaceholder="SKU, barcode, or name..."
                              placeholder="Select product"
                              options={productOptions}
                              triggerClassName="h-9"
                            />
                            {product ? (
                              <div className="mt-1.5 space-y-0.5 rounded-md border border-border/50 bg-muted/25 px-2 py-1.5 text-[11px]">
                                <p>
                                  <span className="text-muted-foreground">Current stock:</span>{" "}
                                  <span className="font-semibold tabular-nums">
                                    {product.stockQuantity} {product.unitOfMeasure}
                                  </span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Last cost:</span>{" "}
                                  <span className="font-medium tabular-nums">
                                    {product.costPrice != null
                                      ? formatCurrency(product.costPrice)
                                      : "—"}
                                  </span>
                                </p>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={line.quantity}
                              onChange={(e) => updateLine(i, { quantity: e.target.value })}
                              className="h-9 tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={line.expectedQuantity}
                              onChange={(e) =>
                                updateLine(i, { expectedQuantity: e.target.value })
                              }
                              className="h-9 tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.costPrice}
                              readOnly={!isOwner}
                              disabled={!isOwner}
                              onChange={(e) => updateLine(i, { costPrice: e.target.value })}
                              className={cn(
                                "h-9 tabular-nums",
                                !isOwner && "bg-muted/50",
                                abnormal && "border-amber-400 ring-amber-200/50"
                              )}
                            />
                            {abnormal ? (
                              <p className="mt-1 text-[10px] font-medium text-amber-800">
                                Unusual vs last cost — owner review
                              </p>
                            ) : !isOwner ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Locked to last recorded cost
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.sellingPrice}
                              readOnly={!isOwner}
                              disabled={!isOwner}
                              onChange={(e) => updateLine(i, { sellingPrice: e.target.value })}
                              className={cn("h-9 tabular-nums", !isOwner && "bg-muted/50")}
                            />
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Applies only to this batch
                            </p>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <p className="flex h-9 items-center justify-end font-medium tabular-nums">
                              {formatCurrency(lineTotal(line))}
                            </p>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={line.remarks}
                              onChange={(e) => updateLine(i, { remarks: e.target.value })}
                              placeholder="Optional"
                              className="h-9"
                            />
                          </td>
                          <td className="px-2 py-2">
                            {lines.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  setLines((prev) => {
                                    const next = prev.filter((_, j) => j !== i);
                                    return next.length ? next : [emptyLine()];
                                  })
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add product line
                </Button>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border bg-muted/40 px-2.5 py-1.5 tabular-nums">
                    <span className="text-muted-foreground">Products:</span>{" "}
                    <strong>{summary.productCount}</strong>
                  </span>
                  <span className="rounded-md border bg-muted/40 px-2.5 py-1.5 tabular-nums">
                    <span className="text-muted-foreground">Total qty:</span>{" "}
                    <strong>{summary.totalQty}</strong>
                  </span>
                  <span className="rounded-md border bg-primary/5 px-2.5 py-1.5 tabular-nums">
                    <span className="text-muted-foreground">Receiving value:</span>{" "}
                    <strong>{formatCurrency(summary.totalValue)}</strong>
                  </span>
                </div>
              </div>

              {hasAbnormalCosts ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-800">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  One or more line costs differ significantly from last recorded cost — flagged for
                  owner review.
                </p>
              ) : null}
            </Section>
          </div>

          <DialogFooter
            showCloseButton={false}
            className="shrink-0 border-t bg-card px-4 py-3 sm:px-5"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Submitting…" : "Submit Receiving Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
