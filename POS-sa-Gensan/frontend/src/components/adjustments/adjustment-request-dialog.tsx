"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ClipboardList, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatProductSpec } from "@/lib/format";
import type { Product, ProductBatch, ProductMovement } from "@/lib/types";
import { AdjustmentType } from "@/lib/types";
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
import { StockStatusBadge } from "@/components/products/stock-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DifferenceDisplay } from "./difference-display";
import {
  ADJUSTMENT_TYPE_DESCRIPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
} from "./adjustment-type-helpers";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
  isOwner?: boolean;
  onSubmitted: () => void;
};

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

function ReviewMetric({
  label,
  value,
  emphasize,
  children,
}: {
  label: string;
  value?: ReactNode;
  emphasize?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums text-sm",
          emphasize ? "font-semibold text-foreground" : "font-medium"
        )}
      >
        {children ?? value ?? "—"}
      </p>
    </div>
  );
}

export function AdjustmentRequestDialog({
  open,
  onOpenChange,
  products,
  isOwner = false,
  onSubmitted,
}: Props) {
  const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
  const [productId, setProductId] = useState("");
  const [batchCounts, setBatchCounts] = useState<Record<string, string>>({});
  const [initialCount, setInitialCount] = useState("");
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState(String(AdjustmentType.StockCountCorrection));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastMovementAt, setLastMovementAt] = useState<string | null>(null);
  const [loadingMovement, setLoadingMovement] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  const batchLines = useMemo(() => {
    return batches.map((b) => {
      const raw = batchCounts[b.id]?.trim() ?? "";
      const parsed = raw === "" ? null : parseInt(raw, 10);
      const actual = parsed !== null && !Number.isNaN(parsed) ? parsed : null;
      const system = b.remainingQuantity;
      const diff = actual !== null ? actual - system : null;
      return { batch: b, actual, system, diff };
    });
  }, [batches, batchCounts]);

  const systemTotal = useMemo(
    () => batchLines.reduce((sum, l) => sum + l.system, 0),
    [batchLines]
  );

  const initialActual = initialCount.trim() === "" ? null : Number.parseInt(initialCount, 10);
  const hasInitialCount = initialActual !== null && !Number.isNaN(initialActual) && initialActual >= 0;

  const actualTotal = useMemo(() => {
    if (batchLines.length === 0) return hasInitialCount ? (initialActual as number) : null;
    if (batchLines.some((l) => l.actual === null)) return null;
    return batchLines.reduce((sum, l) => sum + (l.actual ?? 0), 0);
  }, [batchLines, hasInitialCount, initialActual]);

  const diff = useMemo(() => {
    if (actualTotal === null) return null;
    return actualTotal - systemTotal;
  }, [actualTotal, systemTotal]);

  const affectedBatches = useMemo(() => {
    if (batchLines.length === 0) return diff !== null && diff !== 0 ? 1 : 0;
    return batchLines.filter((l) => l.diff !== null && l.diff !== 0).length;
  }, [batchLines, diff]);

  const typeDescription =
    ADJUSTMENT_TYPE_DESCRIPTIONS[Number(adjustmentType) as AdjustmentType] ?? "";

  const allCountsEntered = batchLines.length > 0 && batchLines.every((l) => l.actual !== null && l.actual >= 0);
  const countsReady = batchLines.length > 0 ? allCountsEntered : hasInitialCount;

  const canSubmit =
    !!productId &&
    countsReady &&
    reason.trim().length > 0 &&
    diff !== null &&
    diff !== 0 &&
    !submitting &&
    !loadingBatches;

  const reset = () => {
    setProductId("");
    setBatchCounts({});
    setInitialCount("");
    setBatches([]);
    setAdjustmentType(String(AdjustmentType.StockCountCorrection));
    setReason("");
    setNotes("");
    setLastMovementAt(null);
    setLoadingMovement(false);
    setLoadingBatches(false);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      document.getElementById("adjustment-product-select")?.focus();
    });
  }, [open]);

  useEffect(() => {
    if (!productId) {
      setLastMovementAt(null);
      setBatches([]);
      setBatchCounts({});
      setInitialCount("");
      return;
    }
    let cancelled = false;
    setLoadingMovement(true);
    setLoadingBatches(true);
    api
      .get<ProductMovement[]>(`/api/products/${productId}/movements`)
      .then((movements) => {
        if (cancelled) return;
        setLastMovementAt(movements[0]?.createdAt ?? null);
      })
      .catch(() => {
        if (!cancelled) setLastMovementAt(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingMovement(false);
      });

    api
      .get<ProductBatch[]>(`/api/products/${productId}/batches`)
      .then((rows) => {
        if (cancelled) return;
        const countable = rows
          .filter((b) => b.isActive && b.remainingQuantity > 0)
          .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));
        setBatches(countable);
        const initial: Record<string, string> = {};
        for (const b of countable) {
          initial[b.id] = String(b.remainingQuantity);
        }
        setBatchCounts(initial);
        if (countable.length === 0) setInitialCount(String(selected?.stockQuantity ?? 0));
        else setInitialCount("");
      })
      .catch(() => {
        if (!cancelled) {
          setBatches([]);
          setBatchCounts({});
          setInitialCount("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBatches(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, selected?.stockQuantity]);

  const setBatchCount = (batchId: string, value: string) => {
    setBatchCounts((prev) => ({ ...prev, [batchId]: value }));
  };

  const submit = async () => {
    if (!countsReady || actualTotal === null) {
      toast.error(
        batchLines.length > 0
          ? "Enter a physical count for every in-stock batch"
          : "Enter the physical count to initialize opening stock"
      );
      return;
    }
    if (!productId || !reason.trim()) {
      toast.error("Product and reason are required");
      return;
    }
    if (diff === 0) {
      toast.error("Counts match system quantities — no adjustment needed");
      return;
    }
    if (batchLines.some((l) => (l.actual ?? 0) < 0)) {
      toast.error("Batch counts cannot be negative");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/inventory-adjustments", {
        productId,
        lines:
          batchLines.length > 0
            ? batchLines.map((l) => ({
                productBatchId: l.batch.id,
                actualQuantity: l.actual as number,
              }))
            : [
                {
                  productBatchId: EMPTY_GUID,
                  actualQuantity: initialActual as number,
                },
              ],
        adjustmentType: Number(adjustmentType),
        reason: reason.trim(),
        notes: notes.trim() || null,
      });
      toast.success("Adjustment request submitted — awaiting owner approval");
      onOpenChange(false);
      reset();
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (canSubmit) void submit();
  };

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.isActive)
        .map((p) => ({
          value: p.id,
          label: `${p.sku} — ${p.name}`,
          searchText: `${p.sku} ${p.name} ${formatProductSpec(p)}`,
        })),
    [products]
  );

  return (
    <Dialog dismissible open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent
        size="workspace"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                Inventory Adjustment Request
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Count each batch on hand and submit for owner approval
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
                <p className="font-medium">Approval required</p>
                <p className="mt-0.5 leading-snug text-amber-900/90 dark:text-amber-100/90">
                  Batch quantities and product totals update only after owner approval.
                </p>
              </div>
            </div>

            <Section
              title="Product selection"
              description="Choose the item being reconciled"
            >
              <Field label="Product" required>
                <OptionSelect
                  triggerId="adjustment-product-select"
                  value={productId}
                  onValueChange={setProductId}
                  searchable
                  searchPlaceholder="Search SKU or product name..."
                  placeholder="Select product"
                  options={productOptions}
                />
              </Field>

              {selected ? (
                <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/25 p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      System quantity
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {selected.stockQuantity}{" "}
                      <span className="font-normal text-muted-foreground">
                        {selected.unitOfMeasure}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Stock status
                    </p>
                    <div className="mt-1">
                      <StockStatusBadge
                        status={selected.stockStatus}
                        label={selected.stockStatusLabel}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Last movement
                    </p>
                    <p className="mt-1 text-sm text-foreground/90">
                      {loadingMovement
                        ? "Loading…"
                        : lastMovementAt
                          ? formatDate(lastMovementAt)
                          : "No recorded movement"}
                    </p>
                  </div>
                  {formatProductSpec(selected) ? (
                    <p className="col-span-full text-[11px] text-muted-foreground">
                      {formatProductSpec(selected)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Section>

            {selected ? (
              <Section
                title="Batch reconciliation"
                description="Count each in-stock batch (oldest first). Depleted batches (qty 0) are excluded until stock is restored."
              >
                {loadingBatches ? (
                  <p className="text-sm text-muted-foreground">Loading batches…</p>
                ) : batches.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      No batches with remaining stock. Enter opening physical count to initialize stock from zero.
                    </p>
                    <Field
                      label="Opening physical count"
                      required
                      hint="This creates an initial stock setup request for owner approval."
                    >
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={initialCount}
                        onChange={(e) => setInitialCount(e.target.value)}
                        className="h-9 w-40 text-right tabular-nums"
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table enterprise className="min-w-[48rem]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch code</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">System qty</TableHead>
                          <TableHead className="text-right">Counted qty</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          {isOwner ? (
                            <TableHead className="text-right">Cost</TableHead>
                          ) : null}
                          <TableHead className="text-right">Selling</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchLines.map(({ batch, system, actual, diff: lineDiff }) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-mono text-xs">
                              {batch.batchCode ?? batch.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(batch.receivedDate)}
                            </TableCell>
                            <TableCell className="max-w-[8rem] truncate text-xs">
                              {batch.supplierName ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{system}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={batchCounts[batch.id] ?? ""}
                                onChange={(e) => setBatchCount(batch.id, e.target.value)}
                                className="ml-auto h-8 w-24 text-right tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {lineDiff !== null ? (
                                <DifferenceDisplay value={lineDiff} />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            {isOwner ? (
                              <TableCell className="text-right tabular-nums text-xs">
                                {formatCurrency(batch.costPrice)}
                              </TableCell>
                            ) : null}
                            <TableCell className="text-right tabular-nums text-xs">
                              {formatCurrency(batch.sellingPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Section>
            ) : null}

            <Section
              title="Adjustment details"
              description="Type and documented reason"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Adjustment type" required className="sm:col-span-2">
                  <OptionSelect
                    value={adjustmentType}
                    onValueChange={setAdjustmentType}
                    placeholder="Select adjustment type"
                    options={ADJUSTMENT_TYPE_OPTIONS}
                  />
                  {typeDescription ? (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {typeDescription}
                    </p>
                  ) : null}
                </Field>

                <Field
                  label="Reason"
                  required
                  className="sm:col-span-2"
                  hint="Required for audit trail — describe why this correction is needed"
                >
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Cycle count found 2 missing pieces in Batch B20260611-001"
                    rows={3}
                    className="flex min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </Field>

                <Field
                  label="Notes"
                  hint="Optional context for the reviewer"
                  className="sm:col-span-2"
                >
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional context (optional)"
                    className="h-9"
                  />
                </Field>
              </div>
            </Section>

            <Section
              title="Adjustment review"
              description="Totals across all batches before submission"
            >
              <div className="mb-3 flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Product stock is the sum of batch quantities. Each batch is updated on approval.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <ReviewMetric
                  label="System total"
                  value={
                    selected ? (
                      <>
                        {systemTotal}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {selected.unitOfMeasure}
                        </span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                />
                <ReviewMetric
                  label="Counted total"
                  value={
                    actualTotal !== null ? (
                      <>
                        {actualTotal}{" "}
                        {selected ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {selected.unitOfMeasure}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )
                  }
                />
                <ReviewMetric label="Variance">
                  {diff !== null ? (
                    <DifferenceDisplay value={diff} />
                  ) : (
                    "—"
                  )}
                </ReviewMetric>
                <ReviewMetric label="Affected batches" emphasize>
                  {allCountsEntered ? affectedBatches : "—"}
                </ReviewMetric>
                <ReviewMetric label="After approval" emphasize>
                  {actualTotal !== null ? (
                    <>
                      {actualTotal}{" "}
                      {selected ? (
                        <span className="text-xs font-normal text-muted-foreground">
                          {selected.unitOfMeasure}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </ReviewMetric>
              </div>

              {diff === 0 && allCountsEntered && selected ? (
                <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  Counts match system quantities — no adjustment request needed.
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
              {submitting ? "Submitting…" : "Submit Adjustment Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
