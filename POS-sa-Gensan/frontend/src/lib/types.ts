export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "Owner" | "Cashier" | string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export enum StockStatus {
  InStock = 0,
  LowStock = 1,
  Critical = 2,
  OutOfStock = 3,
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  [StockStatus.InStock]: "In Stock",
  [StockStatus.LowStock]: "Low Stock",
  [StockStatus.Critical]: "Critical",
  [StockStatus.OutOfStock]: "Out of Stock",
};

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  size?: string;
  thickness?: string;
  length?: string;
  grade?: string;
  diameter?: string;
  schedule?: string;
  width?: string;
  height?: string;
  materialType?: string;
  specification?: string;
  unitOfMeasure: string;
  unitPrice: number;
  costPrice?: number | null;
  inventoryValue?: number | null;
  marginPercent?: number | null;
  stockQuantity: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  stockStatusLabel: string;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  supplierId?: string;
  supplierName?: string;
  isLowStock: boolean;
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  missingBarcodeCount: number;
  totalInventoryValue?: number | null;
}

export interface ProductMovement {
  id: string;
  createdAt: string;
  movementType: string;
  referenceNumber?: string;
  quantityChange: number;
  runningBalance: number;
  processedBy?: string;
  notes?: string;
}

export interface ProductSaleHistory {
  saleId: string;
  saleNumber: string;
  saleDate: string;
  cashierName: string;
  status: number;
  statusLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  costPriceAtSale?: number | null;
  lineProfit?: number | null;
}

export interface ProductReceivingHistory {
  receivingId: string;
  receivingNumber: string;
  supplierName: string;
  status: number;
  statusLabel: string;
  createdAt: string;
  referenceNumber?: string;
  requestedByName: string;
  quantity: number;
  costPrice?: number | null;
  lineCost?: number | null;
}

export interface ProductPriceHistory {
  changedAt: string;
  changedBy?: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  colorAccent?: string;
  isActive: boolean;
  statusLabel: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  createdAt: string;
  createdByUserId?: string;
  createdByName?: string;
  productCount: number;
  totalStockUnits: number;
  lowStockCount: number;
  totalInventoryValue?: number | null;
  profitLast30Days?: number | null;
  revenueLast30Days?: number | null;
}

export interface CategorySummary {
  totalCategories: number;
  activeCategories: number;
  archivedCategories: number;
  categoriesWithLowStock: number;
  emptyCategories: number;
}

export interface CartBatchLine {
  batchId: string;
  batchCode?: string | null;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  subtotal: number;
}

export interface BatchAllocationResult {
  productId: string;
  productName: string;
  requestedQuantity: number;
  insufficientStock: boolean;
  availableTotal: number;
  needsWarning: boolean;
  lowestPriceAvailable: number;
  lowestPrice: number;
  warningMessage?: string | null;
  total: number;
  lines: CartBatchLine[];
  availableBatches: AvailableBatch[];
}

export interface AvailableBatch {
  batchId: string;
  batchCode?: string | null;
  remainingQuantity: number;
  sellingPrice: number;
  receivedDate: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchCode?: string | null;
  costPrice: number;
  sellingPrice: number;
  receivedQuantity: number;
  remainingQuantity: number;
  receivedDate: string;
  stockReceivingId?: string | null;
  stockReceivingItemId?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  receivedByUserId?: string | null;
  receivedByName?: string | null;
  approvedByUserId?: string | null;
  approvedByName?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReceivingBatchSummary {
  id: string;
  productId: string;
  productName: string;
  batchCode?: string | null;
  receivedQuantity: number;
  remainingQuantity: number;
  costPrice: number;
  sellingPrice: number;
  receivedDate: string;
  status: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  batchLines: CartBatchLine[];
}

export interface SalePayment {
  method: number;
  amount: number;
  qrphReference?: string;
  bankName?: string;
  bankBranch?: string;
  bankReferenceNumber?: string;
  senderName?: string;
  datePaid?: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  userId: string;
  cashierName: string;
  subTotal: number;
  discountPercent?: number;
  discountAmount: number;
  taxMode?: number;
  taxTypeLabel?: string;
  taxRate?: number;
  taxAmount: number;
  withholdingAmount?: number;
  manualTaxName?: string;
  manualTaxIsPercent?: boolean;
  manualTaxValue?: number;
  manualTaxIsDeduction?: boolean;
  totalAmount: number;
  grossProfit?: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: number;
  status: number;
  customerName?: string;
  dueDate?: string;
  termsDays?: number;
  receivableId?: string;
  receivableBalance?: number;
  voidReason?: string;
  voidedAt?: string;
  voidedByName?: string;
  replacesSaleId?: string;
  replacesSaleNumber?: string;
  replacedBySaleId?: string;
  replacedBySaleNumber?: string;
  isExchangeTopUp?: boolean;
  exchangeNumber?: string;
  grsNumber?: string;
  returnCreditTotal?: number;
  notes?: string;
  createdAt: string;
  items: SaleItem[];
  payment?: SalePayment;
  cheque?: SaleCheque;
  payments?: SalePayment[];
}

export interface SaleCheque {
  id: string;
  type: number;
  status: number;
  bankName: string;
  branch?: string;
  chequeNumber: string;
  accountName: string;
  amount: number;
  maturityDate: string;
  clearedAt?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productBatchId?: string | null;
  batchCode?: string | null;
  batchReceivedDate?: string | null;
  productName: string;
  productSku: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  sellingPriceAtSale?: number;
  costPriceAtSale?: number;
  profitAmount?: number;
  discount: number;
  lineTotal: number;
}

export interface SalesReport {
  from: string;
  to: string;
  transactionCount: number;
  grossSales: number;
  totalReturns: number;
  netSales: number;
  collectedAtSale: number;
  collectedInPeriod: number;
  totalTax: number;
  totalWithholding: number;
  totalDiscount: number;
  byPaymentMethod: {
    method: string;
    count: number;
    amount: number;
    invoiceAmount?: number;
    collectedAmount?: number;
  }[];
  rows: SalesReportRow[];
}

export interface SalesSummaryReport {
  generatedAt: string;
  printedAtLabel: string;
  printedDateLabel: string;
  periodLabel: string;
  preset: string;
  from: string;
  to: string;
  preparedFor?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  transactionCount: number;
  grossSales: number;
  returnTransactionCount: number;
  exchangeCount: number;
  totalReturns: number;
  netSales: number;
  totalLineAmount: number;
  totalCash: number;
  totalCurrent: number;
  totalCharge: number;
  totalOnline: number;
  verificationQrText?: string;
  verificationQrPayload?: string;
  verificationQrPngBase64?: string;
  verificationReportCode?: string;
  verificationUrl?: string;
  printedBy?: string;
  lines: SalesSummaryLine[];
}

export interface SalesReportVerificationView {
  reportId: string;
  reportTitle: string;
  systemName: string;
  reportDateRange: string;
  periodLabel: string;
  grossSales: number;
  netSales: number;
  totalLineAmount: number;
  totalSales: number;
  printedAtLabel: string;
  generatedAtLabel: string;
  generatedBy?: string | null;
  status: string;
  storeName?: string | null;
}

export interface SalesSummaryLine {
  saleDate: string;
  drNumber: string;
  ciNumber?: string | null;
  chNumber?: string | null;
  customerName: string;
  quantity: number;
  size: string;
  type: string;
  unitPrice: number;
  lineTotal: number;
  discountPercent: number;
  cashAmount: number;
  currentAmount: number;
  chargeAmount: number;
  onlineAmount: number;
  term: string;
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

export interface ProfitReport {
  from: string;
  to: string;
  grossSales: number;
  returns: number;
  netSales: number;
  costOfGoodsSold: number;
  returnsCost: number;
  netCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  byDay: { date: string; netSales: number; cost: number; profit: number }[];
  byProduct: {
    productName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
  byCategory?: {
    categoryName: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

export const AuditLogCategory = {
  Security: 0,
  Operational: 1,
} as const;

export interface AuditLogEntry {
  id: string;
  userEmail?: string;
  category: number;
  logType: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface AuditLogSearchResult {
  items: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface Dashboard {
  todaySales: number;
  todayReturns: number;
  todayNetSales: number;
  todayCollected: number;
  todayTransactions: number;
  myTodaySales: number;
  myTodayCollected: number;
  myTodayTransactions: number;
  cashiersTodaySales: number;
  cashiersTodayCollected: number;
  cashiersTodayTransactions: number;
  ownerRoleTodaySales: number;
  ownerRoleTodayReturns: number;
  ownerRoleTodayNetSales: number;
  ownerRoleTodayTransactions: number;
  cashierRoleTodaySales: number;
  cashierRoleTodayReturns: number;
  cashierRoleTodayNetSales: number;
  cashierRoleTodayTransactions: number;
  storeTodaySales: number;
  storeTodayCollected: number;
  totalProducts: number;
  lowStockCount: number;
  isOwnerView: boolean;
  last7Days: { date: string; total: number; returns: number; netTotal: number; collected: number; count: number }[];
  topProducts: {
    productId: string;
    productName: string;
    productSku: string;
    quantitySold: number;
    revenue: number;
  }[];
  todayProfit?: number;
  todaySalesProfit?: number;
  todayReturnsProfitReversed?: number;
  todayZeroCostSaleLineCount?: number;
  profitMissingCostWarning?: boolean;
  monthSales?: number;
  monthProfit?: number;
  totalRevenue?: number;
  totalProfit?: number;
  inventoryValue?: number;
  profitLast7Days?: { date: string; sales: number; profit: number }[];
}

/** GRS status: legacy 0–2; exchange workflow 10+ */
export enum GrsStatus {
  Completed = 0,
  Cancelled = 1,
  Voided = 2,
  Draft = 10,
  PendingInspection = 20,
  Approved = 30,
  Rejected = 40,
  ExchangeCancelled = 50,
}

export enum GrsWorkflowKind {
  LegacyRefund = 0,
  ExchangeReturn = 1,
}

export interface AppFeatures {
  exchangeWorkflowPhase1Enabled: boolean;
}

export enum GrsRefundMethod {
  Cash = 0,
  Qrph = 1,
  OnlineBank = 2,
  UtangCredit = 3,
  Cheque = 4,
  StoreCredit = 5,
}

export const GRS_REFUND_LABELS: Record<number, string> = {
  [GrsRefundMethod.Cash]: "Cash refund",
  [GrsRefundMethod.Qrph]: "QRPH refund",
  [GrsRefundMethod.OnlineBank]: "Online bank refund",
  [GrsRefundMethod.UtangCredit]: "Charge credit",
  [GrsRefundMethod.Cheque]: "Cheque reversal",
  [GrsRefundMethod.StoreCredit]: "Store credit",
};

export const GRS_STATUS: Record<
  number,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  [GrsStatus.Completed]: { label: "Completed", variant: "default" },
  [GrsStatus.Cancelled]: { label: "Cancelled", variant: "secondary" },
  [GrsStatus.Voided]: { label: "Voided", variant: "destructive" },
  [GrsStatus.Draft]: { label: "Draft", variant: "outline" },
  [GrsStatus.PendingInspection]: { label: "Pending inspection", variant: "outline" },
  [GrsStatus.Approved]: { label: "Approved", variant: "default" },
  [GrsStatus.Rejected]: { label: "Rejected", variant: "destructive" },
  [GrsStatus.ExchangeCancelled]: { label: "Cancelled", variant: "secondary" },
};

export function grsStatusDisplay(
  status: number,
  statusLabel?: string
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (statusLabel?.trim()) {
    const base = GRS_STATUS[status];
    return { label: statusLabel, variant: base?.variant ?? "secondary" };
  }
  return GRS_STATUS[status] ?? { label: "—", variant: "secondary" };
}

export interface SaleForReturn {
  id: string;
  saleNumber: string;
  cashierName: string;
  customerName?: string;
  totalAmount: number;
  paymentMethod: number;
  receivableBalance?: number;
  createdAt: string;
  items: SaleItemForReturn[];
}

export interface SaleItemForReturn {
  saleItemId: string;
  productBatchId?: string | null;
  batchCode?: string | null;
  batchReceivedDate?: string | null;
  productId: string;
  productName: string;
  productSku: string;
  quantitySold: number;
  returnedQuantity: number;
  pendingReturnQuantity?: number;
  availableToReturn: number;
  unitPrice: number;
  sellingPriceAtSale: number;
  costPriceAtSale: number;
}

export interface GoodsReturnSlipItem {
  id?: string;
  saleItemId?: string;
  productBatchId?: string | null;
  batchCode?: string | null;
  batchReceivedDate?: string | null;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  sellingPriceAtSale: number;
  costPriceAtSale: number;
  unitPrice: number;
  returnAmount: number;
  lineTotal?: number;
  condition: number;
}

export interface GoodsReturnSlip {
  id: string;
  grsNumber: string;
  originalSaleId: string;
  originalSaleNumber: string;
  originalSaleCashierName?: string;
  customerName?: string;
  originalSaleDate: string;
  processedByName: string;
  processedByUserId?: string;
  returnDate: string;
  totalReturnAmount: number;
  totalQuantity?: number;
  itemsSummary?: string;
  reason: string;
  goodConditionConfirmed: boolean;
  refundMethod: number;
  workflowKind?: number;
  status: number;
  statusLabel?: string;
  notes?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  stockRestoredAt?: string;
  awaitingExchange?: boolean;
  createdAt: string;
  voidedAt?: string;
  voidedByName?: string;
  voidReason?: string;
  items: GoodsReturnSlipItem[];
  exchange?: GoodsExchange | null;
}

export interface GoodsExchangeLine {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface GoodsExchange {
  id: string;
  exchangeNumber: string;
  returnCreditTotal: number;
  replacementTotal: number;
  amountPaid: number;
  paymentMethod?: number;
  topUpSaleNumber?: string;
  completedAt: string;
  lines: GoodsExchangeLine[];
}

export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GoodsReturnSlipPaged {
  items: GoodsReturnSlip[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomersSummary {
  totalCount: number;
  withBalanceCount: number;
  totalOutstanding: number;
  overdueCustomersCount: number;
}

export enum AdjustmentRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export enum AdjustmentType {
  CountingError = 0,
  MissingStock = 1,
  DamagedItems = 2,
  ReturnedStock = 3,
  ManualCorrection = 4,
  ExpiredDefective = 5,
  Other = 6,
  Lost = 7,
  ManagementRemoval = 8,
  StockCountCorrection = 9,
}

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  [AdjustmentType.CountingError]: "Counting Error",
  [AdjustmentType.MissingStock]: "Missing",
  [AdjustmentType.DamagedItems]: "Damaged",
  [AdjustmentType.ReturnedStock]: "Returned Stock",
  [AdjustmentType.ManualCorrection]: "Manual Correction",
  [AdjustmentType.ExpiredDefective]: "Expired/Defective",
  [AdjustmentType.Other]: "Other",
  [AdjustmentType.Lost]: "Lost",
  [AdjustmentType.ManagementRemoval]: "Management Removal",
  [AdjustmentType.StockCountCorrection]: "Stock Count Correction",
};

export interface InventoryAdjustmentLine {
  id: string;
  productBatchId: string;
  batchCode?: string | null;
  receivedDate: string;
  supplierName?: string | null;
  costPrice: number;
  sellingPrice: number;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
}

export interface InventoryAdjustmentRequest {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  categoryName?: string;
  unitOfMeasure?: string;
  systemQuantity: number;
  actualQuantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  difference: number;
  adjustmentType: AdjustmentType;
  adjustmentTypeLabel: string;
  reason: string;
  notes?: string;
  status: AdjustmentRequestStatus;
  statusLabel: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  lineInventoryValue?: number | null;
  countingSessionId?: string;
  createdAt: string;
  lines: InventoryAdjustmentLine[];
}

export interface InventoryAdjustmentSummary {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  netUnitsPendingAdjustment: number;
}

export const ADJUSTMENT_STATUS: Record<
  number,
  { label: string; className: string }
> = {
  [AdjustmentRequestStatus.Pending]: {
    label: "Pending",
    className: "border-amber-200 bg-amber-100 text-amber-800",
  },
  [AdjustmentRequestStatus.Approved]: {
    label: "Approved",
    className: "border-green-200 bg-green-100 text-green-700",
  },
  [AdjustmentRequestStatus.Rejected]: {
    label: "Rejected",
    className: "border-red-200 bg-red-100 text-red-700",
  },
};

export interface InventoryOnHand {
  productId: string;
  productName: string;
  productSku: string;
  categoryName: string;
  categoryId: string;
  unitOfMeasure: string;
  stockQuantity: number;
  stockStatus: StockStatus;
  stockStatusLabel: string;
  lastMovementAt?: string;
  costPrice?: number | null;
  inventoryValue?: number | null;
}

export interface InventorySummary {
  totalUnits: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  activeSkuCount: number;
  totalInventoryValue?: number | null;
}

export interface InventoryStockListLine {
  productName: string;
  productSku: string;
  batchCode: string;
  receivedDate: string;
  receivedQuantity: number;
  remainingQuantity: number;
  costPrice: number;
  sellingPrice: number;
  valueAtCost: number;
}

export interface InventoryStockListReport {
  periodLabel: string;
  generatedAt: string;
  printedAtLabel: string;
  printedDateLabel: string;
  totalValueAtCost: number;
  lines: InventoryStockListLine[];
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  categoryName?: string;
  type: number;
  movementTypeLabel: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  reason?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  productBatchId?: string;
  batchCode?: string | null;
  createdAt: string;
}

export const INVENTORY_MOVEMENT_TYPES = [
  { value: "1", label: "Sale" },
  { value: "0", label: "Stock Receiving" },
  { value: "3", label: "Return / GRS" },
  { value: "2", label: "Adjustment" },
] as const;

export interface UserManagement {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export const PaymentMethod = {
  Cash: 0,
  QRPH: 1,
  OnlineBank: 2,
  Charged: 3,
  Cheque: 4,
  Split: 5,
} as const;

export const PAYMENT_LABELS: Record<number, string> = {
  0: "Cash",
  1: "QRPH",
  2: "Online Bank",
  3: "Charge",
  4: "Cheque / PDC",
  5: "Split payment",
};

export const ChequeType = { Current: 0, PostDated: 1 } as const;
export const ChequeStatus = { Pending: 0, Cleared: 1, Bounced: 2 } as const;

export const CHEQUE_TYPE_LABELS: Record<number, string> = {
  0: "Current cheque",
  1: "Post-dated (PDC)",
};

export const CHEQUE_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Cleared",
  2: "Bounced",
};

export type ReceiptPaperSize = "A5" | "A4";

export interface StoreSettings {
  vatEnabled: boolean;
  vatRate: number;
  pricesIncludeVat: boolean;
  outletLine: string;
  brandLine: string;
  tagline: string;
  storeName: string;
  address: string;
  phone: string;
  trustReceiptTitle: string;
  cashReceiptTitle: string;
  allowCashierBarcodePrinting: boolean;
  /** A5 (default, half bond) or A4 full page */
  receiptPaperSize: ReceiptPaperSize;
}

export interface Cheque {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  type: number;
  status: number;
  bankName: string;
  branch?: string;
  chequeNumber: string;
  accountName: string;
  amount: number;
  maturityDate: string;
  clearedAt?: string;
  bouncedAt?: string;
  bounceReason?: string;
  notes?: string;
  createdAt: string;
}

export interface ChequesSummary {
  pendingCount: number;
  pendingAmount: number;
  postDatedPendingCount: number;
}

export const CustomerType = {
  WalkIn: 0,
  Contractor: 1,
  Company: 2,
  Vip: 3,
  Supplier: 4,
  Regular: 5,
  CreditAccount: 6,
} as const;

export const CUSTOMER_TYPE_LABELS: Record<number, string> = {
  [CustomerType.WalkIn]: "Walk-in",
  [CustomerType.Contractor]: "Contractor",
  [CustomerType.Company]: "Company",
  [CustomerType.Vip]: "VIP",
  [CustomerType.Supplier]: "Supplier",
  [CustomerType.Regular]: "Regular",
  [CustomerType.CreditAccount]: "Credit Account",
};

/** Types shown in customer create/edit form */
export const CUSTOMER_FORM_TYPES = [
  CustomerType.WalkIn,
  CustomerType.Regular,
  CustomerType.Contractor,
  CustomerType.Company,
  CustomerType.CreditAccount,
  CustomerType.Vip,
] as const;

export const CustomerAccountStatus = {
  Active: 0,
  Overdue: 1,
  Blacklisted: 2,
  Inactive: 3,
  Blocked: 4,
} as const;

export const CUSTOMER_STATUS: Record<
  number,
  { label: string; className: string }
> = {
  [CustomerAccountStatus.Active]: {
    label: "Active",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  },
  [CustomerAccountStatus.Overdue]: {
    label: "Overdue",
    className: "border-red-200 bg-red-100 text-red-700",
  },
  [CustomerAccountStatus.Blacklisted]: {
    label: "Blacklisted",
    className: "border-red-200 bg-red-100 text-red-800",
  },
  [CustomerAccountStatus.Inactive]: {
    label: "Inactive",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  },
  [CustomerAccountStatus.Blocked]: {
    label: "Blocked",
    className: "border-orange-200 bg-orange-100 text-orange-800",
  },
};

export interface BouncedChequeHistory {
  id: string;
  saleChequeId: string;
  chequeNumber: string;
  bankName: string;
  branch?: string;
  customerName: string;
  customerId?: string;
  invoiceNumber: string;
  amount: number;
  maturityDate: string;
  bouncedDate: string;
  reason: string;
  penaltyAmount: number;
  processedByName: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  customerType: number;
  enableCredit?: boolean;
  creditLimit: number;
  paymentTerms?: number;
  paymentTermsLabel?: string;
  dueDays?: number;
  customPaymentTerms?: string;
  allowCheque?: boolean;
  outstandingBalance: number;
  isActive: boolean;
  isBlocked?: boolean;
  isBlacklisted: boolean;
  status: number;
  isOverCreditLimit: boolean;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
  totalPurchases: number;
  overdueCount: number;
  hasBouncedCheque: boolean;
  bouncedChequeCount: number;
  lastBouncedDate?: string;
  createdAt: string;
}

export interface CustomerProfile {
  customer: Customer;
  totalOutstanding: number;
  overdueAmount: number;
  openReceivableCount: number;
  receivables: Receivable[];
  recentPayments: ReceivablePayment[];
  recentSales: CustomerSaleSummary[];
  cheques: CustomerChequeSummary[];
  bouncedCheques: BouncedChequeHistory[];
}

export interface CustomerSaleSummary {
  id: string;
  saleNumber: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: number;
  status: number;
  cashierName: string;
}

export interface CustomerChequeSummary {
  saleNumber: string;
  bankName: string;
  chequeNumber: string;
  maturityDate: string;
  status: number;
  saleTotal: number;
}

export interface CustomerLedgerDetail {
  customerId?: string;
  customerName: string;
  currentBalance: number;
  totalPurchases: number;
  totalPayments: number;
  overdueAmount: number;
  entries: CustomerLedgerEntry[];
}

export interface Receivable {
  id: string;
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  notes?: string;
  createdAt: string;
  payments: ReceivablePayment[];
}

export interface ReceivablePayment {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentDate: string;
  paymentMethod?: number;
  reference?: string;
  notes?: string;
  isCredit: boolean;
  recordedByName: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface StatementOfAccount {
  customerId?: string;
  customerName: string;
  phone?: string;
  address?: string;
  statementDate: string;
  totalOutstanding: number;
  overdueAmount: number;
  openInvoices: {
    invoiceNumber: string;
    saleDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    daysOverdue: number;
    status: number;
  }[];
  recentPayments: ReceivablePayment[];
}

export const RECEIVABLE_STATUS: Record<
  number,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  0: {
    label: "Unpaid",
    variant: "secondary",
    className: "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100",
  },
  1: {
    label: "Partial",
    variant: "outline",
    className: "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  2: {
    label: "Paid",
    variant: "default",
    className: "border-green-200 bg-green-100 text-green-700 hover:bg-green-100",
  },
  3: {
    label: "Overdue",
    variant: "destructive",
    className: "border-red-200 bg-red-100 text-red-700 hover:bg-red-100",
  },
};

export const InventoryType = {
  Purchase: 0,
  Sale: 1,
  Adjustment: 2,
  Return: 3,
  Damage: 4,
} as const;

export const LOW_STOCK_THRESHOLD = 15;

export enum SupplierStatus {
  Active = 0,
  Preferred = 1,
  Inactive = 2,
  Blacklisted = 3,
  Archived = 4,
  Suspended = 5,
}

export enum SupplierPaymentTerms {
  Cod = 0,
  Net15 = 1,
  Net30 = 2,
  Net60 = 3,
  ChequeBasis = 4,
  Custom = 5,
  Net7 = 6,
}

export enum SupplierContactRole {
  General = 0,
  SalesRepresentative = 1,
  Accounting = 2,
  Warehouse = 3,
}

export interface SupplierContact {
  id?: string;
  name: string;
  role: SupplierContactRole;
  roleLabel?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface SupplierAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  description?: string;
  uploadedByName: string;
  createdAt: string;
}

export interface SupplierListItem {
  id: string;
  supplierCode?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: SupplierStatus;
  statusLabel: string;
  paymentTerms: SupplierPaymentTerms;
  paymentTermsLabel: string;
  isActive: boolean;
  suppliedProductCount: number;
  lastReceivingDate?: string;
  approvedReceivingCount?: number | null;
  lifetimePurchaseValue?: number | null;
  createdAt: string;
}

export interface SupplierDetail extends SupplierListItem {
  address?: string;
  customPaymentTerms?: string;
  notes?: string;
  deliveryNotes?: string;
  supplierRemarks?: string;
  createdByUserId: string;
  createdByName: string;
  totalReceivingsCount: number;
  approvedReceivingsCount: number;
  rejectedReceivingsCount: number;
  partialDeliveriesCount: number;
  contacts: SupplierContact[];
  attachments: SupplierAttachment[];
  recentReceivings: SupplierReceivingSummary[];
  suppliedProducts: SupplierSuppliedProduct[];
  performance: SupplierPerformance;
}

export interface SupplierReceivingSummary {
  id: string;
  receivingNumber: string;
  deliveryDate: string;
  status: number;
  statusLabel: string;
  totalQuantity: number;
  totalCost?: number | null;
  createdAt: string;
}

export interface SupplierSuppliedProduct {
  productId: string;
  productName: string;
  productSku: string;
  unitOfMeasure: string;
  latestCost: number;
  previousCost?: number | null;
  lastDeliveryDate?: string;
  totalQuantityReceived: number;
}

export interface SupplierCostHistoryEntry {
  productId: string;
  productName: string;
  productSku: string;
  oldCost: number;
  newCost: number;
  recordedAt: string;
  receivingReference: string;
}

export interface SupplierPerformance {
  totalReceivings: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  partialDeliveryCount: number;
  approvalRatePercent: number;
  rejectionRatePercent: number;
  reliabilityLabel: string;
}

export interface SupplierSummary {
  totalSuppliers: number;
  activeCount: number;
  preferredCount: number;
  inactiveCount: number;
  topSuppliersBySpend: SupplierSpendRank[];
  mostPurchasedSuppliers: SupplierSpendRank[];
}

export interface SupplierSpendRank {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  receivingCount: number;
}

export const SUPPLIER_STATUS: Record<number, { label: string; className: string }> = {
  [SupplierStatus.Active]: {
    label: "Active",
    className: "border-green-200 bg-green-100 text-green-700",
  },
  [SupplierStatus.Preferred]: {
    label: "Preferred",
    className: "border-slate-200 bg-slate-100 text-primary",
  },
  [SupplierStatus.Inactive]: {
    label: "Inactive",
    className: "border-gray-200 bg-gray-100 text-gray-600",
  },
  [SupplierStatus.Blacklisted]: {
    label: "Blacklisted",
    className: "border-red-200 bg-red-100 text-red-700",
  },
  [SupplierStatus.Suspended]: {
    label: "Suspended",
    className: "border-orange-200 bg-orange-100 text-orange-800",
  },
  [SupplierStatus.Archived]: {
    label: "Archived",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export const SUPPLIER_PAYMENT_TERMS: Record<number, string> = {
  [SupplierPaymentTerms.Cod]: "COD",
  [SupplierPaymentTerms.Net7]: "7 days",
  [SupplierPaymentTerms.Net15]: "15 days",
  [SupplierPaymentTerms.Net30]: "30 days",
  [SupplierPaymentTerms.Net60]: "60 days",
  [SupplierPaymentTerms.ChequeBasis]: "Cheque basis",
  [SupplierPaymentTerms.Custom]: "Custom terms",
};

/** @deprecated Use SupplierListItem — kept for product/receiving dropdowns */
export type Supplier = Pick<SupplierListItem, "id" | "name" | "isActive"> & {
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export enum StockReceivingStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
}

export interface StockReceivingItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitOfMeasure: string;
  quantity: number;
  expectedQuantity?: number | null;
  remainingQuantity?: number | null;
  currentStockQuantity?: number;
  projectedStockAfterApproval?: number;
  costPrice: number;
  sellingPrice: number;
  lineTotal: number;
  remarks?: string;
}

export interface StockReceivingAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  description?: string;
  uploadedByName: string;
  createdAt: string;
}

export interface StockReceiving {
  id: string;
  receivingNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  containerNumber: string;
  stockNumber: string;
  referenceNumber: string;
  deliveryReceiptNumber?: string;
  deliveryDate: string;
  status: StockReceivingStatus;
  statusLabel: string;
  notes?: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  totalQuantity: number;
  totalExpectedQuantity?: number | null;
  remainingQuantity: number;
  totalCost: number;
  items: StockReceivingItem[];
  attachments: StockReceivingAttachment[];
  batchesCreatedCount?: number;
  createdBatches?: ReceivingBatchSummary[];
}

export interface StockReceivingSummary {
  pendingCount: number;
  approvedTodayCount: number;
  rejectedCount: number;
  totalIncomingUnits: number;
  totalReceivingCost?: number | null;
}

export interface DuplicateReferenceCheck {
  referenceNumberExists: boolean;
  deliveryReceiptNumberExists: boolean;
  existingReceivingNumber?: string;
}

export const RECEIVING_STATUS: Record<
  number,
  { label: string; className: string }
> = {
  [StockReceivingStatus.Pending]: {
    label: "Pending Owner Approval",
    className: "border-amber-200 bg-amber-100 text-amber-800",
  },
  [StockReceivingStatus.Approved]: {
    label: "Approved",
    className: "border-green-200 bg-green-100 text-green-700",
  },
  [StockReceivingStatus.Rejected]: {
    label: "Rejected",
    className: "border-red-200 bg-red-100 text-red-700",
  },
};

export interface AlertsSummary {
  pendingReceivingsCount: number;
  pendingAdjustmentsCount: number;
  overdueReceivablesCount: number;
  totalReceivablesOutstanding: number;
  pendingChequesCount: number;
  pendingChequesAmount: number;
  lowStockCount: number;
  lowStockProducts: Product[];
}

export interface CustomerLedgerEntry {
  date: string;
  type: string;
  invoiceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMethod?: string;
  processedBy?: string;
}

export interface ReceivablesSummary {
  totalOutstanding: number;
  collectedToday: number;
  overdueAmount: number;
  activeCustomersWithBalance: number;
  unpaidCount: number;
  partialCount: number;
  overdueCount: number;
  overdueReceivables: Receivable[];
}

export const SALE_STATUS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  0: { label: "Completed", variant: "default" },
  1: { label: "Voided", variant: "destructive" },
  2: { label: "Refunded", variant: "secondary" },
};

export enum ExpenseVoucherStatus {
  Unpaid = 0,
  Paid = 1,
  Cancelled = 2,
}

export enum ExpensePaymentMethod {
  Cash = 0,
  Check = 1,
  BankTransfer = 2,
  OnlineBank = 3,
  Other = 4,
}

export const EXPENSE_STATUS: Record<number, { label: string; className: string }> = {
  [ExpenseVoucherStatus.Unpaid]: { label: "Unpaid", className: "border-amber-200 bg-amber-50 text-amber-800" },
  [ExpenseVoucherStatus.Paid]: { label: "Paid", className: "border-green-200 bg-green-50 text-green-800" },
  [ExpenseVoucherStatus.Cancelled]: { label: "Cancelled", className: "border-red-200 bg-red-50 text-red-800" },
};

export const EXPENSE_PAYMENT_METHODS: Record<number, string> = {
  [ExpensePaymentMethod.Cash]: "Cash",
  [ExpensePaymentMethod.Check]: "Check",
  [ExpensePaymentMethod.BankTransfer]: "Bank Transfer",
  [ExpensePaymentMethod.OnlineBank]: "Online Bank",
  [ExpensePaymentMethod.Other]: "Other",
};

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  voucherCount: number;
  createdAt: string;
}

export interface ExpenseVoucherListItem {
  id: string;
  expenseDate: string;
  voucherNumber: string;
  categoryId: string;
  categoryName: string;
  payee: string;
  amount: number;
  status: number;
  statusLabel: string;
  paymentMethod: number;
  paymentMethodLabel: string;
  createdAt: string;
}

export interface ExpenseVoucher extends ExpenseVoucherListItem {
  particulars: string;
  bank?: string;
  referenceNumber?: string;
  remarks?: string;
  createdByUserId: string;
  createdByName?: string;
  paidByUserId?: string;
  paidByName?: string;
  paidAt?: string;
  cancelledAt?: string;
  attachments: ExpenseVoucherAttachment[];
}

export interface ExpenseVoucherAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  description?: string;
  uploadedByName?: string;
  createdAt: string;
  fileAvailable: boolean;
  filePurgedAt?: string;
}

export enum ApprovalRequestType {
  ReturnExchange = 0,
  SaleVoid = 1,
  SaleCorrection = 2,
}

export enum ApprovalRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3,
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  typeLabel: string;
  status: ApprovalRequestStatus;
  statusLabel: string;
  title: string;
  reason: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  approvedViaImmediateOverride: boolean;
  requestedIpAddress?: string;
  requestedDeviceName?: string;
  approvedIpAddress?: string;
  approvedDeviceName?: string;
  resultEntityType?: string;
  resultEntityId?: string;
  payloadJson?: string;
}

export interface ExpenseSummary {
  totalCount: number;
  unpaidCount: number;
  paidCount: number;
  cancelledCount: number;
  totalAmount: number;
  unpaidAmount: number;
  paidAmount: number;
}

export interface ExpenseReport {
  from: string;
  to: string;
  grandTotal: number;
  dailyTotals: { periodLabel: string; count: number; totalAmount: number }[];
  monthlyTotals: { periodLabel: string; count: number; totalAmount: number }[];
  byCategory: { categoryId: string; categoryName: string; count: number; totalAmount: number }[];
  byStatus: { status: number; statusLabel: string; count: number; totalAmount: number }[];
}

