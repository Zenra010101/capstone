import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Standardized empty / no-results state for tables, lists, and panels.
 * Icon-agnostic: pass any component that accepts a `className` (e.g. a lucide icon).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-12",
        className
      )}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Standardized full-width empty row for operational tables. */
export function TableEmptyRow({
  colSpan,
  title,
  description,
  icon,
  action,
}: {
  colSpan: number;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState
          compact
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </TableCell>
    </TableRow>
  );
}
