import { cn } from "@/lib/utils";

export function KpiGrid({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4 | 5;
}) {
  const colClass =
    cols === 5
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("erp-kpi-grid", colClass, className)}>{children}</div>
  );
}
