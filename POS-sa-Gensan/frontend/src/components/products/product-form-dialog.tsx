"use client";

import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProductFormFields,
  type ProductFormState,
} from "./product-form-fields";
import type { Category, Supplier } from "@/lib/types";

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  headerMeta?: string;
  form: ProductFormState;
  setForm: (form: ProductFormState) => void;
  categories: Category[];
  suppliers: Supplier[];
  isOwner: boolean;
  mode: "create" | "edit";
  saving?: boolean;
  saveLabel?: string;
  onSave: () => void;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  headerMeta,
  form,
  setForm,
  categories,
  suppliers,
  isOwner,
  mode,
  saving = false,
  saveLabel,
  onSave,
}: ProductFormDialogProps) {
  const primaryLabel =
    saveLabel ?? (mode === "create" ? "Save product" : "Save changes");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        scrollBody={false}
        className="product-form-dialog flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </DialogTitle>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
              {headerMeta ? (
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {headerMeta}
                </p>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-4 sm:px-5 sm:py-5">
          <ProductFormFields
            form={form}
            setForm={setForm}
            categories={categories}
            suppliers={suppliers}
            isOwner={isOwner}
            mode={mode}
          />
        </div>

        <div className="shrink-0 border-t bg-card px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-[120px]"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 min-w-[160px] font-semibold"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : primaryLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
