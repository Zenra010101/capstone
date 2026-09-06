import { cn } from "@/lib/utils";

/** Operational table wrapper — horizontal scroll, sticky header, no clip */
export function TableShell({
  children,
  className,
  footer,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className={cn("rounded-lg border border-border bg-card shadow-erp", className)}>
      <div className="erp-table-scroll">{children}</div>
      {footer}
    </div>
  );
}
