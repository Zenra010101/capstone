import { Badge } from "@/components/ui/badge";
import { StockStatus } from "@/lib/types";
import { softBadge } from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";

const styles: Record<StockStatus, string> = {
  [StockStatus.InStock]:
    "border-green-300 bg-green-50 text-green-800 ring-1 ring-green-200/60",
  [StockStatus.LowStock]:
    "border-amber-300 bg-amber-50 text-amber-900 ring-1 ring-amber-200/70",
  [StockStatus.Critical]:
    "border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200/70",
  [StockStatus.OutOfStock]:
    "border-red-400 bg-red-50 text-red-900 ring-1 ring-red-300/70",
};

export function stockStatusRowClass(status: StockStatus, inactive?: boolean): string | undefined {
  if (inactive) return undefined;
  if (status === StockStatus.LowStock) return "bg-amber-50/40";
  if (status === StockStatus.Critical || status === StockStatus.OutOfStock) {
    return "bg-red-50/35";
  }
  return undefined;
}

export function StockStatusBadge({
  status,
  label,
  inactive,
  inactiveLabel = "Inactive",
  prominent,
}: {
  status: StockStatus;
  label: string;
  inactive?: boolean;
  inactiveLabel?: string;
  prominent?: boolean;
}) {
  const sizeClass = prominent
    ? "h-6 px-2.5 text-xs font-semibold"
    : "h-6 px-2 text-xs font-semibold";

  if (inactive) {
    return (
      <Badge variant="outline" className={cn(sizeClass, softBadge.neutral)}>
        {inactiveLabel}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(sizeClass, styles[status])}>
      {label}
    </Badge>
  );
}
