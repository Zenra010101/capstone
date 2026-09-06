"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { Category, Product, Supplier } from "@/lib/types";
import {
  formToPayload,
  productToForm,
  type ProductFormState,
} from "./product-form-fields";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductEditDialog({
  product,
  open,
  onOpenChange,
  categories,
  suppliers,
  onSaved,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  suppliers: Supplier[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product && open) setForm(productToForm(product));
  }, [product, open]);

  const save = async () => {
    if (!product || !form) return;
    if (!form.sku.trim() || !form.name.trim() || !form.categoryId) {
      toast.error("SKU, name, and category are required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/products/${product.id}`, formToPayload(form, false));
      toast.success("Product updated");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!product || !form) return null;

  return (
    <ProductFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit product"
      subtitle="Update catalog specifications, pricing, and inventory settings"
      headerMeta={`${product.sku} · ${product.name}`}
      form={form}
      setForm={setForm}
      categories={categories}
      suppliers={suppliers}
      isOwner
      mode="edit"
      saving={saving}
      saveLabel="Save changes"
      onSave={save}
    />
  );
}
