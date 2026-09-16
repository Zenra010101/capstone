"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { Customer, CustomersSummary, Paged } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/enterprise/empty-state";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { CustomerCard } from "@/components/customers/customer-card";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomerProfileDialog } from "@/components/customers/customer-profile-dialog";
import { StatementDialog } from "@/components/receivables/statement-dialog";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomersSummary | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [statementId, setStatementId] = useState<string | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (includeInactive) params.set("includeInactive", "true");
    return params;
  }, [page, debouncedSearch, includeInactive]);

  const load = useCallback(() => {
    const qs = buildParams().toString();
    const summaryQs = new URLSearchParams();
    if (debouncedSearch) summaryQs.set("search", debouncedSearch);
    if (includeInactive) summaryQs.set("includeInactive", "true");

    Promise.all([
      api.get<Paged<Customer>>(`/api/customers?${qs}`),
      api.get<CustomersSummary>(`/api/customers/summary?${summaryQs}`),
    ])
      .then(([paged, sum]) => {
        setList(paged.items);
        setPage(paged.page);
        setPageSize((paged.pageSize as TablePageSize) ?? pageSize);
        setTotalPages(paged.totalPages);
        setTotalCount(paged.totalCount);
        setSummary(sum);
      })
      .catch((e) => {
        toast.error(e instanceof ApiError ? e.message : "Could not load customers");
      });
  }, [buildParams, debouncedSearch, includeInactive, pageSize]);

  useDebouncedEffect(() => {
    setDebouncedSearch(search);
  }, [search], 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, includeInactive]);

  useDebouncedEffect(() => {
    void load();
  }, [load, page], 300);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setProfileId(id);
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Accounts for charge sales, credit limits, and receivables"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add customer
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total customers"
          value={String(summary?.totalCount ?? "—")}
          icon={Users}
        />
        <StatCard
          title="With balance"
          value={String(summary?.withBalanceCount ?? "—")}
          subtitle={formatCurrency(summary?.totalOutstanding ?? 0)}
          icon={Users}
        />
        <StatCard
          title="Overdue accounts"
          value={String(summary?.overdueCustomersCount ?? "—")}
          icon={Users}
        />
      </div>

      <Card className="mb-4 shadow-erp">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              onOpen={(cust) => setProfileId(cust.id)}
              onStatement={setStatementId}
            />
          ))}
        </div>
      )}

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemLabel="customers"
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        className="mt-6 rounded-lg border bg-card"
      />

      <CustomerProfileDialog
        customerId={profileId}
        open={!!profileId}
        onOpenChange={(o) => !o && setProfileId(null)}
        onUpdated={load}
      />

      <StatementDialog
        customerId={statementId}
        open={!!statementId}
        onOpenChange={(o) => !o && setStatementId(null)}
      />

      <CustomerFormDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </>
  );
}
