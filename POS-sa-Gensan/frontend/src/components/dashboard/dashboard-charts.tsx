"use client";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatChartDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type SalesDay = {
  date: string;
  total: number;
  returns?: number;
  netTotal?: number;
  collected?: number;
};

export function DashboardSalesTrendChart({
  days,
  className,
}: {
  days: SalesDay[];
  className?: string;
}) {
  if (!days.length) {
    return (
      <div
        className={cn(
          "flex h-44 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground",
          className
        )}
      >
        No chart data yet
      </div>
    );
  }

  const points = days.map((day) => {
    const net = day.netTotal ?? day.total - (day.returns ?? 0);
    return {
      label: formatChartDate(day.date),
      net,
      collected: day.collected ?? 0,
    };
  });

  const max = Math.max(1, ...points.flatMap((p) => [p.net, p.collected]));

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/15 bg-gradient-to-b from-primary/[0.06] via-card to-card p-4 shadow-erp",
        className
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          7-day trend
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden />
            Net invoice
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-2" aria-hidden />
            Collected
          </span>
        </div>
      </div>

      <div
        className="flex h-48 items-end justify-between gap-1.5 sm:gap-2.5"
        role="img"
        aria-label="Last seven days net sales and collections bar chart"
      >
        {points.map((point) => (
          <div
            key={point.label}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div className="flex h-40 w-full max-w-[3.5rem] items-end justify-center gap-1">
              <div
                className="w-[46%] rounded-t-md bg-primary shadow-sm transition-all group-hover:bg-primary/90"
                style={{
                  height: `${Math.max((point.net / max) * 100, point.net > 0 ? 6 : 0)}%`,
                }}
                title={`Net: ${formatCurrency(point.net)}`}
              />
              <div
                className="w-[46%] rounded-t-md bg-chart-2 shadow-sm transition-all group-hover:opacity-90"
                style={{
                  height: `${Math.max((point.collected / max) * 100, point.collected > 0 ? 6 : 0)}%`,
                }}
                title={`Collected: ${formatCurrency(point.collected)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TopProduct = {
  productId?: string;
  productSku?: string;
  productName: string;
  quantitySold: number;
  revenue: number;
};

export function DashboardTopProductsChart({
  products,
  className,
}: {
  products: TopProduct[];
  className?: string;
}) {
  if (!products.length) {
    return (
      <div
        className={cn(
          "flex h-44 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground",
          className
        )}
      >
        No chart data yet
      </div>
    );
  }

  const rows = products.slice(0, 8);
  const max = Math.max(1, ...rows.map((p) => p.revenue));

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/15 bg-gradient-to-b from-chart-2/10 via-card to-card p-4 shadow-erp",
        className
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Revenue share (top {rows.length})
      </p>
      <div className="space-y-3" role="img" aria-label="Top products revenue bar chart">
        {rows.map((p, i) => (
          <div key={p.productId ?? p.productSku ?? p.productName}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium text-foreground" title={p.productName}>
                {p.productName}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(p.revenue)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/80">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  i === 0 ? "bg-primary" : "bg-chart-2/80"
                )}
                style={{ width: `${Math.max((p.revenue / max) * 100, p.revenue > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ProfitDay = { date: string; sales: number; profit: number };

export function DashboardProfitTrendChart({
  days,
  className,
}: {
  days: ProfitDay[];
  className?: string;
}) {
  if (!days.length) return null;

  const points = days.map((d) => ({
    label: formatChartDate(d.date),
    profit: d.profit,
    sales: d.sales,
  }));

  const max = Math.max(1, ...points.flatMap((p) => [p.profit, p.sales]));

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/15 bg-gradient-to-b from-primary/[0.06] via-card to-card p-4 shadow-erp",
        className
      )}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Profit trend (7 days)
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-3" aria-hidden />
            Net sales
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden />
            Profit
          </span>
        </div>
      </div>
      <div className="flex h-40 items-end justify-between gap-1.5 sm:gap-2.5">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-32 w-full max-w-[3.5rem] items-end justify-center gap-1">
              <div
                className="w-[46%] rounded-t-md bg-chart-3"
                style={{
                  height: `${Math.max((point.sales / max) * 100, point.sales > 0 ? 6 : 0)}%`,
                }}
                title={`Sales: ${formatCurrency(point.sales)}`}
              />
              <div
                className="w-[46%] rounded-t-md bg-primary"
                style={{
                  height: `${Math.max((point.profit / max) * 100, point.profit > 0 ? 6 : 0)}%`,
                }}
                title={`Profit: ${formatCurrency(point.profit)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-muted-foreground">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
