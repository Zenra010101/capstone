"use client";

import { formatCurrency } from "@/lib/format";
import {
  formatTaxRatePercent,
  SaleTaxMode,
  type SaleTaxModeValue,
  type SaleTaxResult,
} from "@/lib/tax";
import { cn } from "@/lib/utils";

export function SaleTaxSummary({
  subtotal,
  tax,
  className,
  largeTotal,
}: {
  subtotal: number;
  tax: SaleTaxResult;
  className?: string;
  largeTotal?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      <Row label="Subtotal" value={formatCurrency(subtotal)} />
      {tax.discountAmount > 0 && (
        <Row
          label={`Discount (${tax.discountPercent}%)`}
          value={`-${formatCurrency(tax.discountAmount)}`}
          className="text-red-600"
        />
      )}
      {tax.taxMode !== SaleTaxMode.None && (
        <>
          <Row label="Tax type" value={tax.taxTypeLabel} />
          <Row
            label="Tax rate"
            value={formatTaxRatePercent(tax.taxRate, tax.taxMode)}
          />
        </>
      )}
      {tax.taxAmount > 0 && (
        <Row label="Tax amount" value={formatCurrency(tax.taxAmount)} />
      )}
      {tax.withholdingAmount > 0 && (
        <Row
          label="Withholding"
          value={`-${formatCurrency(tax.withholdingAmount)}`}
          className="text-amber-800"
        />
      )}
      <div className="my-2 border-t border-dashed" />
      <Row
        label="Total due"
        value={formatCurrency(tax.total)}
        className={largeTotal ? "text-lg font-bold text-primary" : "font-bold"}
      />
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-right font-medium">{value}</span>
    </div>
  );
}
