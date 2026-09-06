import { PaymentMethod, type Sale } from "@/lib/types";

/** Payment invoice created when an exchange has additional amount due. */
export function isExchangeTopUpSale(sale: Sale): boolean {
  if (sale.isExchangeTopUp) return true;
  return !!(
    sale.replacesSaleId &&
    sale.discountAmount > 0 &&
    (sale.discountPercent ?? 0) === 0
  );
}

export function exchangeReturnCredit(sale: Sale): number {
  return sale.returnCreditTotal ?? sale.discountAmount ?? 0;
}

/**
 * Cash tendered at the register. Legacy exchange top-ups stored amount due in
 * amountPaid while change still reflected the real tendered amount.
 */
export function cashTenderedForSale(sale: Sale): number {
  if (sale.paymentMethod !== PaymentMethod.Cash) return sale.amountPaid;
  if (
    isExchangeTopUpSale(sale) &&
    sale.changeAmount > 0.01 &&
    Math.abs(sale.amountPaid - sale.totalAmount) < 0.01
  ) {
    return sale.amountPaid + sale.changeAmount;
  }
  return sale.amountPaid;
}

export function parseExchangeFromSaleNotes(notes?: string | null): {
  grsNumber?: string;
  exchangeNumber?: string;
} {
  const match = notes?.match(/Exchange top-up for (.+?) \((.+?)\)/i);
  if (!match) return {};
  return { grsNumber: match[1], exchangeNumber: match[2] };
}

export function exchangeReference(sale: Sale): {
  exchangeNumber?: string;
  grsNumber?: string;
} {
  if (sale.exchangeNumber || sale.grsNumber) {
    return { exchangeNumber: sale.exchangeNumber, grsNumber: sale.grsNumber };
  }
  return parseExchangeFromSaleNotes(sale.notes);
}
