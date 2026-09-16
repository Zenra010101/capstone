import { cn } from "@/lib/utils";

/** Filters: horizontal grid on desktop, stacked on laptop/tablet/mobile */
export function FilterBar({
  children,
  className,
  footer,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  /** Tighter padding, inline footer — for data pages where filters should not dominate */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("px-3 py-2 sm:px-4", className)}>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          {children}
          {footer ? (
            <div className="flex flex-wrap items-center gap-2 pb-0.5 sm:ml-auto">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border-b border-border/60", className)}>
      <div className="erp-filter-grid px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3 sm:px-5">
          {footer}
        </div>
      )}
    </div>
  );
}

export function FilterField({
  children,
  className,
  span = 1,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** 2 = double width on xl grid */
  span?: 1 | 2;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={cn("min-w-0 space-y-0.5", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 space-y-1.5",
        span === 2 && "xl:col-span-2",
        className
      )}
    >
      {children}
    </div>
  );
}
