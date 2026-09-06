"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import Link from "next/link";
import {
  Package,
  PhilippinePeso,
  Receipt,
  AlertTriangle,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { useAlerts } from "@/contexts/alerts-context";
import { PageHeader } from "@/components/page-header";
import { RoleSalesHighlightCard } from "@/components/dashboard/role-sales-highlight-card";
import { StatCard } from "@/components/stat-card";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { AlertBanner } from "@/components/enterprise/alert-banner";
import { DataPanel, DataPanelBody, DataPanelHeader } from "@/components/enterprise/data-panel";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DashboardProfitTrendChart,
  DashboardSalesTrendChart,
  DashboardTopProductsChart,
} from "@/components/dashboard/dashboard-charts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { alerts, refresh: refreshAlerts } = useAlerts();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    api
      .get<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((e) => {
        toast.error(e instanceof ApiError ? e.message : "Could not load dashboard");
      })
      .finally(() => setLoading(false));
    refreshAlerts();
  }, [authLoading, user, refreshAlerts]);

  const isOwner = data?.isOwnerView ?? user?.role === "Owner";
  const todayGross = data?.todaySales ?? data?.myTodaySales ?? 0;
  const todayNet = data?.todayNetSales ?? todayGross;
  const todayReturns = data?.todayReturns ?? 0;
  const todayCollected = data?.todayCollected ?? 0;

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.fullName?.split(" ")[0] ?? "there"}`}
        description={
          isOwner
            ? "Operational overview — sales, inventory alerts, and pending approvals"
            : "Your counter summary for today"
        }
        action={
          <Link href="/pos" className={cn(buttonVariants({ size: "sm" }))}>
            Open POS
          </Link>
        }
      />

      {loading && !data ? <DashboardSkeleton /> : null}

      {!loading || data ? (
      <>
      <div className="mb-6 space-y-2">
        {isOwner && (alerts?.pendingReceivingsCount ?? 0) > 0 && (
          <AlertBanner
            tone="warning"
            icon={Truck}
            message={`${alerts?.pendingReceivingsCount} stock receiving request(s) awaiting approval`}
            href="/stock-receiving?status=0"
            actionLabel="Review"
          />
        )}
        {isOwner && (alerts?.pendingAdjustmentsCount ?? 0) > 0 && (
          <AlertBanner
            tone="info"
            icon={SlidersHorizontal}
            message={`${alerts?.pendingAdjustmentsCount} inventory adjustment(s) awaiting approval`}
            href="/adjustments?status=0"
            actionLabel="Review"
          />
        )}
        {(alerts?.lowStockCount ?? 0) > 0 && (
          <AlertBanner
            tone="danger"
            icon={AlertTriangle}
            message={`${alerts?.lowStockCount} product(s) below reorder threshold`}
            href="/inventory"
            actionLabel="Inventory"
          />
        )}
        {(alerts?.overdueReceivablesCount ?? 0) > 0 && (
          <AlertBanner
            tone="danger"
            icon={Receipt}
            message={`${alerts?.overdueReceivablesCount} overdue receivable(s) — ${formatCurrency(alerts?.totalReceivablesOutstanding ?? 0)} outstanding`}
            href="/receivables?status=overdue"
            actionLabel="Receivables"
          />
        )}
        {isOwner && data?.profitMissingCostWarning && (
          <AlertBanner
            tone="warning"
            icon={AlertTriangle}
            message="Profit may be overstated — products with missing cost were included in today's sales."
            href="/products"
            actionLabel="Products"
          />
        )}
      </div>

      {isOwner ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Net invoice sales today"
            value={formatCurrency(todayNet)}
            subtitle={`Gross ${formatCurrency(data?.storeTodaySales ?? 0)}`}
            icon={Receipt}
            accent="sales"
          />
          <StatCard
            title="Collected today"
            value={formatCurrency(todayCollected)}
            subtitle="Cash, bank, QR, and paid receivables"
            icon={PhilippinePeso}
            accent="sales"
          />
          <StatCard
            title="Today profit (net)"
            value={formatCurrency(data?.todayProfit ?? 0)}
            subtitle={
              (data?.todayReturnsProfitReversed ?? 0) > 0
                ? `Sales margin ${formatCurrency(data?.todaySalesProfit ?? 0)} − returns ${formatCurrency(data?.todayReturnsProfitReversed ?? 0)}`
                : "After today's return reversals · cost locked at sale"
            }
            icon={TrendingUp}
            accent="profit"
          />
          <StatCard
            title="Inventory value"
            value={formatCurrency(data?.inventoryValue ?? 0)}
            subtitle="At cost"
            icon={Package}
            accent="inventory"
          />
        </div>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <StatCard
            title="Gross sales today"
            value={formatCurrency(todayGross)}
            subtitle={`${data?.todayTransactions ?? 0} invoices you completed`}
            icon={Receipt}
            accent="sales"
          />
          <StatCard
            title="Collection today"
            value={formatCurrency(todayCollected)}
            subtitle="Cash, bank, QR, and receivable payments received"
            icon={PhilippinePeso}
            accent="sales"
          />
          <StatCard
            title="Exchanges processed"
            value={formatCurrency(todayReturns)}
            subtitle={
              todayReturns > 0
                ? "Return credit on GRS today — original invoices unchanged, no cash refund"
                : "No exchanges yet today"
            }
            icon={RotateCcw}
            accent="returns"
          />
        </div>
      )}

      {isOwner && (
        <>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Today by who processed the sale
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cashier vs owner role — separate totals for easy comparison
            </p>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <RoleSalesHighlightCard
              role="cashier"
              netSales={data?.cashierRoleTodayNetSales ?? 0}
              grossSales={data?.cashierRoleTodaySales ?? 0}
              transactions={data?.cashierRoleTodayTransactions ?? 0}
            />
            <RoleSalesHighlightCard
              role="owner"
              netSales={data?.ownerRoleTodayNetSales ?? 0}
              grossSales={data?.ownerRoleTodaySales ?? 0}
              transactions={data?.ownerRoleTodayTransactions ?? 0}
            />
          </div>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Month sales"
              value={formatCurrency(data?.monthSales ?? 0)}
              subtitle={`Profit ${formatCurrency(data?.monthProfit ?? 0)}`}
              accent="sales"
            />
            <StatCard
              title="Returns today"
              value={formatCurrency(todayReturns)}
              subtitle="GRS (store total)"
              icon={RotateCcw}
              accent="returns"
            />
            <StatCard
              title="Active products"
              value={String(data?.totalProducts ?? 0)}
            />
          </div>
        </>
      )}

      {isOwner && (data?.profitLast7Days?.length ?? 0) > 0 && (
        <div className="mb-4">
          <DashboardProfitTrendChart days={data!.profitLast7Days!} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DataPanel>
          <DataPanelHeader>
            <h2 className="text-sm font-semibold">Last 7 days — invoice sales and collections</h2>
          </DataPanelHeader>
          <DataPanelBody className="space-y-4 p-4">
            <DashboardSalesTrendChart days={data?.last7Days ?? []} />
            <ResponsiveDataView
              className="-mx-1 rounded-lg border border-border/60"
              mobile={
                <>
                  {data?.last7Days.map((day) => {
                    const net = day.netTotal ?? day.total - (day.returns ?? 0);
                    return (
                      <RecordMobileCard
                        key={day.date}
                        title={day.date}
                        subtitle={`${day.count ?? 0} transactions`}
                        meta={
                          <span>
                            Collected {formatCurrency(day.collected ?? 0)} · Returns {formatCurrency(day.returns ?? 0)}
                          </span>
                        }
                        amount={formatCurrency(net)}
                      />
                    );
                  })}
                  {!data?.last7Days.length && (
                    <EmptyState compact title="No sales data yet" />
                  )}
                </>
              }
            >
            <Table enterprise>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Returns</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.last7Days.map((day) => {
                  const net = day.netTotal ?? day.total - (day.returns ?? 0);
                  return (
                    <TableRow key={day.date}>
                      <TableCell>{day.date}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(day.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(day.returns ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(net)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(day.collected ?? 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!data?.last7Days.length && (
                  <TableEmptyRow colSpan={5} title="No sales data yet" />
                )}
              </TableBody>
            </Table>
            </ResponsiveDataView>
          </DataPanelBody>
        </DataPanel>

        <DataPanel>
          <DataPanelHeader>
            <h2 className="text-sm font-semibold">Top products (30 days)</h2>
            <Link
              href="/reports"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
            >
              Reports <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </DataPanelHeader>
          <DataPanelBody className="space-y-4 p-4">
            <DashboardTopProductsChart products={data?.topProducts ?? []} />
            <ResponsiveDataView
              className="-mx-1 rounded-lg border border-border/60"
              mobile={
                <>
                  {data?.topProducts.map((p) => (
                    <RecordMobileCard
                      key={p.productId ?? p.productSku ?? p.productName}
                      title={p.productName}
                      subtitle={p.productSku ?? undefined}
                      meta={<span>Qty sold: {p.quantitySold}</span>}
                      amount={formatCurrency(p.revenue)}
                    />
                  ))}
                  {!data?.topProducts.length && (
                    <EmptyState compact title="No sales data yet" />
                  )}
                </>
              }
            >
            <Table enterprise>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Invoice revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.topProducts.map((p) => (
                  <TableRow key={p.productId ?? p.productSku ?? p.productName}>
                    <TableCell>
                      <span className="font-medium">{p.productName}</span>
                      {p.productSku && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {p.productSku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantitySold}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.topProducts.length && (
                  <TableEmptyRow colSpan={3} title="No sales data yet" />
                )}
              </TableBody>
            </Table>
            </ResponsiveDataView>
          </DataPanelBody>
        </DataPanel>
      </div>
      </>
      ) : null}
    </div>
  );
}
