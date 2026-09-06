import { Suspense } from "react";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading POS…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
