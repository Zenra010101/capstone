import { Suspense } from "react";
import { PageSkeleton } from "@/components/enterprise/page-skeleton";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
