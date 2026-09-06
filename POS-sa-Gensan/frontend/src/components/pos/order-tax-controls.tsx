"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISCOUNT_PERCENT_OPTIONS,
  SALE_TAX_OPTIONS,
  SaleTaxMode,
  type ManualTaxInput,
  type SaleTaxModeValue,
} from "@/lib/tax";

export type OrderTaxControlsProps = {
  discountPercent: number;
  onDiscountPercentChange: (n: number) => void;
  taxMode: SaleTaxModeValue;
  onTaxModeChange: (mode: SaleTaxModeValue) => void;
  manualTax: ManualTaxInput;
  onManualTaxChange: (patch: Partial<ManualTaxInput>) => void;
  compact?: boolean;
  /** POS cart sidebar: open menus upward and avoid clipping over totals */
  posSidebar?: boolean;
};

export function OrderTaxControls({
  discountPercent,
  onDiscountPercentChange,
  taxMode,
  onTaxModeChange,
  manualTax,
  onManualTaxChange,
  compact,
  posSidebar,
}: OrderTaxControlsProps) {
  const menuSide = posSidebar ? ("top" as const) : ("bottom" as const);
  const menuClass = posSidebar
    ? "z-[200] min-w-[var(--anchor-width)] max-w-[min(100vw-2rem,18rem)]"
    : undefined;
  const triggerClass = compact
    ? "h-9 w-full min-w-0 [&_[data-slot=select-value]]:truncate"
    : "h-10 w-full";

  const taxLabel = (value: SaleTaxModeValue) => {
    if (posSidebar && value === SaleTaxMode.Withholding1) return "WHT 1%";
    return SALE_TAX_OPTIONS.find((o) => o.value === value)?.label ?? "Tax";
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div
        className={
          posSidebar
            ? "grid grid-cols-1 gap-3 min-[400px]:grid-cols-2"
            : "space-y-3"
        }
      >
        <div className="space-y-2">
          <Label className={compact ? "text-xs" : undefined}>
            Order discount
          </Label>
          <Select
            value={String(discountPercent)}
            onValueChange={(v) => onDiscountPercentChange(Number(v ?? 0))}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue>
                {discountPercent === 0 ? "0% (none)" : `${discountPercent}%`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side={menuSide} className={menuClass}>
              {DISCOUNT_PERCENT_OPTIONS.map((p) => (
                <SelectItem
                  key={p}
                  value={String(p)}
                  className="whitespace-normal"
                >
                  {p === 0 ? "0% (none)" : `${p}%`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className={compact ? "text-xs" : undefined}>Tax</Label>
          <Select
            value={String(taxMode)}
            onValueChange={(v) => onTaxModeChange(Number(v) as SaleTaxModeValue)}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Select tax">
                {taxLabel(taxMode)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side={menuSide} className={menuClass}>
              {SALE_TAX_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={String(o.value)}
                  className="whitespace-normal py-2"
                >
                  {posSidebar && o.value === SaleTaxMode.Withholding1
                    ? "WHT 1%"
                    : o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {taxMode === SaleTaxMode.Manual && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-2">
            <Label className="text-xs">Tax name</Label>
            <Input
              className="h-9"
              placeholder="e.g. Local tax"
              value={manualTax.name}
              onChange={(e) => onManualTaxChange({ name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Type</Label>
              <Select
                value={manualTax.isPercent ? "percent" : "amount"}
                onValueChange={(v) =>
                  onManualTaxChange({ isPercent: v === "percent" })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side={menuSide} className={menuClass}>
                  <SelectItem value="percent">Rate %</SelectItem>
                  <SelectItem value="amount">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                {manualTax.isPercent ? "Rate (%)" : "Amount (PHP)"}
              </Label>
              <Input
                type="number"
                min={0}
                step={manualTax.isPercent ? 0.01 : 0.01}
                className="h-9"
                value={manualTax.value || ""}
                onChange={(e) =>
                  onManualTaxChange({
                    value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Effect on total</Label>
            <Select
              value={manualTax.isDeduction ? "deduct" : "add"}
              onValueChange={(v) =>
                onManualTaxChange({ isDeduction: v === "deduct" })
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side={menuSide} className={menuClass}>
                <SelectItem value="add">Add to total</SelectItem>
                <SelectItem value="deduct">Deduct from total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
