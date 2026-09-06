import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CARD_ACTION_SELECTOR =
  "button, a, input, select, textarea, label, [data-card-action], [role='menuitem'], [data-slot='dropdown-menu-trigger']";

export function RecordMobileCard({
  title,
  subtitle,
  meta,
  badge,
  amount,
  amountTone = "neutral",
  onOpen,
  onAction,
  actionLabel = "View",
  className,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  amount?: string;
  amountTone?: "neutral" | "positive" | "negative" | "warning";
  onOpen?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const amountClass =
    amountTone === "positive"
      ? "text-amount-positive"
      : amountTone === "negative"
        ? "text-amount-negative"
        : amountTone === "warning"
          ? "text-warning"
          : "text-foreground";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3.5 shadow-erp",
        onOpen && "cursor-pointer active:bg-muted/40",
        className
      )}
      aria-label={onOpen ? `View ${title}` : undefined}
      title={onOpen ? "Click to view details" : undefined}
      onClick={(e) => {
        if (!onOpen) return;
        const target = e.target as HTMLElement;
        if (target.closest(CARD_ACTION_SELECTOR)) return;
        onOpen();
      }}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium text-foreground" title={title}>{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {amount ? (
          <p className={cn("shrink-0 text-sm font-semibold tabular-nums", amountClass)}>
            {amount}
          </p>
        ) : null}
      </div>
      {meta || badge ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {badge}
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
        </div>
      ) : null}
      {onAction ? (
        <div className="mt-3 border-t border-border/60 pt-3" data-card-action>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onAction()}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
