"use client";

import {
  Banknote,
  CreditCard,
  FileText,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { PaymentMethod, PAYMENT_LABELS } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BankSelect } from "@/components/pos/bank-select";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS: {
  key: string;
  method: number;
  label: string;
  Icon: LucideIcon;
}[] = [
  { key: "cash", method: PaymentMethod.Cash, label: "Cash", Icon: Banknote },
  { key: "qrph", method: PaymentMethod.QRPH, label: "QRPH", Icon: Smartphone },
  {
    key: "online",
    method: PaymentMethod.OnlineBank,
    label: "Bank transfer",
    Icon: CreditCard,
  },
  {
    key: "charged",
    method: PaymentMethod.Charged,
    label: "Charge account",
    Icon: Wallet,
  },
  {
    key: "cheque",
    method: PaymentMethod.Cheque,
    label: "Cheque / PDC",
    Icon: FileText,
  },
];

export type ExchangeSettlementProps = {
  creditTotal: number;
  replacementTotal: number;
  paymentMethod: number;
  onPaymentMethodChange: (method: number) => void;
  amountTendered: string;
  onAmountTenderedChange: (value: string) => void;
  qrphReference: string;
  onQrphReferenceChange: (value: string) => void;
  bankName: string;
  onBankNameChange: (value: string) => void;
  bankReference: string;
  onBankReferenceChange: (value: string) => void;
  customerName?: string;
};

function parseAmount(raw: string): number {
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function computeExchangeSettlement(creditTotal: number, replacementTotal: number) {
  const amountDue = Math.max(0, replacementTotal - creditTotal);
  const creditRemaining = Math.max(0, creditTotal - replacementTotal);
  const isEven = amountDue < 0.01 && replacementTotal >= creditTotal - 0.01 && replacementTotal > 0;
  const needsMoreProducts = creditRemaining > 0.01;
  return { amountDue, creditRemaining, isEven, needsMoreProducts };
}

export function isExchangePaymentValid(
  amountDue: number,
  paymentMethod: number,
  amountTendered: string,
  qrphReference: string,
  bankName: string,
  bankReference: string,
  customerName?: string
): { ok: boolean; message?: string } {
  if (amountDue <= 0.01) return { ok: true };

  const tendered = parseAmount(amountTendered);

  if (paymentMethod === PaymentMethod.Cash) {
    if (tendered < amountDue - 0.01) {
      return { ok: false, message: `Cash tendered must be at least ${formatCurrency(amountDue)}` };
    }
    return { ok: true };
  }

  if (paymentMethod === PaymentMethod.QRPH) {
    if (!qrphReference.trim()) {
      return { ok: false, message: "Enter QRPH reference" };
    }
    return { ok: true };
  }

  if (paymentMethod === PaymentMethod.OnlineBank) {
    if (!bankName.trim() || !bankReference.trim()) {
      return { ok: false, message: "Enter bank name and transfer reference" };
    }
    return { ok: true };
  }

  if (paymentMethod === PaymentMethod.Charged) {
    if (!customerName?.trim()) {
      return { ok: false, message: "Original sale must have a customer for charge account" };
    }
    return { ok: true };
  }

  if (paymentMethod === PaymentMethod.Cheque) {
    if (!bankReference.trim()) {
      return { ok: false, message: "Enter cheque number in reference field" };
    }
    return { ok: true };
  }

  return { ok: false, message: "Select a payment method" };
}

export function GrsExchangeSettlement({
  creditTotal,
  replacementTotal,
  paymentMethod,
  onPaymentMethodChange,
  amountTendered,
  onAmountTenderedChange,
  qrphReference,
  onQrphReferenceChange,
  bankName,
  onBankNameChange,
  bankReference,
  onBankReferenceChange,
  customerName,
}: ExchangeSettlementProps) {
  const { amountDue, creditRemaining, isEven, needsMoreProducts } = computeExchangeSettlement(
    creditTotal,
    replacementTotal
  );
  const tendered = parseAmount(amountTendered);
  const change = Math.max(0, tendered - amountDue);
  const cashShort = paymentMethod === PaymentMethod.Cash ? Math.max(0, amountDue - tendered) : 0;
  const paymentValid = isExchangePaymentValid(
    amountDue,
    paymentMethod,
    amountTendered,
    qrphReference,
    bankName,
    bankReference,
    customerName
  );

  const selectMethod = (method: number) => {
    onPaymentMethodChange(method);
    if (method === PaymentMethod.Cash) {
      onAmountTenderedChange("");
    } else if (method === PaymentMethod.Charged || method === PaymentMethod.Cheque) {
      onAmountTenderedChange(amountDue > 0 ? amountDue.toFixed(2) : "0");
    } else if (amountDue > 0) {
      onAmountTenderedChange(amountDue.toFixed(2));
    }
  };

  return (
    <div className="rounded-lg border-2 border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <p className="text-sm font-semibold tracking-tight">Exchange settlement</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review totals and payment before completing the exchange.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Return credit</span>
          <span className="font-medium tabular-nums">{formatCurrency(creditTotal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Replacement total</span>
          <span className="font-medium tabular-nums">{formatCurrency(replacementTotal)}</span>
        </div>
        <div className="border-t border-dashed pt-2" />
        {needsMoreProducts ? (
          <div className="rounded-lg border-2 border-orange-300/80 bg-orange-50 px-3 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
              Customer credit remaining
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-orange-900">
              {formatCurrency(creditRemaining)}
            </p>
            <p className="mt-1 text-xs text-orange-800/90">
              Add more replacement products — no cash refund.
            </p>
          </div>
        ) : isEven ? (
          <div className="rounded-lg border-2 border-blue-300/80 bg-blue-50 px-3 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Even exchange
            </p>
            <p className="mt-1 text-sm font-medium text-blue-900">
              No additional payment required.
            </p>
          </div>
        ) : (
          <div className="flex justify-between gap-4 items-baseline">
            <span className="font-semibold">Amount due</span>
            <span className="text-xl font-bold tabular-nums text-emerald-700">
              {formatCurrency(amountDue)}
            </span>
          </div>
        )}
      </div>

      {amountDue > 0.01 && !needsMoreProducts && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <Label className="mb-2 block text-sm font-semibold">Payment method</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {PAYMENT_OPTIONS.map(({ key, label, Icon, method }) => {
                const selected = paymentMethod === method;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectMethod(method)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-1.5 py-2.5 text-[11px] font-medium leading-tight transition-all sm:text-xs",
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-center">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            {paymentMethod === PaymentMethod.Cash && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Amount tendered</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={amountTendered}
                    onChange={(e) => onAmountTenderedChange(e.target.value)}
                    className="h-14 border-2 text-center text-2xl font-bold tabular-nums"
                    placeholder={formatCurrency(amountDue)}
                  />
                </div>
                <div
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-center",
                    cashShort > 0
                      ? "border-red-200/80 bg-red-50/70"
                      : "border-green-300/80 bg-green-50/80"
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Change
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      cashShort > 0 ? "text-red-700" : "text-green-800"
                    )}
                  >
                    {formatCurrency(change)}
                  </p>
                  {cashShort > 0 && (
                    <p className="mt-1 text-xs font-medium text-red-700">
                      Short {formatCurrency(cashShort)}
                    </p>
                  )}
                </div>
              </>
            )}

            {paymentMethod === PaymentMethod.QRPH && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">QRPH reference</Label>
                <Input
                  value={qrphReference}
                  onChange={(e) => onQrphReferenceChange(e.target.value)}
                  placeholder="Reference number"
                />
                <p className="text-xs text-muted-foreground">
                  Amount due: {formatCurrency(amountDue)}
                </p>
              </div>
            )}

            {paymentMethod === PaymentMethod.OnlineBank && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Bank name</Label>
                  <BankSelect
                    value={bankName}
                    onChange={onBankNameChange}
                    triggerClassName="h-10 w-full"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Transfer reference</Label>
                  <Input
                    value={bankReference}
                    onChange={(e) => onBankReferenceChange(e.target.value)}
                    placeholder="Reference / confirmation no."
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Amount due: {formatCurrency(amountDue)}
                </p>
              </div>
            )}

            {paymentMethod === PaymentMethod.Charged && (
              <div className="space-y-2">
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                  Top-up recorded on charge account. Customer from original sale is used.
                </p>
                <p className="text-sm">
                  Customer:{" "}
                  <span className="font-medium">{customerName?.trim() || "—"}</span>
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  Amount due: {formatCurrency(amountDue)}
                </p>
              </div>
            )}

            {paymentMethod === PaymentMethod.Cheque && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Cheque / PDC for the amount due ({formatCurrency(amountDue)}).
                </p>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Cheque number</Label>
                  <Input
                    value={bankReference}
                    onChange={(e) => onBankReferenceChange(e.target.value)}
                    placeholder="Cheque #"
                  />
                </div>
              </div>
            )}
          </div>

          {paymentValid.ok && (
            <p className="text-center text-xs font-medium text-emerald-700">
              ✓ Valid — customer pays {formatCurrency(amountDue)}
              {paymentMethod === PaymentMethod.Cash && change > 0.01 && (
                <span className="block mt-0.5">
                  Change {formatCurrency(change)}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function exchangePaymentMethodLabel(method: number): string {
  return PAYMENT_LABELS[method] ?? "Payment";
}
