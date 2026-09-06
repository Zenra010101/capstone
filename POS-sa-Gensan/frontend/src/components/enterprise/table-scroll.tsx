import { cn } from "@/lib/utils";

/** Wrap wide data tables so they scroll horizontally on laptop and phone */
export function TableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
        className
      )}
    >
      {children}
    </div>
  );
}
