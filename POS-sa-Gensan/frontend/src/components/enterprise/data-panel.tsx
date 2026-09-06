import { cn } from "@/lib/utils";

/** Standard bordered panel for filters, tables, and form sections */
export function DataPanel({
  children,
  className,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card shadow-erp",
        !noPadding && "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DataPanelHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DataPanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4", className)}>{children}</div>;
}

export function DataPanelFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}
