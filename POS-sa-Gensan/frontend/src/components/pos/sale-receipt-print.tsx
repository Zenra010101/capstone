"use client";

import { ReceiptTaxBreakdown } from "@/components/pos/receipt-tax-breakdown";
import { EMPTY_FIELD, formatAmount, formatDateLong } from "@/lib/format";
import {
  cashTenderedForSale,
  exchangeReference,
  isExchangeTopUpSale,
} from "@/lib/exchange-top-up-sale";
import { receiptPaperClass } from "@/lib/receipt-paper";
import type { ReceiptDisplayLine } from "@/lib/receipt-line-groups";
import type { Sale, StoreSettings } from "@/lib/types";
import { PaymentMethod, PAYMENT_LABELS } from "@/lib/types";

const RECEIPT_DEFAULTS = {
  outletLine: "FACTORY OUTLET OF :",
  brandLine: "PH EXCELLENT STAINLESS STEEL",
  tagline: "THE NO. 1 STAINLESS BRAND IN PHILIPPINES",
  storeName: "SHANGHAI STAINLESS STEEL SUPPLY CORPORATION",
  address: "DR # 1 WEE ENG BLDG., R. CASTILLO ST., AGDAO, DAVAO CITY",
  phone: "(082) 284-7487",
  trustReceiptTitle: "TRUST RECEIPT AGREEMENT",
  cashReceiptTitle: "SALES RECEIPT",
};

function branding(settings: StoreSettings | null) {
  return {
    outletLine: settings?.outletLine || RECEIPT_DEFAULTS.outletLine,
    brandLine: settings?.brandLine || RECEIPT_DEFAULTS.brandLine,
    tagline: settings?.tagline || RECEIPT_DEFAULTS.tagline,
    storeName: settings?.storeName || RECEIPT_DEFAULTS.storeName,
    address: settings?.address || RECEIPT_DEFAULTS.address,
    phone: settings?.phone || RECEIPT_DEFAULTS.phone,
    trustReceiptTitle:
      settings?.trustReceiptTitle || RECEIPT_DEFAULTS.trustReceiptTitle,
    cashReceiptTitle:
      settings?.cashReceiptTitle || RECEIPT_DEFAULTS.cashReceiptTitle,
  };
}

function lineDiscountPercent(
  unitPrice: number,
  quantity: number,
  discount: number
): number {
  const gross = unitPrice * quantity;
  if (gross <= 0 || discount <= 0) return 0;
  return Math.round((discount / gross) * 10000) / 100;
}

export type SaleReceiptPrintProps = {
  sale: Sale;
  storeSettings: StoreSettings | null;
  receiptLines: ReceiptDisplayLine[];
  termsLabel: string;
  /** When set, used as the print root id (portaled copy for browser print). */
  printRootId?: string;
};

export function SaleReceiptPrint({
  sale,
  storeSettings,
  receiptLines,
  termsLabel,
  printRootId,
}: SaleReceiptPrintProps) {
  const store = branding(storeSettings);
  const paperClass = receiptPaperClass(storeSettings?.receiptPaperSize);
  const isUtang = sale.paymentMethod === PaymentMethod.Charged;
  const isCheque = sale.paymentMethod === PaymentMethod.Cheque;
  const isExchangeTopUp = isExchangeTopUpSale(sale);
  const exchangeRef = exchangeReference(sale);
  const title = isUtang ? store.trustReceiptTitle : store.cashReceiptTitle;
  const totalQty = sale.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      id={printRootId}
      className={`receipt-paper-saving bg-white text-[11px] leading-snug text-black sm:text-xs ${paperClass}`}
    >
      <div className="receipt-store-header text-center">
        <p className="receipt-outlet-line tracking-wide">{store.outletLine}</p>
        <p className="receipt-brand-line font-semibold">{store.brandLine}</p>
        <p className="receipt-tagline italic">{store.tagline}</p>
        <p className="receipt-store-name mt-1 font-bold uppercase">{store.storeName}</p>
        <p className="receipt-address mt-0.5">{store.address}</p>
        <p className="receipt-phone">Tel: {store.phone}</p>
      </div>

      <h2 className="receipt-title my-2.5 text-center font-bold underline decoration-2 underline-offset-4">
        {title}
      </h2>
      <p className="receipt-number -mt-1 mb-2 text-center font-mono font-semibold tracking-wide">
        No. {sale.saleNumber}
      </p>

      <div className="receipt-meta mb-2.5 grid grid-cols-2 gap-2 border-y border-black py-2">
        <dl className="space-y-0.5">
          <MetaRow label="Customer" value={sale.customerName || "Walk-in Customer"} bold />
          <MetaRow label="Cashier" value={sale.cashierName || EMPTY_FIELD} />
          <MetaRow
            label="Remarks"
            value={sale.voidReason ? `VOID: ${sale.voidReason}` : EMPTY_FIELD}
            className={sale.voidReason ? undefined : "receipt-optional-meta"}
          />
        </dl>
        <dl className="space-y-0.5 text-right">
          <MetaRow label="Receipt #" value={sale.saleNumber} bold />
          {isExchangeTopUp && exchangeRef.exchangeNumber && (
            <MetaRow label="Exchange #" value={exchangeRef.exchangeNumber} bold />
          )}
          {isExchangeTopUp && exchangeRef.grsNumber && (
            <MetaRow label="GRS #" value={exchangeRef.grsNumber} />
          )}
          <MetaRow label="Date" value={formatDateLong(sale.createdAt)} />
          <MetaRow label="Payment" value={termsLabel} bold />
        </dl>
      </div>

      <div className="receipt-items">
        <table className="receipt-items-table w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="receipt-col-qty py-1 pr-2 text-left font-bold">Qty</th>
              <th className="receipt-col-item py-1 pr-2 text-left font-bold">Item Details</th>
              <th className="receipt-col-price py-1 pr-2 text-right font-bold">Unit Price</th>
              <th className="receipt-col-disc py-1 pr-2 text-right font-bold">Discount</th>
              <th className="receipt-col-amt py-1 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {receiptLines.map((line) => {
              const discPct = lineDiscountPercent(
                line.unitPrice,
                line.quantity,
                line.discount
              );
              return (
                <tr key={line.key} className="receipt-item-row border-b border-slate-300">
                  <td className="py-0.5 pr-2 align-top tabular-nums">{line.quantity}</td>
                  <td className="py-0.5 pr-2 align-top">
                    <span className="receipt-item-name">{line.productName}</span>
                    {line.productSku ? (
                      <span className="receipt-item-sku block text-slate-600">
                        SKU: {line.productSku}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-0.5 pr-2 text-right align-top tabular-nums">
                    {formatAmount(line.unitPrice)}
                  </td>
                  <td className="py-0.5 pr-2 text-right align-top tabular-nums">
                    {line.discount > 0
                      ? `${formatAmount(line.discount)} (${discPct.toFixed(1)}%)`
                      : EMPTY_FIELD}
                  </td>
                  <td className="py-0.5 text-right align-top tabular-nums font-medium">
                    {formatAmount(line.lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="receipt-qty-total pt-1 text-right text-slate-600">
                Total quantity:{" "}
                <span className="font-semibold text-black">{totalQty} pc</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ReceiptTaxBreakdown sale={sale} className="receipt-tax-block" />

      <div className="receipt-payment-box mt-2 rounded border border-slate-400 bg-slate-50 p-2">
        <PaymentDetails sale={sale} isUtang={isUtang} isCheque={isCheque} isExchangeTopUp={isExchangeTopUp} />
      </div>

      <div className="receipt-signatures mt-4 grid grid-cols-3 gap-x-3 gap-y-2">
        {[
          ["Cashier", sale.cashierName],
          ["Checked by", ""],
          ["Customer / Received by", ""],
        ].map(([label, name]) => (
          <div key={label} className="text-center">
            <div className="signature-line border-b border-black pb-4" />
            <p className="mt-0.5 text-[9px] font-semibold uppercase">{label}</p>
            {name ? <p className="text-[10px] text-slate-700">{name}</p> : null}
          </div>
        ))}
      </div>

      <div className="receipt-footer-note mt-2.5 border-t border-dashed border-slate-400 pt-2 text-center text-slate-600">
        <p className="font-semibold text-black">Thank you for your purchase.</p>
        <p className="text-[10px]">Please keep this receipt for transaction reference.</p>
      </div>
    </div>
  );
}

function PaymentDetails({
  sale,
  isUtang,
  isCheque,
  isExchangeTopUp,
}: {
  sale: Sale;
  isUtang: boolean;
  isCheque: boolean;
  isExchangeTopUp: boolean;
}) {
  if (sale.paymentMethod === PaymentMethod.Split) {
    const lines = sale.payments ?? [];
    const balanceDue = sale.receivableBalance ?? 0;
    return (
      <div className="space-y-1">
        <p className="font-semibold">Split payment</p>
        <div className="space-y-0.5 text-[10px] text-slate-700">
          {lines.map((p, i) => {
            const ref = p.bankReferenceNumber || p.qrphReference;
            return (
              <div key={i} className="flex justify-between gap-2">
                <span>
                  {PAYMENT_LABELS[p.method] ?? "Payment"}
                  {p.bankName ? ` · ${p.bankName}` : ""}
                  {ref ? ` · ${ref}` : ""}
                </span>
                <span className="tabular-nums">{formatAmount(p.amount)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between border-t border-dashed border-slate-300 pt-0.5">
          <span className="font-semibold">Paid now:</span>
          <span className="tabular-nums">{formatAmount(sale.amountPaid)}</span>
        </div>
        {sale.changeAmount > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold">Change:</span>
            <span className="tabular-nums">{formatAmount(sale.changeAmount)}</span>
          </div>
        )}
        {balanceDue > 0 && (
          <div className="flex justify-between">
            <span className="font-semibold">Balance due:</span>
            <span className="tabular-nums">{formatAmount(balanceDue)}</span>
          </div>
        )}
        {balanceDue > 0 && sale.dueDate && (
          <p>
            <span className="font-semibold">Due date:</span> {formatDateLong(sale.dueDate)}
          </p>
        )}
      </div>
    );
  }

  if (isUtang) {
    return (
      <div className="grid gap-1 sm:grid-cols-2">
        <p>
          <span className="font-semibold">Down payment:</span> {formatAmount(sale.amountPaid)}
        </p>
        <p>
          <span className="font-semibold">Balance due:</span>{" "}
          {formatAmount(sale.receivableBalance ?? sale.totalAmount - sale.amountPaid)}
        </p>
        {sale.dueDate && (
          <p className="sm:col-span-2">
            <span className="font-semibold">Due date:</span> {formatDateLong(sale.dueDate)}
          </p>
        )}
      </div>
    );
  }

  if (sale.paymentMethod === PaymentMethod.Cash) {
    if (isExchangeTopUp) {
      return (
        <div className="space-y-1">
          <p>
            <span className="font-semibold">Cash received:</span>{" "}
            {formatAmount(cashTenderedForSale(sale))}
          </p>
          <p>
            <span className="font-semibold">Change:</span> {formatAmount(sale.changeAmount)}
          </p>
        </div>
      );
    }
    return (
      <p>
        <span className="font-semibold">Paid:</span> {formatAmount(sale.amountPaid)}
        <span className="mx-2">·</span>
        <span className="font-semibold">Change:</span> {formatAmount(sale.changeAmount)}
      </p>
    );
  }

  if (isExchangeTopUp) {
    return (
      <p>
        <span className="font-semibold">Additional payment:</span> {formatAmount(sale.totalAmount)}
        <span className="mx-2">·</span>
        <span className="font-semibold">Method:</span>{" "}
        {PAYMENT_LABELS[sale.paymentMethod] ?? "Payment"}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p>
        <span className="font-semibold">Amount received:</span> {formatAmount(sale.amountPaid)}
      </p>
      {sale.payment?.qrphReference && (
        <p className="text-[10px] text-slate-600">QRPH ref: {sale.payment.qrphReference}</p>
      )}
      {sale.paymentMethod === PaymentMethod.OnlineBank && sale.payment && (
        <div className="text-[10px] text-slate-700">
          {sale.payment.bankName && <p>Bank: {sale.payment.bankName}</p>}
          {sale.payment.bankBranch && <p>Branch / address: {sale.payment.bankBranch}</p>}
          {sale.payment.bankReferenceNumber && (
            <p>Reference: {sale.payment.bankReferenceNumber}</p>
          )}
          {sale.payment.senderName && <p>Sender: {sale.payment.senderName}</p>}
        </div>
      )}
      {isCheque && sale.cheque && (
        <div className="text-[10px] text-slate-700">
          <p>Bank: {sale.cheque.bankName}</p>
          {sale.cheque.branch && <p>Branch / address: {sale.cheque.branch}</p>}
          <p>Cheque #: {sale.cheque.chequeNumber}</p>
          <p>Account: {sale.cheque.accountName}</p>
        </div>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`receipt-meta-row flex gap-2 ${className ?? ""}`}>
      <dt className="min-w-[4.5rem] shrink-0 font-semibold">{label}:</dt>
      <dd className={bold ? "font-bold uppercase" : ""}>{value}</dd>
    </div>
  );
}
