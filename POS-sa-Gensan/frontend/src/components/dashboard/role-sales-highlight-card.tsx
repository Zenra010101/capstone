import { Store, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type Role = "cashier" | "owner";

const ROLE_STYLE: Record<
  Role,
  {
    label: string;
    badge: string;
    card: string;
    value: string;
    iconWrap: string;
    icon: typeof UserRound;
    metricLabel: string;
  }
> = {
  cashier: {
    label: "Cashier role",
    badge: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80",
    card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-card to-card shadow-[0_1px_0_0_rgba(14,116,144,0.08)]",
    value: "text-sky-950",
    iconWrap: "bg-sky-500/15 text-sky-700",
    icon: UserRound,
    metricLabel: "Net today (cashier invoices)",
  },
  owner: {
    label: "Owner role",
    badge: "bg-amber-100 text-amber-950 ring-1 ring-amber-200/80",
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-card to-card shadow-[0_1px_0_0_rgba(180,120,20,0.08)]",
    value: "text-amber-950",
    iconWrap: "bg-amber-500/15 text-amber-800",
    icon: Store,
    metricLabel: "Net today (owner invoices)",
  },
};

type Props = {
  role: Role;
  netSales: number;
  grossSales: number;
  transactions: number;
};

export function RoleSalesHighlightCard({
  role,
  netSales,
  grossSales,
  transactions,
}: Props) {
  const style = ROLE_STYLE[role];
  const Icon = style.icon;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border-2 px-4 py-4 sm:px-5 sm:py-5",
        style.card
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1.5",
          role === "cashier" ? "bg-sky-500" : "bg-amber-500"
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                style.badge
              )}
            >
              {style.label}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {style.metricLabel}
            </span>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Net invoice sales
            </p>
            <p
              className={cn(
                "mt-0.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
                style.value
              )}
            >
              {formatCurrency(netSales)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Gross</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(grossSales)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Invoices</span>
              <span className="font-semibold tabular-nums text-foreground">
                {transactions}
              </span>
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            style.iconWrap
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </article>
  );
}
