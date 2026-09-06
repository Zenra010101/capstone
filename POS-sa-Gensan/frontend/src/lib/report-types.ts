export type ReportTypeKind =
  | "Sales"
  | "Profit"
  | "Inventory"
  | "InventoryMovement"
  | "Receivables"
  | "Tax"
  | "Voids"
  | "Grs"
  | "Audit"
  | "StockReceiving";

export const REPORT_TYPE_OPTIONS: { value: ReportTypeKind; label: string }[] = [
  { value: "Sales", label: "Sales" },
  { value: "Profit", label: "Profit" },
  { value: "Inventory", label: "Inventory snapshot" },
  { value: "InventoryMovement", label: "Inventory movements" },
  { value: "Receivables", label: "Receivables / Charge" },
  { value: "Tax", label: "Tax" },
  { value: "Voids", label: "Voids" },
  { value: "Grs", label: "Returns (GRS)" },
  { value: "StockReceiving", label: "Stock receiving" },
  { value: "Audit", label: "Audit log" },
];

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnifiedReport {
  summary: {
    reportType: string;
    from: string;
    to: string;
    totals: Record<string, number>;
    counts: Record<string, number>;
    paymentBreakdown?: {
      method: string;
      count: number;
      amount: number;
      invoiceAmount?: number;
      collectedAmount?: number;
    }[];
    topProducts?: { productName: string; sku: string; profit: number }[];
  };
  salesRows?: PagedResult<SalesReportRow>;
  movementRows?: PagedResult<MovementRow>;
  receivableRows?: PagedResult<ReceivableRow>;
  taxRows?: PagedResult<TaxRow>;
  voidRows?: PagedResult<VoidRow>;
  grsRows?: PagedResult<GrsRow>;
  inventoryRows?: PagedResult<InventoryRow>;
  stockReceivingRows?: PagedResult<StockReceivingRow>;
  auditRows?: PagedResult<AuditRow>;
  profitDetail?: import("@/lib/types").ProfitReport;
}

export interface SalesReportRow {
  id: string;
  saleNumber: string;
  createdAt: string;
  cashierName: string;
  paymentMethod: string;
  customerName?: string;
  subTotal: number;
  discountAmount: number;
  taxTypeLabel: string;
  taxAmount: number;
  withholdingAmount: number;
  totalAmount: number;
  collectedAmount: number;
  receivableAmount: number;
}

export interface MovementRow {
  id: string;
  createdAt: string;
  productName: string;
  sku: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  userName?: string;
}

export interface ReceivableRow {
  saleNumber: string;
  customerName: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: string;
  isArchived: boolean;
}

export interface TaxRow {
  saleNumber: string;
  createdAt: string;
  taxTypeLabel: string;
  taxRate: number;
  taxAmount: number;
  withholdingAmount: number;
  totalAmount: number;
}

export interface VoidRow {
  saleNumber: string;
  voidedAt: string;
  cashierName: string;
  voidReason?: string;
  totalAmount: number;
}

export interface GrsRow {
  grsNumber: string;
  saleNumber: string;
  customerName?: string;
  returnDate: string;
  originalSaleDate: string;
  totalReturnAmount: number;
  reason: string;
  refundMethod: number;
  status: number;
  processedByName: string;
  isArchived: boolean;
}

export interface InventoryRow {
  sku: string;
  productName: string;
  category: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  costPrice: number;
  isActive: boolean;
}

export interface StockReceivingRow {
  receivingNumber: string;
  supplierName: string;
  deliveryDate: string;
  status: string;
  itemCount: number;
  isArchived: boolean;
}

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string;
  userEmail?: string;
  details?: string;
  isArchived: boolean;
}

export interface SaleListItem {
  id: string;
  saleNumber: string;
  cashierName: string;
  totalAmount: number;
  paymentMethod: number;
  status: number;
  customerName?: string;
  taxTypeLabel: string;
  taxAmount: number;
  grossProfit?: number;
  isArchived: boolean;
  createdAt: string;
}
