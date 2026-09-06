import { Badge } from "@/components/ui/badge";
import { softBadge } from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Sale: softBadge.danger,
  "Stock Receiving": softBadge.success,
  "Return / GRS": softBadge.info,
  Adjustment: softBadge.warning,
  "Manual Correction": softBadge.neutral,
};

export function MovementTypeBadge({
  type,
  label,
}: {
  type?: string;
  /** @deprecated use type */
  label?: string;
}) {
  const text = type ?? label ?? "—";
  return (
    <Badge variant="outline" className={cn("font-normal", styles[text] ?? softBadge.neutral)}>
      {text}
    </Badge>
  );
}
