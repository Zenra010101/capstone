"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankSelect } from "@/components/pos/bank-select";
import { formatCurrency } from "@/lib/format";
import type { Customer } from "@/lib/types";
import {
  ChequeType,
  CHEQUE_TYPE_LABELS,
  PaymentMethod,
  PAYMENT_LABELS,
} from "@/lib/types";

export type SplitTender = {
  id: string;
  method: number;
  amount: string;
  qrphReference?: string;
  bankName?: string;
  bankBranch?: string;
  bankReference?: string;
  senderName?: string;
  chequeType?: number;
  chequeBank?: string;
  chequeBranch?: string;
  chequeNumber?: string;
  chequeAccount?: string;
  chequeMaturity?: string;
  dueDate?: string;
};

const TENDER_METHODS = [
  PaymentMethod.Cash,
  PaymentMethod.QRPH,
  PaymentMethod.OnlineBank,
  PaymentMethod.Cheque,
  PaymentMethod.Charged,
] as const;

export type SplitSummary = {
  cashSum: number;
  electronicNow: number;
  creditSum: number;
  requiredCash: number;
  change: number;
  covered: number;
  remaining: number;
  over: boolean;
  needsCustomer: boolean;
};

const EPS = 0.005;
const tenderAmount = (t: SplitTender) => parseFloat(t.amount) || 0;

export function computeSplitSummary(
  tenders: SplitTender[],
  total: number
): SplitSummary {
  const sumBy = (m: number) =>
    tenders.filter((t) => t.method === m).reduce((s, t) => s + tenderAmount(t), 0);
  const cashSum = sumBy(PaymentMethod.Cash);
  const electronicNow = sumBy(PaymentMethod.QRPH) + sumBy(PaymentMethod.OnlineBank);
  const creditSum = sumBy(PaymentMethod.Cheque) + sumBy(PaymentMethod.Charged);
  const nonCash = electronicNow + creditSum;
  const over = nonCash > total + EPS;
  const requiredCash = Math.max(0, total - nonCash);
  const cashApplied = Math.min(cashSum, requiredCash);
  const covered = nonCash + cashApplied;
  const remaining = Math.max(0, total - covered);
  const change = Math.max(0, cashSum - requiredCash);
  return {
    cashSum,
    electronicNow,
    creditSum,
    requiredCash,
    change,
    covered,
    remaining,
    over,
    needsCustomer: creditSum > 0,
  };
}

export function validateSplit(
  tenders: SplitTender[],
  summary: SplitSummary,
  customerId: string,
  customerName: string
): string | null {
  if (tenders.length < 2) return "Add at least two tenders for a split payment";
  for (const t of tenders) {
    if (tenderAmount(t) <= 0) return "Each tender amount must be greater than zero";
    if (t.method === PaymentMethod.QRPH && !t.qrphReference?.trim())
      return "QRPH tender needs a reference number";
    if (
      t.method === PaymentMethod.OnlineBank &&
      (!t.bankName?.trim() ||
        !t.bankBranch?.trim() ||
        !t.bankReference?.trim() ||
        !t.senderName?.trim())
    )
      return "Complete the online bank tender details";
    if (
      t.method === PaymentMethod.Cheque &&
      (!t.chequeBank?.trim() ||
        !t.chequeBranch?.trim() ||
        !t.chequeNumber?.trim() ||
        !t.chequeAccount?.trim() ||
        !t.chequeMaturity)
    )
      return "Complete the cheque tender details";
    if (t.method === PaymentMethod.Charged && !t.dueDate)
      return "Charge tender needs a due date";
  }
  if (tenders.filter((t) => t.method === PaymentMethod.Cheque).length > 1)
    return "Only one cheque tender is supported";
  if (tenders.filter((t) => t.method === PaymentMethod.Charged).length > 1)
    return "Only one charge tender is supported";
  if (tenders.filter((t) => t.method === PaymentMethod.Cash).length > 1)
    return "Combine cash into a single cash tender";
  if (summary.over) return "Non-cash tenders exceed the total";
  if (summary.remaining > EPS)
    return `Payment is short by ${formatCurrency(summary.remaining)}`;
  if (summary.needsCustomer && !customerId && !customerName.trim())
    return "Select a customer for the cheque / charge portion";
  return null;
}

export function buildSplitPayload(tenders: SplitTender[]) {
  return tenders.map((t) => {
    const amount = tenderAmount(t);
    switch (t.method) {
      case PaymentMethod.QRPH:
        return { method: t.method, amount, qrphReference: t.qrphReference };
      case PaymentMethod.OnlineBank:
        return {
          method: t.method,
          amount,
          onlineBank: {
            bankName: t.bankName,
            branch: t.bankBranch,
            referenceNumber: t.bankReference,
            senderName: t.senderName,
            datePaid: new Date().toISOString(),
          },
        };
      case PaymentMethod.Cheque:
        return {
          method: t.method,
          amount,
          cheque: {
            type: t.chequeType ?? ChequeType.Current,
            bankName: t.chequeBank,
            branch: t.chequeBranch || undefined,
            chequeNumber: t.chequeNumber,
            accountName: t.chequeAccount,
            maturityDate: t.chequeMaturity
              ? new Date(t.chequeMaturity).toISOString()
              : new Date().toISOString(),
          },
        };
      case PaymentMethod.Charged:
        return {
          method: t.method,
          amount,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
        };
      default:
        return { method: t.method, amount };
    }
  });
}

export function newSplitTender(method: number, amount = ""): SplitTender {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    amount,
    chequeType: ChequeType.Current,
    chequeMaturity: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  };
}

export type SplitPaymentBuilderProps = {
  tenders: SplitTender[];
  onChange: (tenders: SplitTender[]) => void;
  total: number;
  remaining: number;
  needsCustomer: boolean;
  customers: Customer[];
  customerId: string;
  customerName: string;
  onCustomerIdChange: (v: string) => void;
  onCustomerNameChange: (v: string) => void;
};

export function SplitPaymentBuilder({
  tenders,
  onChange,
  total,
  remaining,
  needsCustomer,
  customers,
  customerId,
  customerName,
  onCustomerIdChange,
  onCustomerNameChange,
}: SplitPaymentBuilderProps) {
  const customerList = Array.isArray(customers) ? customers : [];
  const selectedCustomer = customerList.find(
    (c) => c.id.toLowerCase() === customerId.toLowerCase()
  );

  const update = (id: string, patch: Partial<SplitTender>) =>
    onChange(tenders.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remove = (id: string) => onChange(tenders.filter((t) => t.id !== id));

  const addTender = () => {
    const suggested = remaining > 0 ? remaining.toFixed(2) : "";
    onChange([...tenders, newSplitTender(PaymentMethod.Cash, suggested)]);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {tenders.map((t, idx) => (
          <div
            key={t.id}
            className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Tender {idx + 1}</Label>
                <Select
                  value={String(t.method)}
                  onValueChange={(v) => update(t.id, { method: Number(v) })}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>{PAYMENT_LABELS[t.method]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TENDER_METHODS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {PAYMENT_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10 text-right font-semibold tabular-nums"
                  value={t.amount}
                  onChange={(e) => update(t.id, { amount: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(t.id)}
                disabled={tenders.length <= 1}
                aria-label="Remove tender"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {t.method === PaymentMethod.QRPH && (
              <div className="space-y-1">
                <Label className="text-xs">QRPH reference</Label>
                <Input
                  className="h-9"
                  value={t.qrphReference ?? ""}
                  onChange={(e) => update(t.id, { qrphReference: e.target.value })}
                />
              </div>
            )}

            {t.method === PaymentMethod.OnlineBank && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Bank</Label>
                  <BankSelect
                    value={t.bankName ?? ""}
                    onChange={(v) => update(t.id, { bankName: v })}
                    triggerClassName="h-9 w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Branch / address</Label>
                  <Input
                    className="h-9"
                    value={t.bankBranch ?? ""}
                    onChange={(e) => update(t.id, { bankBranch: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reference no.</Label>
                  <Input
                    className="h-9"
                    value={t.bankReference ?? ""}
                    onChange={(e) => update(t.id, { bankReference: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sender name</Label>
                  <Input
                    className="h-9"
                    value={t.senderName ?? ""}
                    onChange={(e) => update(t.id, { senderName: e.target.value })}
                  />
                </div>
              </div>
            )}

            {t.method === PaymentMethod.Cheque && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cheque type</Label>
                  <Select
                    value={String(t.chequeType ?? ChequeType.Current)}
                    onValueChange={(v) => update(t.id, { chequeType: Number(v) })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue>
                        {CHEQUE_TYPE_LABELS[t.chequeType ?? ChequeType.Current]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(ChequeType.Current)}>
                        {CHEQUE_TYPE_LABELS[ChequeType.Current]}
                      </SelectItem>
                      <SelectItem value={String(ChequeType.PostDated)}>
                        {CHEQUE_TYPE_LABELS[ChequeType.PostDated]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bank</Label>
                  <BankSelect
                    value={t.chequeBank ?? ""}
                    onChange={(v) => update(t.id, { chequeBank: v })}
                    triggerClassName="h-9 w-full"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Branch / address</Label>
                  <Input
                    className="h-9"
                    value={t.chequeBranch ?? ""}
                    onChange={(e) => update(t.id, { chequeBranch: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cheque #</Label>
                  <Input
                    className="h-9"
                    value={t.chequeNumber ?? ""}
                    onChange={(e) => update(t.id, { chequeNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account name</Label>
                  <Input
                    className="h-9"
                    value={t.chequeAccount ?? ""}
                    onChange={(e) => update(t.id, { chequeAccount: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Maturity date</Label>
                  <Input
                    type="date"
                    className="h-9"
                    value={t.chequeMaturity ?? ""}
                    onChange={(e) => update(t.id, { chequeMaturity: e.target.value })}
                  />
                </div>
              </div>
            )}

            {t.method === PaymentMethod.Charged && (
              <div className="space-y-1">
                <Label className="text-xs">Balance due date</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={t.dueDate ?? ""}
                  onChange={(e) => update(t.id, { dueDate: e.target.value })}
                />
                <p className="text-[11px] text-amber-700">
                  This portion is tracked under Receivables until collected.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-9 w-full"
        onClick={addTender}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add tender
      </Button>

      {needsCustomer && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <Label className="text-xs font-semibold text-amber-900">
            Customer (required for cheque / charge portion)
          </Label>
          <Select
            value={customerId || null}
            onValueChange={(v) => {
              if (!v) {
                onCustomerIdChange("");
                return;
              }
              onCustomerIdChange(v);
              const c = customerList.find(
                (x) => x.id.toLowerCase() === v.toLowerCase()
              );
              if (c) onCustomerNameChange(c.name);
            }}
          >
            <SelectTrigger className="h-9 w-full bg-white">
              <SelectValue placeholder="Select customer">
                {selectedCustomer?.name ??
                  (customerId && customerName ? customerName : null)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {customerList
                .filter((c) => c.isActive)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Input
            className="h-9 bg-white"
            value={customerName}
            onChange={(e) => {
              onCustomerNameChange(e.target.value);
              onCustomerIdChange("");
            }}
            placeholder="Or type customer name"
          />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total due</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
