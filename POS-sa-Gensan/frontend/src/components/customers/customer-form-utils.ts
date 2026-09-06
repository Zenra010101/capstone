import { CustomerType, SupplierPaymentTerms, SUPPLIER_PAYMENT_TERMS } from "@/lib/types";

export const CUSTOMER_FORM_TYPE_OPTIONS = [
  CustomerType.WalkIn,
  CustomerType.Regular,
  CustomerType.Contractor,
  CustomerType.Company,
  CustomerType.CreditAccount,
  CustomerType.Vip,
].map((value) => ({
  value: String(value),
  label:
    value === CustomerType.WalkIn
      ? "Walk-in"
      : value === CustomerType.Regular
        ? "Regular"
        : value === CustomerType.Contractor
          ? "Contractor"
          : value === CustomerType.Company
            ? "Company"
            : value === CustomerType.CreditAccount
              ? "Credit Account"
              : "VIP",
}));

export const CUSTOMER_FORM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Blocked" },
  { value: "blacklisted", label: "Blacklisted" },
];

export const CUSTOMER_FORM_PAYMENT_OPTIONS = [
  SupplierPaymentTerms.Cod,
  SupplierPaymentTerms.Net7,
  SupplierPaymentTerms.Net15,
  SupplierPaymentTerms.Net30,
  SupplierPaymentTerms.Custom,
].map((value) => ({
  value: String(value),
  label: SUPPLIER_PAYMENT_TERMS[value],
}));

export function defaultDueDaysForPaymentTerms(terms: number): number {
  switch (terms) {
    case SupplierPaymentTerms.Net7:
      return 7;
    case SupplierPaymentTerms.Net15:
      return 15;
    case SupplierPaymentTerms.Net30:
      return 30;
    default:
      return 0;
  }
}

export function customerStatusToFlags(status: string) {
  switch (status) {
    case "inactive":
      return { isActive: false, isBlocked: false, isBlacklisted: false };
    case "blocked":
      return { isActive: false, isBlocked: true, isBlacklisted: false };
    case "blacklisted":
      return { isActive: false, isBlocked: false, isBlacklisted: true };
    default:
      return { isActive: true, isBlocked: false, isBlacklisted: false };
  }
}

export function customerStatusLabel(status: string): string {
  return CUSTOMER_FORM_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "Active";
}

export const CUSTOMER_INPUT_CLASS = "h-9";

export const CUSTOMER_TEXTAREA_CLASS =
  "flex min-h-[3.25rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
