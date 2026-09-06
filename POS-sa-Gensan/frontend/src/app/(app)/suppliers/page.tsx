"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, FileText, Plus, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { asList, type ListResponse } from "@/lib/api-shapes";
import type { Paged, Product, SupplierListItem, SupplierSummary } from "@/lib/types";
import { SupplierStatus } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/enterprise/empty-state";
import { StatCard } from "@/components/stat-card";
import { SupplierCard } from "@/components/suppliers/supplier-card";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierProfileDialog } from "@/components/suppliers/supplier-profile-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";

const PAGE_SIZE = 50;

export default function SuppliersPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const searchParams = useSearchParams();

  const [list, setList] = useState<SupplierListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [productFilter, setProductFilter] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierListItem | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SupplierListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (preferredOnly) params.set("preferredOnly", "true");
    if (productFilter) params.set("productId", productFilter);
    if (includeArchived) params.set("includeArchived", "true");
    if (statusFilter === "active") {
      params.delete("status");
      params.set("activeOnly", "true");
    }
    return params;
  }, [page, debouncedSearch, statusFilter, preferredOnly, productFilter, includeArchived]);

  const load = useCallback(async () => {
    try {
      const paged = await api.get<Paged<SupplierListItem>>(`/api/suppliers?${buildParams()}`);
      setList(paged.items);
      setTotalPages(paged.totalPages);
      if (isOwner) {
        const sum = await api.get<SupplierSummary>("/api/suppliers/summary");
        setSummary(sum);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load suppliers");
    }
  }, [buildParams, isOwner]);

  useDebouncedEffect(() => {
    setDebouncedSearch(search);
  }, [search], 250);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, preferredOnly, productFilter, includeArchived]);

  useDebouncedEffect(() => {
    void load();
  }, [load, page], 250);

  useEffect(() => {
    api
      .get<ListResponse<Product>>("/api/products?activeOnly=true")
      .then((data) => setProducts(asList(data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setProfileId(id);
  }, [searchParams]);

  const archive = async () => {
    if (!archiveTarget) return;
    try {
      await api.post(`/api/suppliers/${archiveTarget.id}/archive`, {
        reason: archiveReason.trim() || null,
      });
      toast.success("Supplier archived — receiving history preserved");
      setArchiveTarget(null);
      setArchiveReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Archive failed");
    }
  };

  const exportList = async (format: "excel" | "pdf") => {
    const params = buildParams();
    params.set("format", format);
    const ext = format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadExport(`/api/suppliers/export?${params}`, `suppliers.${ext}`);
      toast.success(`Downloaded ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description={
          isOwner
            ? "Supplier relationships, receiving history, and procurement analytics"
            : "View suppliers linked to stock receiving and inventory intake"
        }
        action={
          isOwner ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add supplier
            </Button>
          ) : undefined
        }
      />

      {isOwner && summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total suppliers" value={String(summary.totalSuppliers)} icon={Truck} />
          <StatCard title="Active" value={String(summary.activeCount)} icon={Truck} />
          <StatCard title="Preferred" value={String(summary.preferredCount)} icon={Star} />
          <StatCard
            title="Top spend (90d)"
            value={
              summary.topSuppliersBySpend[0]
                ? formatCurrency(summary.topSuppliersBySpend[0].totalSpend)
                : "—"
            }
            subtitle={summary.topSuppliersBySpend[0]?.supplierName}
            icon={FileText}
          />
        </div>
      )}

      {isOwner && summary && summary.topSuppliersBySpend.length > 0 && (
        <Card className="mb-4 shadow-erp">
          <CardContent className="pt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Top suppliers by spend</h3>
            <div className="flex flex-wrap gap-4">
              {summary.topSuppliersBySpend.slice(0, 5).map((r) => (
                <button
                  key={r.supplierId}
                  type="button"
                  className="rounded-lg border bg-slate-50 px-4 py-2 text-left text-sm hover:bg-slate-100"
                  onClick={() => setProfileId(r.supplierId)}
                >
                  <span className="font-medium">{r.supplierName}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {formatCurrency(r.totalSpend)} · {r.receivingCount} RCVs
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 shadow-erp">
        <CardContent className="grid gap-4 pt-6 lg:grid-cols-4">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPreferredOnly(false);
            }}
            className="lg:col-span-4"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value={String(SupplierStatus.Preferred)}>Preferred</TabsTrigger>
              <TabsTrigger value={String(SupplierStatus.Inactive)}>Inactive</TabsTrigger>
              <TabsTrigger value={String(SupplierStatus.Blacklisted)}>Blacklisted</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1 lg:col-span-2">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, contact, phone, email..."
            />
          </div>
          <div className="space-y-1">
            <Label>Supplied product</Label>
            <Select
              value={productFilter || "all"}
              onValueChange={(v) => setProductFilter(v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isOwner && (
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferredOnly}
                  onChange={(e) => {
                    setPreferredOnly(e.target.checked);
                    if (e.target.checked) setStatusFilter("all");
                  }}
                />
                Preferred only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Show archived
              </label>
            </div>
          )}
        </CardContent>
        <div className="flex flex-wrap gap-2 border-t px-6 py-3">
          <Button variant="outline" size="sm" onClick={() => exportList("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportList("pdf")}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <SupplierCard
            key={s.id}
            supplier={s}
            isOwner={isOwner}
            onView={(x) => setProfileId(x.id)}
            onEdit={(x) => {
              setEditing(x);
              setFormOpen(true);
            }}
            onArchive={setArchiveTarget}
          />
        ))}
      </div>
      {!list.length && <EmptyState title="No suppliers match your filters" />}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={load}
      />

      <SupplierProfileDialog
        supplierId={profileId}
        open={!!profileId}
        onOpenChange={(v) => !v && setProfileId(null)}
        isOwner={isOwner}
        onEdit={(s) => {
          setProfileId(null);
          setEditing(s);
          setFormOpen(true);
        }}
        onRefresh={load}
      />

      <Dialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Archive supplier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {archiveTarget?.name} will be archived. Stock receiving history and cost records are
            preserved. This supplier cannot be used for new receivings.
          </p>
          <div className="space-y-2 py-2">
            <Label>Reason (optional)</Label>
            <Input
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={archive}>
              Archive supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
