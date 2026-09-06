"use client";

import { Badge } from "@/components/ui/badge";
import { EXPENSE_STATUS } from "@/lib/types";

export function ExpenseStatusBadge({ status, label }: { status: number; label?: string }) {
  const meta = EXPENSE_STATUS[status] ?? { label: label ?? "Unknown", className: "border-border bg-muted" };
  return (
    <Badge variant="outline" className={meta.className}>
      {label ?? meta.label}
    </Badge>
  );
}
