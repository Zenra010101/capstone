import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardAccent = "sales" | "inventory" | "profit" | "returns";

const accentStyles: Record<
  StatCardAccent,
  { border: string; icon: string }
> = {
  sales: {
    border: "border-t-primary/70",
    icon: "border-primary/20 bg-primary/5 text-primary",
  },
  inventory: {
    border: "border-t-amber-500/70",
    icon: "border-amber-200/80 bg-amber-50/80 text-amber-700",
  },
  profit: {
    border: "border-t-green-600/70",
    icon: "border-green-200/80 bg-green-50/80 text-green-700",
  },
  returns: {
    border: "border-t-red-500/70",
    icon: "border-red-200/80 bg-red-50/80 text-red-700",
  },
};

/** Compact KPI tile — operational summaries, not decorative widgets */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  className,
  active,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: StatCardAccent;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const accentStyle = accent ? accentStyles[accent] : null;

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {Icon && (
        <div
          className={cn(
            "rounded-md border p-2",
            accentStyle?.icon ?? "border-border/60 bg-muted/40 text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );

  const shellClass = cn(
    "rounded-lg border border-border bg-card px-3 py-3 shadow-erp sm:px-4 sm:py-3.5",
    accentStyle && "border-t-2",
    accentStyle?.border,
    className
  );

  if (!onClick) {
    return <div className={shellClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left transition-colors",
        shellClass,
        active
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "hover:border-border/80 hover:bg-muted/20"
      )}
    >
      {content}
    </button>
  );
}
