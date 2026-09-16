import { Suspense } from "react";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading inventory…</p>}>
      {children}
    </Suspense>
  );
}
