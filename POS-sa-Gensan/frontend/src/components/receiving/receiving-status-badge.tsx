"use client";

import { Badge } from "@/components/ui/badge";
import { RECEIVING_STATUS, StockReceivingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReceivingStatusBadge({
  status,
  label,
}: {
  status: StockReceivingStatus;
  label?: string;
}) {
  const meta = RECEIVING_STATUS[status];
  return (
    <Badge
      variant="outline"
      className={cn("h-5 text-[11px] font-medium", meta?.className)}
    >
      {label ?? meta?.label ?? "Unknown"}
    </Badge>
  );
}
