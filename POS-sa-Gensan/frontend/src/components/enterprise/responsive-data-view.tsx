import { cn } from "@/lib/utils";

/**
 * Desktop/tablet: full data table with horizontal scroll.
 * Mobile (< md): compact card list for monitoring / approvals / lookup.
 */
export function ResponsiveDataView({
  mobile,
  children,
  className,
  mobileClassName,
}: {
  mobile: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
}) {
  return (
    <>
      <div className={cn("erp-mobile-only space-y-2.5 p-3 sm:p-4", mobileClassName)}>
        {mobile}
      </div>
      <div className={cn("erp-desktop-only", className)}>{children}</div>
    </>
  );
}
