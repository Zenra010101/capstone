"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

type Hit = {
  id: string;
  label: string;
  subtitle?: string;
  route: string;
};

type SearchResult = {
  products: Hit[];
  customers: Hit[];
  suppliers: Hit[];
};

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SearchResult>(
        `/api/search?q=${encodeURIComponent(term.trim())}`
      );
      setResult(data);
      setOpen(true);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 300);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (route: string) => {
    setOpen(false);
    setQ("");
    setResult(null);
    router.push(route);
  };

  const hasHits =
    result &&
    (result.products.length > 0 ||
      result.customers.length > 0 ||
      result.suppliers.length > 0);

  const resultsId = "global-search-results";
  const listOpen = open && q.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 lg:max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-8 border-border/80 bg-muted/30 pl-8 text-sm"
        placeholder="Search products, customers…"
        value={q}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listOpen ? resultsId : undefined}
        aria-autocomplete="list"
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
      />
      {listOpen && (
        <div
          id={resultsId}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full z-50 mt-1 w-full max-w-[min(calc(100vw-1rem),24rem)] rounded-lg border border-border/80 bg-popover py-2 shadow-lg"
        >
          {loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground" aria-live="polite">
              Searching…
            </p>
          )}
          {!loading && !hasHits && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
          )}
          {!loading && hasHits && result && (
            <div className="max-h-72 overflow-y-auto">
              {result.products.length > 0 && (
                <Section title="Products">
                  {result.products.map((h) => (
                    <HitRow key={h.id} hit={h} onPick={go} />
                  ))}
                </Section>
              )}
              {result.customers.length > 0 && (
                <Section title="Customers">
                  {result.customers.map((h) => (
                    <HitRow key={h.id} hit={h} onPick={go} />
                  ))}
                </Section>
              )}
              {result.suppliers.length > 0 && (
                <Section title="Suppliers">
                  {result.suppliers.map((h) => (
                    <HitRow key={h.id} hit={h} onPick={go} />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/50 last:border-0">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function HitRow({ hit, onPick }: { hit: Hit; onPick: (route: string) => void }) {
  return (
    <button
      type="button"
      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/60"
      onClick={() => onPick(hit.route)}
    >
      <span className="font-medium">{hit.label}</span>
      {hit.subtitle && (
        <span className="text-xs text-muted-foreground">{hit.subtitle}</span>
      )}
    </button>
  );
}
