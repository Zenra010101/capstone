"use client";

import {
  Banknote,
  CreditCard,
  FileText,
  Smartphone,
  Split,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import type { SaleTaxResult } from "@/lib/tax";
import type { Customer } from "@/lib/types";
import { PaymentMethod } from "@/lib/types";
import { SaleTaxSummary } from "@/components/pos/sale-tax-summary";
import { BankSelect } from "@/components/pos/bank-select";
import { ChequeType, CHEQUE_TYPE_LABELS } from "@/lib/types";
import {
  SplitPaymentBuilder,
  type SplitSummary,
  type SplitTender,
} from "@/components/pos/split-payment-builder";

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
    label: "Online Bank",
    Icon: CreditCard,
  },
  {
    key: "charged",
    method: PaymentMethod.Charged,
    label: "Charge",
    Icon: Wallet,
  },
  {
    key: "cheque",
    method: PaymentMethod.Cheque,
    label: "Cheque / PDC",
    Icon: FileText,
  },
  {
    key: "split",
    method: PaymentMethod.Split,
    label: "Split",
    Icon: Split,
  },
];

const CHEQUE_TYPE_OPTIONS = [
  { value: String(ChequeType.Current), label: CHEQUE_TYPE_LABELS[ChequeType.Current] },
  { value: String(ChequeType.PostDated), label: CHEQUE_TYPE_LABELS[ChequeType.PostDated] },
] as const;

export type CheckoutPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processing: boolean;
  cartItemCount: number;
  subtotal: number;
  saleTax: SaleTaxResult;
  total: number;
  paymentMethod: number;
  onPaymentMethodChange: (method: number) => void;
  amountPaid: string;
  onAmountPaidChange: (value: string) => void;
  amountPaidNum: number;
  change: number;
  cashShort: number;
  qrphReference: string;
  onQrphReferenceChange: (v: string) => void;
  bankName: string;
  onBankNameChange: (v: string) => void;
  bankBranch: string;
  onBankBranchChange: (v: string) => void;
  bankReference: string;
  onBankReferenceChange: (v: string) => void;
  senderName: string;
  onSenderNameChange: (v: string) => void;
  chequeType: number;
  onChequeTypeChange: (v: number) => void;
  chequeBank: string;
  onChequeBankChange: (v: string) => void;
  chequeBranch: string;
  onChequeBranchChange: (v: string) => void;
  chequeNumber: string;
  onChequeNumberChange: (v: string) => void;
  chequeAccount: string;
  onChequeAccountChange: (v: string) => void;
  chequeMaturity: string;
  onChequeMaturityChange: (v: string) => void;
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  creditTermsDays: number;
  onCreditTermsDaysChange: (days: number) => void;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  splitTenders: SplitTender[];
  onSplitTendersChange: (tenders: SplitTender[]) => void;
  splitSummary: SplitSummary;
  splitError: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CheckoutPaymentDialog({
  open,
  onOpenChange,
  processing,
  cartItemCount,
  subtotal,
  saleTax,
  total,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  amountPaidNum,
  change,
  cashShort,
  qrphReference,
  onQrphReferenceChange,
  bankName,
  onBankNameChange,
  bankBranch,
  onBankBranchChange,
  bankReference,
  onBankReferenceChange,
  senderName,
  onSenderNameChange,
  chequeType,
  onChequeTypeChange,
  chequeBank,
  onChequeBankChange,
  chequeBranch,
  onChequeBranchChange,
  chequeNumber,
  onChequeNumberChange,
  chequeAccount,
  onChequeAccountChange,
  chequeMaturity,
  onChequeMaturityChange,
  customers,
  customerId,
  onCustomerIdChange,
  customerName,
  onCustomerNameChange,
  creditTermsDays,
  onCreditTermsDaysChange,
  dueDate,
  onDueDateChange,
  splitTenders,
  onSplitTendersChange,
  splitSummary,
  splitError,
  onConfirm,
  onCancel,
}: CheckoutPaymentDialogProps) {
  const isSplit = paymentMethod === PaymentMethod.Split;
  const customerList = Array.isArray(customers) ? customers : [];
  const selectedCustomer = customerList.find(
    (c) => c.id.toLowerCase() === customerId.toLowerCase()
  );

  const selectMethod = (method: number) => {
    onPaymentMethodChange(method);
    if (method === PaymentMethod.Charged || method === PaymentMethod.Cheque) {
      onAmountPaidChange("0");
      if (method === PaymentMethod.Charged && !dueDate) {
        onCreditTermsDaysChange(30);
      }
    } else if (method === PaymentMethod.Cash) {
      onAmountPaidChange("0");
    } else {
      onAmountPaidChange(total.toFixed(2));
    }
  };

  const balanceDue = Math.max(total - amountPaidNum, 0);
  const showEditableAmount =
    paymentMethod !== PaymentMethod.Charged &&
    paymentMethod !== PaymentMethod.Cheque &&
    paymentMethod !== PaymentMethod.Cash &&
    Math.abs(amountPaidNum - total) > 0.01;

  const showOptionalCustomer =
    paymentMethod !== PaymentMethod.Charged && paymentMethod !== PaymentMethod.Cheque;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && processing) return;
        onOpenChange(o);
      }}
    >
      <DialogContent
        size="xl"
        showCloseButton={false}
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-white px-4 py-3 sm:px-6">
          <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
            Complete Payment
          </DialogTitle>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} · Enter payment and confirm
          </p>
        </DialogHeader>

        <div className="grid shrink-0 lg:grid-cols-[1fr_minmax(280px,340px)] lg:divide-x">
          {/* Left — payment */}
          <div className="space-y-3 p-4 sm:p-5">
            <div>
              <Label className="mb-2 block text-sm font-semibold">Payment method</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PAYMENT_OPTIONS.map(({ key, label, Icon, method }) => {
                  const selected = paymentMethod === method;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectMethod(method)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-1.5 py-2 text-[11px] font-medium leading-tight transition-all sm:text-xs ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isSplit && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-erp sm:p-4">
                <SplitPaymentBuilder
                  tenders={splitTenders}
                  onChange={onSplitTendersChange}
                  total={total}
                  remaining={splitSummary.remaining}
                  needsCustomer={splitSummary.needsCustomer}
                  customers={customers}
                  customerId={customerId}
                  customerName={customerName}
                  onCustomerIdChange={onCustomerIdChange}
                  onCustomerNameChange={onCustomerNameChange}
                />
                {splitError && (
                  <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                    {splitError}
                  </p>
                )}
              </div>
            )}

            <div
              className={`rounded-lg border border-slate-200 bg-white p-3 shadow-erp sm:p-4 ${
                isSplit ? "hidden" : ""
              }`}
            >
              {paymentMethod === PaymentMethod.Cash && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Amount tendered</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => onAmountPaidChange(e.target.value)}
                    className="h-16 border-2 text-center text-3xl font-bold tabular-nums sm:text-4xl"
                    placeholder={`Due ${formatCurrency(total)}`}
                    autoFocus
                  />
                </div>
              )}

              {paymentMethod === PaymentMethod.QRPH && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">QRPH reference</Label>
                  <Input
                    className="h-10"
                    value={qrphReference}
                    onChange={(e) => onQrphReferenceChange(e.target.value)}
                    autoFocus
                  />
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
                    <Label className="text-xs font-medium">Branch / address</Label>
                    <Input
                      className="h-10"
                      value={bankBranch}
                      onChange={(e) => onBankBranchChange(e.target.value)}
                      placeholder="e.g. General Santos — J. Catolico Ave."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Reference no.</Label>
                    <Input
                      className="h-10"
                      value={bankReference}
                      onChange={(e) => onBankReferenceChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Sender name</Label>
                    <Input
                      className="h-10"
                      value={senderName}
                      onChange={(e) => onSenderNameChange(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === PaymentMethod.Cheque && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-3 sm:grid sm:grid-cols-2 sm:gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Cheque type</Label>
                      <Select
                        value={String(chequeType)}
                        onValueChange={(v) => onChequeTypeChange(Number(v))}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select cheque type">
                            {CHEQUE_TYPE_LABELS[chequeType] ?? "Select cheque type"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CHEQUE_TYPE_OPTIONS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bank</Label>
                      <BankSelect
                        value={chequeBank}
                        onChange={onChequeBankChange}
                        triggerClassName="h-10 w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Branch / address</Label>
                    <Input
                      className="h-10"
                      value={chequeBranch}
                      onChange={(e) => onChequeBranchChange(e.target.value)}
                      placeholder="Bank branch or street address on cheque"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cheque #</Label>
                    <Input className="h-10" value={chequeNumber} onChange={(e) => onChequeNumberChange(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account name</Label>
                    <Input className="h-10" value={chequeAccount} onChange={(e) => onChequeAccountChange(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Maturity date</Label>
                    <Input type="date" className="h-10" value={chequeMaturity} onChange={(e) => onChequeMaturityChange(e.target.value)} />
                  </div>
                </div>
              )}

              {paymentMethod === PaymentMethod.Charged && (
                <div className="space-y-2">
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                    Stock deducts now. Balance tracked under Charge / Receivables.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium">Customer</Label>
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
                        <SelectTrigger className="h-10 w-full">
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
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Or name</Label>
                      <Input
                        className="h-10"
                        value={customerName}
                        onChange={(e) => {
                          onCustomerNameChange(e.target.value);
                          onCustomerIdChange("");
                        }}
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Down payment</Label>
                      <Input
                        type="number"
                        min={0}
                        max={total}
                        className="h-10"
                        value={amountPaid}
                        onChange={(e) => onAmountPaidChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Terms (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="h-10"
                        value={creditTermsDays}
                        onChange={(e) => onCreditTermsDaysChange(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Due date</Label>
                      <Input type="date" className="h-10" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {showEditableAmount && (
                <div className="mt-2 space-y-1.5 border-t pt-2">
                  <Label className="text-sm font-medium">Amount paid</Label>
                  <Input
                    type="number"
                    className="h-10 text-lg font-semibold"
                    value={amountPaid}
                    onChange={(e) => onAmountPaidChange(e.target.value)}
                  />
                </div>
              )}

              {showOptionalCustomer && (
                <div className="mt-2 space-y-1 border-t pt-2">
                  <Label className="text-xs">Customer (optional)</Label>
                  <Input
                    className="h-10"
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right — summary (no scroll) */}
          <div className="border-t bg-muted/30 p-4 sm:p-5 lg:border-t-0">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Order summary</h3>
            <div className="rounded-lg border border-border bg-card p-4 shadow-erp">
              <SaleTaxSummary subtotal={subtotal} tax={saleTax} largeTotal />
              <div className="my-2 border-t border-dashed border-slate-200" />
              {isSplit ? (
                <SplitSummaryPanel summary={splitSummary} />
              ) : (
                <>
                  <SummaryRow
                    label={
                      paymentMethod === PaymentMethod.Charged ? "Down payment" : "Amount paid"
                    }
                    value={formatCurrency(amountPaidNum)}
                  />
                  <div
                    className={`mt-4 rounded-xl border-2 px-4 py-4 text-center ${
                      paymentMethod === PaymentMethod.Charged
                        ? "border-amber-200/80 bg-amber-50/80"
                        : cashShort > 0
                          ? "border-red-200/80 bg-red-50/70"
                          : "border-green-300/80 bg-green-50/80"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {paymentMethod === PaymentMethod.Charged
                        ? "Balance due"
                        : cashShort > 0
                          ? "Still needed"
                          : "Change"}
                    </p>
                    <p
                      className={`mt-1 text-3xl font-bold tabular-nums sm:text-5xl ${
                        paymentMethod === PaymentMethod.Charged
                          ? "text-warning"
                          : cashShort > 0
                            ? "text-amount-negative"
                            : "text-amount-positive"
                      }`}
                    >
                      {paymentMethod === PaymentMethod.Charged
                        ? formatCurrency(balanceDue)
                        : cashShort > 0
                          ? formatCurrency(cashShort)
                          : formatCurrency(change)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:min-w-[120px] sm:w-auto"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 w-full font-semibold sm:min-w-[200px] sm:w-auto"
              onClick={onConfirm}
              disabled={processing || (isSplit && splitError !== null)}
            >
              {processing ? "Processing..." : "Confirm payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SplitSummaryPanel({ summary }: { summary: SplitSummary }) {
  const fullyPaid = summary.remaining <= 0.005 && !summary.over;
  return (
    <div className="space-y-2">
      {summary.cashSum > 0 && (
        <SummaryRow label="Cash" value={formatCurrency(summary.cashSum)} />
      )}
      {summary.electronicNow > 0 && (
        <SummaryRow label="QRPH / Bank" value={formatCurrency(summary.electronicNow)} />
      )}
      {summary.creditSum > 0 && (
        <SummaryRow
          label="Cheque / charge (receivable)"
          value={formatCurrency(summary.creditSum)}
        />
      )}
      <div
        className={`mt-3 rounded-xl border-2 px-4 py-4 text-center ${
          summary.over || summary.remaining > 0.005
            ? "border-red-200/80 bg-red-50/70"
            : "border-green-300/80 bg-green-50/80"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {summary.over
            ? "Over-allocated"
            : summary.remaining > 0.005
              ? "Still needed"
              : summary.change > 0.005
                ? "Change"
                : "Fully paid"}
        </p>
        <p
          className={`mt-1 text-3xl font-bold tabular-nums sm:text-5xl ${
            summary.over || summary.remaining > 0.005
              ? "text-amount-negative"
              : "text-amount-positive"
          }`}
        >
          {summary.remaining > 0.005
            ? formatCurrency(summary.remaining)
            : formatCurrency(summary.change)}
        </p>
        {fullyPaid && summary.change <= 0.005 && (
          <p className="mt-1 text-xs text-muted-foreground">All tenders cover the total</p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  large,
  highlight,
  className,
}: {
  label: string;
  value: string;
  large?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 ${large ? "text-lg" : "text-sm"} ${className ?? ""}`}
    >
      <span className={highlight ? "font-bold text-slate-900" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={`font-semibold tabular-nums ${highlight ? "text-xl text-primary" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
