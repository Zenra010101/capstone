/** Shown instantly while a module page chunk loads */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-7 w-52 max-w-[70%] rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted/70" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] rounded-lg border border-border/60 bg-muted/40" />
        ))}
      </div>
      <div className="h-12 rounded-lg border border-border/60 bg-muted/30" />
      <div className="h-[min(24rem,50vh)] rounded-lg border border-border/60 bg-muted/25" />
    </div>
  );
}
