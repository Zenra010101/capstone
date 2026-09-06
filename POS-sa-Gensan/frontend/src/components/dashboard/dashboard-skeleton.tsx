import { Skeleton } from "@/components/ui/skeleton";
import { KpiGrid } from "@/components/enterprise/kpi-grid";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <KpiGrid>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
