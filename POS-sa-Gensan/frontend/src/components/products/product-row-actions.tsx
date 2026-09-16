"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProductRowActionsProps = {
  product: Product;
  isOwner: boolean;
  canPrintBarcodes: boolean;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onInventoryHistory: (product: Product) => void;
  onPriceHistory: (product: Product) => void;
  onBarcode: (product: Product) => void;
  onDeactivate: (product: Product) => void;
};

export function ProductRowActions({
  product,
  isOwner,
  canPrintBarcodes,
  onView,
  onEdit,
  onInventoryHistory,
  onPriceHistory,
  onBarcode,
  onDeactivate,
}: ProductRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(product)}>View</DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem onClick={() => onEdit(product)}>Edit</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onInventoryHistory(product)}>
          Inventory history
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem onClick={() => onPriceHistory(product)}>
            Price history
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {canPrintBarcodes ? (
          <DropdownMenuItem onClick={() => onBarcode(product)}>
            Print barcode
          </DropdownMenuItem>
        ) : null}
        {isOwner && product.isActive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDeactivate(product)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate product
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
