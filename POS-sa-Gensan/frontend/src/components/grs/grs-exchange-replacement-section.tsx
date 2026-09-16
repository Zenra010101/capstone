"use client";



import { useMemo, useState } from "react";

import { Search, X } from "lucide-react";

import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";

import { asList, type ListResponse } from "@/lib/api-shapes";

import { formatCurrency, formatProductSpec } from "@/lib/format";

import { useDebouncedEffect } from "@/lib/use-debounced-effect";

import type { Product } from "@/lib/types";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";



export type ReplacementLine = {

  product: Product;

  qty: string;

};



type Props = {

  creditTotal: number;

  lines: ReplacementLine[];

  onLinesChange: (lines: ReplacementLine[]) => void;

};



function parseQty(raw: string): number | null {

  if (raw.trim() === "") return null;

  const q = parseInt(raw, 10);

  return Number.isNaN(q) ? null : q;

}



export function computeReplacementTotal(lines: ReplacementLine[]): number {

  return lines.reduce((sum, l) => {

    const q = parseQty(l.qty);

    if (q == null || q <= 0) return sum;

    return sum + l.product.unitPrice * q;

  }, 0);

}



export function GrsExchangeReplacementSection({ creditTotal, lines, onLinesChange }: Props) {

  const [search, setSearch] = useState("");

  const [results, setResults] = useState<Product[]>([]);

  const [searching, setSearching] = useState(false);



  useDebouncedEffect(() => {

    if (!search.trim()) {

      setResults([]);

      return;

    }

    setSearching(true);

    api

      .get<ListResponse<Product>>(`/api/products?search=${encodeURIComponent(search.trim())}`)

      .then((data) =>

        setResults(asList(data).filter((p) => p.isActive && p.stockQuantity > 0).slice(0, 8))

      )

      .catch(() => setResults([]))

      .finally(() => setSearching(false));

  }, [search], 350);



  const replacementTotal = useMemo(() => computeReplacementTotal(lines), [lines]);

  const shortfall = Math.max(0, creditTotal - replacementTotal);



  const lineValidation = useMemo(() => {

    if (lines.length === 0) return { ok: false, message: "Add at least one replacement product." };

    const invalidStock = lines.find((l) => {

      const q = parseQty(l.qty);

      return q != null && q > 0 && q > l.product.stockQuantity;

    });

    if (invalidStock)

      return {

        ok: false,

        message: `Insufficient stock for ${invalidStock.product.name} (max ${invalidStock.product.stockQuantity}).`,

      };

    if (replacementTotal < creditTotal)

      return {

        ok: false,

        message: `Add ${formatCurrency(shortfall)} more in replacement products.`,

      };

    if (lines.some((l) => !parseQty(l.qty) || (parseQty(l.qty) ?? 0) <= 0))

      return { ok: false, message: "Enter quantity for each replacement line." };

    return { ok: true, message: null };

  }, [lines, creditTotal, replacementTotal, shortfall]);



  const addProduct = (p: Product) => {

    if (lines.some((l) => l.product.id === p.id)) {

      toast.error("Product already in replacement list");

      return;

    }

    onLinesChange([...lines, { product: p, qty: "1" }]);

    setSearch("");

    setResults([]);

  };



  return (

    <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">

      <div>

        <Label className="text-sm font-semibold">Replacement items</Label>

        <p className="text-xs text-muted-foreground mt-0.5">

          Replacement total must be at least the return credit. No cash refund.

        </p>

      </div>



      <div className="relative">

        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input

          className="pl-10"

          placeholder="Search product name, SKU, or scan barcode..."

          value={search}

          onChange={(e) => setSearch(e.target.value)}

        />

      </div>



      {searching && <p className="text-xs text-muted-foreground">Searching…</p>}



      {results.length > 0 && (

        <ul className="max-h-40 overflow-y-auto rounded-md border bg-card divide-y">

          {results.map((p) => (

            <li key={p.id}>

              <button

                type="button"

                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60"

                onClick={() => addProduct(p)}

              >

                <span className="font-medium">{p.name}</span>

                <span className="ml-2 text-muted-foreground">

                  {formatCurrency(p.unitPrice)} · Stock {p.stockQuantity} {p.unitOfMeasure}

                </span>

                {formatProductSpec(p) && (

                  <span className="block text-xs text-muted-foreground">{formatProductSpec(p)}</span>

                )}

              </button>

            </li>

          ))}

        </ul>

      )}



      {lines.length > 0 && (

        <div className="space-y-2">

          {lines.map((l, idx) => {

            const q = parseQty(l.qty);

            const lineTotal = q && q > 0 ? l.product.unitPrice * q : 0;

            const overStock = q != null && q > l.product.stockQuantity;

            return (

              <div

                key={l.product.id}

                className={cn(

                  "flex gap-2 rounded-md border bg-card p-2",

                  overStock && "border-destructive/60"

                )}

              >

                <div className="min-w-0 flex-1">

                  <p className="text-sm font-medium line-clamp-2">{l.product.name}</p>

                  <p className="text-xs text-muted-foreground">

                    {formatCurrency(l.product.unitPrice)} / {l.product.unitOfMeasure} · Stock{" "}

                    {l.product.stockQuantity}

                  </p>

                </div>

                <Input

                  type="number"

                  min={1}

                  max={l.product.stockQuantity}

                  className="w-16"

                  value={l.qty}

                  onChange={(e) => {

                    const next = [...lines];

                    next[idx] = { ...l, qty: e.target.value };

                    onLinesChange(next);

                  }}

                />

                <span className="w-20 text-right text-sm font-medium tabular-nums pt-2">

                  {formatCurrency(lineTotal)}

                </span>

                <Button

                  type="button"

                  size="icon"

                  variant="ghost"

                  className="shrink-0"

                  aria-label="Remove"

                  onClick={() => onLinesChange(lines.filter((_, i) => i !== idx))}

                >

                  <X className="h-4 w-4" />

                </Button>

              </div>

            );

          })}

        </div>

      )}



      {!lineValidation.ok && lineValidation.message && (

        <p className="text-xs font-medium text-destructive">✗ {lineValidation.message}</p>

      )}

    </div>

  );

}



export function isExchangeReplacementValid(
  creditTotal: number,
  lines: ReplacementLine[]
): boolean {
  if (lines.length === 0) return false;
  let replacementTotal = 0;
  for (const l of lines) {
    const q = parseQty(l.qty);
    if (q == null || q <= 0) return false;
    if (q > l.product.stockQuantity) return false;
    replacementTotal += l.product.unitPrice * q;
  }
  return replacementTotal >= creditTotal - 0.001;
}


