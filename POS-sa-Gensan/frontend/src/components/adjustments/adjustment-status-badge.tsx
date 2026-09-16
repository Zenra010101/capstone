import { Badge } from "@/components/ui/badge";
import { ADJUSTMENT_STATUS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AdjustmentStatusBadge({ status, label }: { status: number; label?: string }) {
  const meta = ADJUSTMENT_STATUS[status];
  return (
    <Badge variant="outline" className={cn("h-5 text-[11px] font-medium", meta?.className)}>
      {label ?? meta?.label ?? "Unknown"}
    </Badge>
  );
}
