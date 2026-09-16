"use client";

import { memo } from "react";
import type { Product } from "@/lib/types";
import { formatCurrency, formatProductSpec } from "@/lib/format";

type Props = {
  product: Product;
  onAdd: (product: Product) => void;
};

function PosProductTileInner({ product, onAdd }: Props) {
  const spec = formatProductSpec(product);
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="flex min-h-[8.5rem] min-w-0 flex-col rounded-md border border-border/80 bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/30"
    >
      <p
        className="line-clamp-3 break-words text-[15px] font-semibold leading-snug text-foreground"
        title={product.name}
      >
        {product.name}
      </p>
      {spec ? (
        <p
          className="mt-1 line-clamp-2 break-words text-xs leading-snug text-muted-foreground"
          title={spec}
        >
          {spec}
        </p>
      ) : null}
      <p className="mt-2 flex min-w-0 items-baseline text-xl font-bold leading-none text-primary">
        <span className="truncate">{formatCurrency(product.unitPrice)}</span>
        <span className="ml-1 shrink-0 text-xs font-normal text-muted-foreground">
          / {product.unitOfMeasure}
        </span>
      </p>
      <p className="mt-auto truncate whitespace-nowrap text-xs leading-4 text-muted-foreground">
        Stock: {product.stockQuantity} {product.unitOfMeasure}
      </p>
    </button>
  );
}

export const PosProductTile = memo(PosProductTileInner);
