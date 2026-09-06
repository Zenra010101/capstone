import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page-container animate-in fade-in duration-200", className)}>
      {children}
    </div>
  );
}
