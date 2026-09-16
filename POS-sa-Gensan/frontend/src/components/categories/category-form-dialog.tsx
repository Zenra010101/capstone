"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Tags } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  getCategoryAccentClass,
  getCategoryIcon,
} from "./category-icons";

export type CategoryFormState = {
  name: string;
  description: string;
  icon: string;
  colorAccent: string;
  parentCategoryId: string;
  isActive: boolean;
};

const emptyForm = (): CategoryFormState => ({
  name: "",
  description: "",
  icon: "Package",
  colorAccent: "slate",
  parentCategoryId: "",
  isActive: true,
});

function categoryToForm(c: Category): CategoryFormState {
  return {
    name: c.name,
    description: c.description ?? "",
    icon: c.icon ?? "Package",
    colorAccent: c.colorAccent ?? "slate",
    parentCategoryId: c.parentCategoryId ?? "",
    isActive: c.isActive,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
  categories: Category[];
  onSaved: () => void;
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

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSaved,
}: Props) {
  const [form, setForm] = useState<CategoryFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = !!category;

  useEffect(() => {
    if (open) {
      setForm(category ? categoryToForm(category) : emptyForm());
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [open, category]);

  const set = (patch: Partial<CategoryFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && category) {
        await api.put(`/api/categories/${category.id}`, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon || null,
          colorAccent: form.colorAccent || null,
          parentCategoryId: form.parentCategoryId || null,
          isActive: form.isActive,
        });
        toast.success("Category updated");
      } else {
        await api.post("/api/categories", {
          name: form.name.trim(),
          description: form.description.trim() || null,
          icon: form.icon || null,
          colorAccent: form.colorAccent || null,
          parentCategoryId: form.parentCategoryId || null,
        });
        toast.success("Category created");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    void save();
  };

  const parentOptions = categories.filter(
    (c) => c.isActive && (!category || c.id !== category.id)
  );

  const PreviewIcon = getCategoryIcon(form.icon);
  const accentClass = getCategoryAccentClass(form.colorAccent);
  const selectedColor = CATEGORY_COLOR_OPTIONS.find((o) => o.value === form.colorAccent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        scrollBody={false}
        className="category-form-dialog flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tags className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                {isEdit ? "Edit category" : "Add category"}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isEdit
                  ? "Update grouping, hierarchy, and catalog appearance"
                  : "Set up inventory grouping for products and reporting"}
              </p>
              {isEdit && category ? (
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {category.name}
                  {category.parentCategoryName
                    ? ` · under ${category.parentCategoryName}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onKeyDown={handleKeyDown}
          className="overflow-y-auto overscroll-contain bg-muted/20 px-4 py-4 sm:px-5 sm:py-4"
        >
          <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="mb-3 border-b border-border/60 pb-2.5">
              <h3 className="text-sm font-semibold tracking-tight">Category information</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Name, description, icon, color, hierarchy, and status
              </p>
            </div>

            <div className="space-y-3">
              <Field label="Category name" required>
                <Input
                  ref={nameRef}
                  className="h-10"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Stainless Pipes"
                  autoComplete="off"
                />
              </Field>

              <Field
                label="Description"
                hint="Technical notes such as SCH10, SCH40, or material types"
              >
                <textarea
                  rows={3}
                  className="min-h-[4.5rem] max-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-snug outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="SCH10, SCH40, SCH80 — round pipe stock"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Icon" hint="Shown on category cards and filters">
                  <div className="flex items-center gap-2">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-slate-700">
                      <PreviewIcon className="size-4" />
                    </div>
                    <Select
                      value={form.icon}
                      onValueChange={(v) => set({ icon: v ?? "Package" })}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ICON_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="flex items-center gap-2">
                              <o.Icon className="size-3.5 opacity-70" />
                              {o.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field label="Parent category" hint="Supports subcategory hierarchy">
                  <Select
                    value={form.parentCategoryId || "none"}
                    onValueChange={(v) =>
                      set({ parentCategoryId: v === "none" ? "" : (v ?? "") })
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="None — top level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — top level</SelectItem>
                      {parentOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Color accent" className="sm:col-span-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-7 items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-2.5 text-xs font-medium",
                          accentClass.replace("border-l-", "border-")
                        )}
                      >
                        <span
                          className={cn(
                            "size-3 rounded-full",
                            selectedColor?.swatch ?? "bg-slate-400"
                          )}
                        />
                        {selectedColor?.label ?? "Slate"}
                      </span>
                      <Select
                        value={form.colorAccent}
                        onValueChange={(v) => set({ colorAccent: v ?? "slate" })}
                      >
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_COLOR_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              <span className="flex items-center gap-2">
                                <span className={cn("size-3 rounded-full", o.swatch)} />
                                {o.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_COLOR_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          title={o.label}
                          aria-label={o.label}
                          onClick={() => set({ colorAccent: o.value })}
                          className={cn(
                            "size-6 rounded-full border-2 transition-transform hover:scale-105",
                            o.swatch,
                            form.colorAccent === o.value
                              ? "border-foreground ring-2 ring-primary/30"
                              : "border-white/80"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </Field>

                <Field
                  label="Status"
                  hint={
                    isEdit
                      ? "Archive by setting inactive"
                      : "New categories are created active; archive later when editing"
                  }
                >
                  <Select
                    value={form.isActive ? "active" : "archived"}
                    onValueChange={(v) => set({ isActive: v === "active" })}
                    disabled={!isEdit}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived" disabled={!isEdit}>
                        Archived
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </section>
        </form>

        <div className="shrink-0 border-t bg-muted/30 px-5 py-3.5 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-[110px]"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 min-w-[140px] font-semibold"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save category"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
