"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Barcode,
  ChevronDown,
  ChevronRight,
  ScanLine,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Supplier } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import {
  buildProductSummaryPreview,
  findCategoryName,
  generateClientBarcode,
  generateProductSku,
  getCategorySpecProfile,
  isSpecFieldVisible,
  type SpecFieldKey,
} from "./product-form-utils";

export const UOM_OPTIONS = [
  "pc",
  "sheet",
  "meter",
  "m",
  "ft",
  "kilo",
  "kg",
  "bundle",
  "set",
  "box",
];

export type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  barcode: string;
  categoryId: string;
  supplierId: string;
  grade: string;
  materialType: string;
  thickness: string;
  schedule: string;
  diameter: string;
  size: string;
  width: string;
  height: string;
  length: string;
  unitOfMeasure: string;
  unitPrice: string;
  costPrice: string;
  stockQuantity: string;
  reorderLevel: string;
  isActive: boolean;
};

export const emptyProductForm = (): ProductFormState => ({
  sku: "",
  name: "",
  description: "",
  barcode: "",
  categoryId: "",
  supplierId: "",
  grade: "",
  materialType: "",
  thickness: "",
  schedule: "",
  diameter: "",
  size: "",
  width: "",
  height: "",
  length: "",
  unitOfMeasure: "pc",
  unitPrice: "",
  costPrice: "",
  stockQuantity: "0",
  reorderLevel: "15",
  isActive: true,
});

export function productToForm(p: {
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  categoryId: string;
  supplierId?: string;
  grade?: string;
  materialType?: string;
  thickness?: string;
  schedule?: string;
  diameter?: string;
  size?: string;
  width?: string;
  height?: string;
  length?: string;
  unitOfMeasure: string;
  unitPrice: number;
  costPrice?: number | null;
  reorderLevel: number;
  isActive: boolean;
}): ProductFormState {
  return {
    sku: p.sku,
    name: p.name,
    description: p.description ?? "",
    barcode: p.barcode ?? "",
    categoryId: p.categoryId,
    supplierId: p.supplierId ?? "",
    grade: p.grade ?? "",
    materialType: p.materialType ?? "",
    thickness: p.thickness ?? "",
    schedule: p.schedule ?? "",
    diameter: p.diameter ?? "",
    size: p.size ?? "",
    width: p.width ?? "",
    height: p.height ?? "",
    length: p.length ?? "",
    unitOfMeasure: p.unitOfMeasure,
    unitPrice: String(p.unitPrice),
    costPrice: p.costPrice != null ? String(p.costPrice) : "",
    stockQuantity: "0",
    reorderLevel: String(p.reorderLevel),
    isActive: p.isActive,
  };
}

export function formToPayload(form: ProductFormState, includeStock: boolean) {
  const base = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    barcode: form.barcode.trim() || null,
    categoryId: form.categoryId,
    supplierId: form.supplierId || null,
    grade: form.grade.trim() || null,
    materialType: form.materialType.trim() || null,
    thickness: form.thickness.trim() || null,
    schedule: form.schedule.trim() || null,
    diameter: form.diameter.trim() || null,
    size: form.size.trim() || null,
    width: form.width.trim() || null,
    height: form.height.trim() || null,
    length: form.length.trim() || null,
    unitOfMeasure: form.unitOfMeasure,
    unitPrice: parseFloat(form.unitPrice) || 0,
    costPrice: parseFloat(form.costPrice) || 0,
    reorderLevel: parseInt(form.reorderLevel, 10) || 15,
  };
  if (includeStock) {
    return { ...base, stockQuantity: parseInt(form.stockQuantity, 10) || 0 };
  }
  return { ...base, isActive: form.isActive };
}

type Props = {
  form: ProductFormState;
  setForm: (f: ProductFormState) => void;
  categories: Category[];
  suppliers: Supplier[];
  isOwner: boolean;
  mode: "create" | "edit";
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 border-b border-border/60 pb-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

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
    <div className={className ?? "space-y-1.5"}>
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

const SPEC_META: Record<
  SpecFieldKey,
  { label: string; placeholder?: string; hint?: string }
> = {
  grade: { label: "Grade", placeholder: "304, 316" },
  materialType: { label: "Material", placeholder: "Stainless steel" },
  thickness: {
    label: "Thickness",
    placeholder: "1.2mm",
    hint: "Sheet/plate thickness",
  },
  schedule: { label: "Schedule (SCH)", placeholder: "SCH40" },
  diameter: { label: "Diameter", placeholder: "12mm", hint: "Example: Ø12mm" },
  size: { label: "Size", placeholder: '2"' },
  width: { label: "Width", placeholder: "1000mm" },
  height: { label: "Height", placeholder: "50mm" },
  length: { label: "Length", placeholder: "6m", hint: "Example: 6m" },
};

function PreviewPanel({
  preview,
  unitPrice,
  compact,
}: {
  preview: { title: string; lines: string[] };
  unitPrice?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-card p-3 shadow-sm xl:hidden"
          : "sticky top-0 rounded-xl border border-primary/15 bg-gradient-to-b from-primary/5 to-card p-4 shadow-sm"
      }
    >
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Sparkles className="size-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Live preview</p>
      </div>
      <p className={`font-semibold leading-snug text-foreground ${compact ? "text-sm" : "text-base"}`}>
        {preview.title}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {preview.lines.length ? (
          preview.lines.map((line) => (
            <li key={line} className="leading-snug">
              {line}
            </li>
          ))
        ) : (
          <li className="text-xs italic">Fill in product details to preview catalog entry</li>
        )}
      </ul>
      {unitPrice ? (
        <p className="mt-3 border-t border-border/60 pt-2 text-base font-bold tabular-nums text-primary">
          {formatCurrency(parseFloat(unitPrice) || 0)}
        </p>
      ) : null}
    </div>
  );
}

export function ProductFormFields({
  form,
  setForm,
  categories,
  suppliers,
  isOwner,
  mode,
}: Props) {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const set = (patch: Partial<ProductFormState>) => setForm({ ...form, ...patch });

  const categoryName = findCategoryName(categories, form.categoryId);
  const specProfile = getCategorySpecProfile(categoryName);
  const preview = useMemo(
    () => buildProductSummaryPreview(form, categoryName),
    [form, categoryName]
  );

  const profileHint =
    specProfile === "pipe"
      ? "Pipe profile — schedule and diameter fields shown"
      : specProfile === "sheet"
        ? "Sheet profile — width, length, and thickness fields shown"
        : specProfile === "hardware"
          ? "Hardware profile — simplified specification fields"
          : "General profile — full specification grid";

  const showSpec = (field: SpecFieldKey) => isSpecFieldVisible(field, specProfile);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
      <div className="space-y-4">
        <PreviewPanel preview={preview} unitPrice={form.unitPrice} compact />

        <FormSection
          title="Basic product information"
          description="Identity, classification, and barcode setup"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="SKU"
              required
              hint="Auto format: category + size + SCH/spec"
              className="sm:col-span-2 lg:col-span-1"
            >
              <div className="flex gap-2">
                <Input
                  className="h-10 font-mono text-sm"
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value })}
                  placeholder="SS-PIPE-2-SCH40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 px-2.5"
                  onClick={() => {
                    const sku = generateProductSku(form, categoryName);
                    if (sku) set({ sku });
                  }}
                  title="Auto-generate SKU"
                >
                  <Wand2 className="size-4" />
                </Button>
              </div>
            </Field>

            <Field label="Barcode" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                <Input
                  ref={barcodeRef}
                  className="h-10 min-w-[140px] flex-1 font-mono text-sm"
                  value={form.barcode}
                  onChange={(e) => set({ barcode: e.target.value })}
                  placeholder="Scan or generate"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1 px-2.5"
                  onClick={() => {
                    barcodeRef.current?.focus();
                    barcodeRef.current?.select();
                  }}
                >
                  <ScanLine className="size-4" />
                  Scan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1 px-2.5"
                  onClick={() =>
                    set({
                      barcode: generateClientBarcode(form.sku || form.name || "new"),
                    })
                  }
                >
                  <Barcode className="size-4" />
                  Generate
                </Button>
              </div>
            </Field>

            <Field label="Product name" required className="sm:col-span-2 lg:col-span-3">
              <Input
                className="h-10"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder='Stainless Pipe 2" SCH40'
              />
            </Field>

            <Field label="Category" required>
              <Select
                value={form.categoryId || undefined}
                onValueChange={(v) => {
                  const nextId = v ?? "";
                  const nextName = findCategoryName(categories, nextId);
                  const patch: Partial<ProductFormState> = { categoryId: nextId };
                  if (!form.sku.trim() && nextName) {
                    patch.sku = generateProductSku(form, nextName);
                  }
                  set(patch);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select category">
                    {categoryName || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Preferred supplier" className="sm:col-span-2 lg:col-span-2">
              <Select
                value={form.supplierId || "none"}
                onValueChange={(v) => set({ supplierId: v === "none" ? "" : (v ?? "") })}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Optional supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Product specifications" description={profileHint}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(SPEC_META) as SpecFieldKey[])
              .filter(showSpec)
              .map((key) => {
                const meta = SPEC_META[key];
                return (
                  <Field key={key} label={meta.label} hint={meta.hint}>
                    <Input
                      className="h-10"
                      value={form[key]}
                      onChange={(e) =>
                        set({ [key]: e.target.value } as Partial<ProductFormState>)
                      }
                      placeholder={meta.placeholder}
                    />
                  </Field>
                );
              })}
          </div>
        </FormSection>

        <FormSection
          title="Pricing & inventory"
          description="Unit, pricing, stock levels, and reorder alert threshold"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Unit">
              <Select
                value={form.unitOfMeasure}
                onValueChange={(v) => set({ unitOfMeasure: v ?? "pc" })}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Selling price" required>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-10 tabular-nums"
                value={form.unitPrice}
                onChange={(e) => set({ unitPrice: e.target.value })}
              />
            </Field>

            {isOwner ? (
              <Field label="Cost price" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 tabular-nums"
                  value={form.costPrice}
                  onChange={(e) => set({ costPrice: e.target.value })}
                />
              </Field>
            ) : null}

            {mode === "create" && isOwner ? (
              <Field
                label="Initial stock"
                hint="Recorded as opening balance in stock history"
              >
                <Input
                  type="number"
                  min={0}
                  className="h-10 tabular-nums"
                  value={form.stockQuantity}
                  onChange={(e) => set({ stockQuantity: e.target.value })}
                />
              </Field>
            ) : null}

            {isOwner ? (
              <Field
                label="Low stock threshold"
                hint="Alert when on-hand quantity reaches this level (default 15)"
              >
                <Input
                  type="number"
                  min={0}
                  className="h-10 tabular-nums"
                  value={form.reorderLevel}
                  onChange={(e) => set({ reorderLevel: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
        </FormSection>

        <section className="rounded-xl border border-border/80 bg-card shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            <div>
              <p className="text-sm font-semibold">Advanced settings</p>
              <p className="text-xs text-muted-foreground">
                Remarks, catalog status, and optional notes
              </p>
            </div>
            {advancedOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {advancedOpen ? (
            <div className="space-y-3 border-t px-4 py-4 sm:px-5">
              <Field label="Remarks / description">
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Internal notes, handling instructions, or catalog remarks"
                />
              </Field>

              {mode === "edit" && isOwner ? (
                <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set({ isActive: e.target.checked })}
                    className="size-4 rounded border-slate-300"
                  />
                  Active in catalog
                </label>
              ) : null}

              <p className="text-[11px] text-muted-foreground">
                Barcode labels can be printed after the product is saved from the
                product actions menu.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="hidden xl:block">
        <PreviewPanel preview={preview} unitPrice={form.unitPrice} />
      </aside>
    </div>
  );
}
