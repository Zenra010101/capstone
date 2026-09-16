import {
  SupplierContactRole,
  SupplierPaymentTerms,
  SupplierStatus,
  SUPPLIER_PAYMENT_TERMS,
} from "@/lib/types";

export const SUPPLIER_FORM_PAYMENT_TERMS = [
  SupplierPaymentTerms.Cod,
  SupplierPaymentTerms.Net7,
  SupplierPaymentTerms.Net15,
  SupplierPaymentTerms.Net30,
  SupplierPaymentTerms.Custom,
] as const;

export const SUPPLIER_FORM_PAYMENT_OPTIONS = SUPPLIER_FORM_PAYMENT_TERMS.map((value) => ({
  value: String(value),
  label: SUPPLIER_PAYMENT_TERMS[value],
}));

export const SUPPLIER_FORM_STATUS_OPTIONS = [
  { value: String(SupplierStatus.Active), label: "Active" },
  { value: String(SupplierStatus.Inactive), label: "Inactive" },
  { value: String(SupplierStatus.Suspended), label: "Suspended" },
  { value: String(SupplierStatus.Blacklisted), label: "Blacklisted" },
];

export const SUPPLIER_EDIT_STATUS_OPTIONS = [
  ...SUPPLIER_FORM_STATUS_OPTIONS,
  { value: String(SupplierStatus.Preferred), label: "Preferred supplier" },
];

export const SUPPLIER_CONTACT_ROLE_OPTIONS = [
  { value: String(SupplierContactRole.SalesRepresentative), label: "Sales representative" },
  { value: String(SupplierContactRole.Accounting), label: "Accounting" },
  { value: String(SupplierContactRole.Warehouse), label: "Warehouse contact" },
  { value: String(SupplierContactRole.General), label: "General" },
];

export const SUPPLIER_TEXTAREA_CLASS =
  "flex min-h-[3.25rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const SUPPLIER_INPUT_CLASS = "h-9";
