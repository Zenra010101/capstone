import type { CartBatchLine, CartItem } from "@/lib/types";

export function cartItemLineTotal(item: CartItem): number {
  if (item.batchLines.length > 0) {
    return item.batchLines.reduce((s, l) => s + l.subtotal, 0) - item.discount;
  }
  return item.product.unitPrice * item.quantity - item.discount;
}

export function cartHasBatchBreakdown(item: CartItem): boolean {
  return item.batchLines.length > 1;
}

export function cartItemDisplayPrice(item: CartItem): number {
  if (item.batchLines.length === 1) {
    return item.batchLines[0].sellingPrice;
  }
  if (item.batchLines.length > 1) {
    return item.batchLines[0].sellingPrice;
  }
  return item.product.unitPrice;
}

export function mapAllocationLines(lines: CartBatchLine[]): CartBatchLine[] {
  return lines.map((l) => ({
    batchId: l.batchId,
    batchCode: l.batchCode,
    quantity: l.quantity,
    sellingPrice: l.sellingPrice,
    costPrice: l.costPrice,
    subtotal: l.subtotal,
  }));
}

export function buildCheckoutItems(cart: CartItem[]) {
  return cart.flatMap((i) => {
    if (i.batchLines.length > 0) {
      return i.batchLines.map((line, idx) => ({
        productId: i.product.id,
        productBatchId: line.batchId,
        quantity: line.quantity,
        discount: idx === 0 ? i.discount : 0,
      }));
    }
    return [
      {
        productId: i.product.id,
        quantity: i.quantity,
        discount: i.discount,
      },
    ];
  });
}
