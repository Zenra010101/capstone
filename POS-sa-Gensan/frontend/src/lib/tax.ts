export const SaleTaxMode = {
  None: 0,
  Vat12: 1,
  Withholding1: 2,
  Manual: 3,
} as const;

export type SaleTaxModeValue = (typeof SaleTaxMode)[keyof typeof SaleTaxMode];

export const SALE_TAX_OPTIONS: {
  value: SaleTaxModeValue;
  label: string;
}[] = [
  { value: SaleTaxMode.None, label: "No Tax" },
  { value: SaleTaxMode.Vat12, label: "VAT 12%" },
  { value: SaleTaxMode.Withholding1, label: "Withholding Tax (WHT) 1%" },
  { value: SaleTaxMode.Manual, label: "Manual Tax" },
];

export const DISCOUNT_PERCENT_OPTIONS = Array.from({ length: 21 }, (_, i) => i);

export type ManualTaxInput = {
  name: string;
  isPercent: boolean;
  value: number;
  isDeduction: boolean;
};

export type SaleTaxInput = {
  subTotal: number;
  discountPercent: number;
  taxMode: SaleTaxModeValue;
  manualTax?: ManualTaxInput;
};

export type SaleTaxResult = {
  discountPercent: number;
  discountAmount: number;
  taxableBase: number;
  taxMode: SaleTaxModeValue;
  taxTypeLabel: string;
  taxRate: number;
  taxAmount: number;
  withholdingAmount: number;
  total: number;
  manualTaxName?: string;
};

const VAT_RATE = 0.12;
const WHT_RATE = 0.01;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeSaleTax(input: SaleTaxInput): SaleTaxResult {
  const discountPercent = Math.min(100, Math.max(0, input.discountPercent || 0));
  const discountAmount = round(Math.max(input.subTotal, 0) * (discountPercent / 100));
  const taxableBase = Math.max(input.subTotal - discountAmount, 0);

  let taxRate = 0;
  let taxAmount = 0;
  let withholdingAmount = 0;
  let taxTypeLabel = "No Tax";
  let manualTaxName: string | undefined;

  switch (input.taxMode) {
    case SaleTaxMode.Vat12:
      taxRate = VAT_RATE;
      taxAmount = round(taxableBase * VAT_RATE);
      taxTypeLabel = "VAT 12%";
      break;
    case SaleTaxMode.Withholding1:
      taxRate = WHT_RATE;
      withholdingAmount = round(taxableBase * WHT_RATE);
      taxTypeLabel = "Withholding Tax (WHT) 1%";
      break;
    case SaleTaxMode.Manual: {
      const m = input.manualTax;
      manualTaxName = m?.name?.trim() || "Manual Tax";
      taxTypeLabel = manualTaxName;
      const raw = Math.max(m?.value ?? 0, 0);
      const manualAmount = m?.isPercent ? round(taxableBase * (raw / 100)) : round(raw);
      if (m?.isPercent && taxableBase > 0) taxRate = raw / 100;
      if (m?.isDeduction) withholdingAmount = manualAmount;
      else taxAmount = manualAmount;
      break;
    }
    default:
      break;
  }

  const total = Math.max(taxableBase + taxAmount - withholdingAmount, 0);

  return {
    discountPercent,
    discountAmount,
    taxableBase,
    taxMode: input.taxMode,
    taxTypeLabel,
    taxRate,
    taxAmount,
    withholdingAmount,
    total,
    manualTaxName,
  };
}

export function formatTaxRatePercent(rate: number, taxMode: SaleTaxModeValue) {
  if (taxMode === SaleTaxMode.Manual && rate <= 0) return "—";
  if (rate <= 0) return "0%";
  return `${(rate * 100).toFixed(rate === WHT_RATE || rate === VAT_RATE ? 0 : 2)}%`;
}
