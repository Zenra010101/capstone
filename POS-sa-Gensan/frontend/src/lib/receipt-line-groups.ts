import type { SaleItem } from "@/lib/types";

/** Receipt table row — display only; may merge multiple SaleItems. */
export type ReceiptDisplayLine = {
  key: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

function receiptUnitPrice(item: SaleItem): number {
  return item.sellingPriceAtSale ?? item.unitPrice;
}

/**
 * Groups sale lines for customer receipt display.
 * Same product + same selling price → one row (qty/discount/amount summed).
 * Same product + different selling prices → separate rows (FIFO transparency).
 */
export function groupSaleItemsForReceipt(items: SaleItem[]): ReceiptDisplayLine[] {
  const groups = new Map<string, ReceiptDisplayLine>();
  const order: string[] = [];

  for (const item of items) {
    const unitPrice = receiptUnitPrice(item);
    const groupKey = `${item.productId}|${unitPrice.toFixed(2)}`;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.quantity += item.quantity;
      existing.discount += item.discount;
      existing.lineTotal += item.lineTotal;
    } else {
      order.push(groupKey);
      groups.set(groupKey, {
        key: groupKey,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice,
        discount: item.discount,
        lineTotal: item.lineTotal,
      });
    }
  }

  return order.map((key) => groups.get(key)!);
}
