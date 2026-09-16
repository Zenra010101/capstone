"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, FolderOpen, Plus, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { invalidateReference, CATEGORY_KEY_PREFIX } from "@/lib/reference-cache";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import type { Category, CategorySummary } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/enterprise/empty-state";
import { StatCard } from "@/components/stat-card";
import { CategoryCard } from "@/components/categories/category-card";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FilterMode = "all" | "archived" | "lowStock" | "empty";

export default function CategoriesPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");

  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<CategorySummary | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filter === "archived") params.set("includeArchived", "true");
    if (filter === "lowStock") params.set("lowStockOnly", "true");
    if (filter === "empty") params.set("emptyOnly", "true");

    try {
      const list = await api.get<Category[]>(`/api/categories?${params}`);
      const filtered =
        filter === "archived"
          ? list.filter((c) => !c.isActive)
          : filter === "all"
            ? list
            : list;
      setCategories(filtered);

      if (isOwner) {
        const s = await api.get<CategorySummary>("/api/categories/summary");
        setSummary(s);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load categories");
    }
  }, [search, filter, isOwner]);

  useDebouncedEffect(() => {
    void load();
  }, [load], 250);

  const openCreate = () => {
    setEditCategory(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditCategory(c);
    setFormOpen(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await api.post(`/api/categories/${archiveTarget.id}/archive`, {});
      toast.success("Category archived — products kept for history");
      setArchiveTarget(null);
      invalidateReference(CATEGORY_KEY_PREFIX);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Archive failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize inventory, reporting, and profit analytics by product group"
        action={
          isOwner ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          ) : undefined
        }
      />

      {isOwner && summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active categories" value={String(summary.activeCategories)} icon={Tags} />
          <StatCard title="With low stock" value={String(summary.categoriesWithLowStock)} icon={Archive} subtitle="Any SKU <= 15 units" />
          <StatCard title="Empty" value={String(summary.emptyCategories)} icon={FolderOpen} subtitle="No active products" />
          <StatCard title="Archived" value={String(summary.archivedCategories)} icon={Archive} />
        </div>
      )}

      <Card className="mb-6 shadow-erp">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search category name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter((v as FilterMode) ?? "all")}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active categories</SelectItem>
              <SelectItem value="lowStock">Low stock categories</SelectItem>
              <SelectItem value="empty">Empty categories</SelectItem>
              <SelectItem value="archived">Archived only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <CategoryCard
            key={c.id}
            category={c}
            isOwner={isOwner}
            onEdit={openEdit}
            onArchive={setArchiveTarget}
          />
        ))}
      </div>

      {!categories.length && (
        <Card className="mt-4 border-dashed shadow-erp">
          <CardContent>
            <EmptyState title="No categories match this filter" />
          </CardContent>
        </Card>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editCategory}
        categories={categories}
        onSaved={() => {
          invalidateReference(CATEGORY_KEY_PREFIX);
          load();
        }}
      />

      <Dialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Archive {archiveTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Products stay linked for sales history and reports. The category will be hidden from
            new product assignments. You can restore it by editing and marking Active again.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button onClick={confirmArchive}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
