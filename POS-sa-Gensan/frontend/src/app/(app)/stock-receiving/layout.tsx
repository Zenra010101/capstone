import { Suspense } from "react";

export default function StockReceivingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading...</p>}>
      {children}
    </Suspense>
  );
}
