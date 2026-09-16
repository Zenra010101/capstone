"use client";

import { Badge } from "@/components/ui/badge";
import { SUPPLIER_STATUS, SupplierStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SupplierStatusBadge({
  status,
  label,
}: {
  status: SupplierStatus;
  label?: string;
}) {
  const meta = SUPPLIER_STATUS[status];
  return (
    <Badge variant="outline" className={cn("h-5 text-[11px] font-medium", meta?.className)}>
      {label ?? meta?.label ?? "Unknown"}
    </Badge>
  );
}
