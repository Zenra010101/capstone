"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  PhilippinePeso,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { formatCurrency, formatDate } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { cn } from "@/lib/utils";
import { defaultReportRange, reportQueryParams, toStoreDateInputValue } from "@/lib/report-dates";
import { salesHistoryDefaultRangeDays, salesHistoryMinDate } from "@/lib/sales-retention";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { ReceiptTaxBreakdown } from "@/components/pos/receipt-tax-breakdown";
import type { SaleListItem } from "@/lib/report-types";
import type { Product, Sale, StoreSettings, UserManagement } from "@/lib/types";
import { SaleReceiptDialog } from "@/components/pos/sale-receipt-dialog";
import { PAYMENT_LABELS, PaymentMethod, SALE_STATUS } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/enterprise/kpi-grid";
import { FilterBar, FilterField } from "@/components/enterprise/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import {
  TablePagination,
  type TablePageSize,
} from "@/components/enterprise/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAYMENT_FILTER_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: String(PaymentMethod.Cash), label: PAYMENT_LABELS[PaymentMethod.Cash] },
  { value: String(PaymentMethod.QRPH), label: PAYMENT_LABELS[PaymentMethod.QRPH] },
  { value: String(PaymentMethod.OnlineBank), label: PAYMENT_LABELS[PaymentMethod.OnlineBank] },
  { value: String(PaymentMethod.Charged), label: PAYMENT_LABELS[PaymentMethod.Charged] },
  { value: String(PaymentMethod.Cheque), label: PAYMENT_LABELS[PaymentMethod.Cheque] },
  { value: String(PaymentMethod.Split), label: PAYMENT_LABELS[PaymentMethod.Split] },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "0", label: "Completed" },
  { value: "1", label: "Voided" },
  { value: "2", label: "Refunded" },
];

type SalesHistoryPage = {
  items: SaleListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalAmount: number;
  completedCount: number;
  voidedCount: number;
};

type CorrectionLine = {
  saleItemId: string;
  originalProductName: string;
  productId: string;
  quantity: number;
  correctedUnitPrice: number;
};

type CreateApprovalRequestResult = {
  request?: { requestId?: string };
};

type OwnerOption = {
  id: string;
  fullName: string;
  email: string;
};

function correctionPaymentRule(paymentMethod: number): string {
  switch (paymentMethod) {
    case PaymentMethod.QRPH:
      return "QRPH correction requires the corrected total to exactly match the original QR payment.";
    case PaymentMethod.OnlineBank:
      return "Online bank correction requires the corrected total to exactly match the original bank transfer.";
    case PaymentMethod.Charged:
      return "Charge correction requires a customer and due date.";
    case PaymentMethod.Cheque:
      return "Cheque correction keeps amount paid at 0 and requires complete cheque details.";
    default:
      return "Cash correction cannot exceed original paid amount.";
  }
}

export default function SalesPage() {
  const searchParams = useSearchParams();
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    completedCount: 0,
    voidedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [voidTarget, setVoidTarget] = useState<SaleListItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidOwnerMode, setVoidOwnerMode] = useState(false);
  const [voidOwnerUsername, setVoidOwnerUsername] = useState("");
  const [voidOwnerPassword, setVoidOwnerPassword] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [correctionTarget, setCorrectionTarget] = useState<Sale | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [incorrectItem, setIncorrectItem] = useState("");
  const [correctItem, setCorrectItem] = useState("");
  const [correctionLines, setCorrectionLines] = useState<CorrectionLine[]>([]);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [range, setRange] = useState(defaultReportRange(salesHistoryDefaultRangeDays(isOwner)));
  const minHistoryDate = salesHistoryMinDate(isOwner);
  const [invoiceSearch, setInvoiceSearch] = useState(
    () => searchParams.get("search") ?? searchParams.get("invoice") ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(invoiceSearch);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [cashiers, setCashiers] = useState<UserManagement[]>([]);
  const [todayMarker, setTodayMarker] = useState(() => toStoreDateInputValue());

  useDebouncedEffect(() => {
    setDebouncedSearch(invoiceSearch);
  }, [invoiceSearch], 400);

  useEffect(() => {
    const q = searchParams.get("search") ?? searchParams.get("invoice") ?? "";
    setInvoiceSearch(q);
    setDebouncedSearch(q);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setRange(defaultReportRange(salesHistoryDefaultRangeDays(isOwner)));
    setPage(1);
  }, [isOwner]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = toStoreDateInputValue();
      setTodayMarker((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    // If the app stayed open across midnight, refresh the default date window.
    if (range.to < todayMarker) {
      setRange(defaultReportRange(salesHistoryDefaultRangeDays(isOwner)));
      setPage(1);
    }
  }, [todayMarker, range.to, isOwner]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    paymentFilter,
    statusFilter,
    cashierFilter,
    range.from,
    range.to,
    includeArchived,
    pageSize,
  ]);

  const load = useCallback(
    async (pageNum = page) => {
      setLoading(true);
      try {
        const params = new URLSearchParams(reportQueryParams(range.from, range.to));
        params.set("history", "true");
        params.set("page", String(pageNum));
        params.set("pageSize", String(pageSize));
        params.set("includeArchived", String(includeArchived));
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (paymentFilter !== "all") params.set("paymentMethod", paymentFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (isOwner && cashierFilter !== "all") params.set("cashierId", cashierFilter);

        const res = await api.get<SalesHistoryPage>(`/api/sales?${params}`);
        setSales(res.items);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
        setPage(res.page);
        setSummary({
          totalAmount: res.totalAmount,
          completedCount: res.completedCount,
          voidedCount: res.voidedCount,
        });
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Could not load sales");
        setSales([]);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      pageSize,
      includeArchived,
      range.from,
      range.to,
      debouncedSearch,
      paymentFilter,
      statusFilter,
      cashierFilter,
      isOwner,
    ]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    cachedGet(ReferenceKeys.settings, REFERENCE_TTL_MS, () =>
      api.get<StoreSettings>("/api/settings")
    ).then(setStoreSettings).catch(() => {});
    api
      .get<ListResponse<Product>>("/api/products?activeOnly=true&page=0")
      .then((data) => setProducts(asList(data)))
      .catch(() => {});
    api
      .get<OwnerOption[]>("/api/approvals/owners")
      .then((data) => setOwnerOptions(data ?? []))
      .catch(() => {});
    if (isOwner) {
      api
        .get<UserManagement[]>("/api/users")
        .then((r) => setCashiers(r.filter((u) => u.isActive)))
        .catch(() => {});
    }
  }, [isOwner]);

  const openDetail = async (id: string) => {
    try {
      const sale = await api.get<Sale>(`/api/sales/${id}`);
      setDetail(sale);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load sale details");
    }
  };

  const printSale = async (id: string) => {
    try {
      const sale = await api.get<Sale>(`/api/sales/${id}`);
      setDetail(sale);
      setPrintOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load sale for printing");
    }
  };

  const closeVoidDialog = () => {
    setVoidTarget(null);
    setVoidReason("");
    setVoidOwnerMode(false);
    setVoidOwnerUsername("");
    setVoidOwnerPassword("");
  };

  const voidSale = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setVoidSubmitting(true);
    try {
      if (isOwner) {
        await api.post(`/api/sales/${voidTarget.id}/void`, { reason: voidReason.trim() });
        toast.success("Sale voided — stock restored");
      } else if (voidOwnerMode) {
        if (!voidOwnerUsername.trim() || !voidOwnerPassword) {
          toast.error("Owner email and password are required");
          return;
        }
        const result = await api.post<CreateApprovalRequestResult>("/api/approvals/sale-void", {
          saleId: voidTarget.id,
          reason: voidReason.trim(),
          deviceName: navigator.userAgent,
        });
        const requestId = result?.request?.requestId;
        if (!requestId) throw new ApiError("Could not create void request", 0);
        await api.post(`/api/approvals/${requestId}/approve-override`, {
          ownerUsername: voidOwnerUsername.trim(),
          ownerPassword: voidOwnerPassword,
          notes: "Owner present — immediate void override",
          deviceName: navigator.userAgent,
        });
        toast.success("Sale voided by owner override — stock restored");
      } else {
        await api.post("/api/approvals/sale-void", {
          saleId: voidTarget.id,
          reason: voidReason.trim(),
          deviceName: navigator.userAgent,
        });
        toast.success("Void request submitted for owner approval");
      }
      closeVoidDialog();
      setDetail(null);
      void load(page);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Void failed");
    } finally {
      setVoidSubmitting(false);
    }
  };

  const openCorrection = (sale: Sale) => {
    setCorrectionTarget(sale);
    setCorrectionReason("");
    setIncorrectItem("");
    setCorrectItem("");
    setCorrectionLines(
      sale.items.map((i) => ({
        saleItemId: i.id,
        originalProductName: i.productName,
        productId: i.productId,
        quantity: i.quantity,
        correctedUnitPrice: i.sellingPriceAtSale ?? i.unitPrice,
      }))
    );
  };

  const submitCorrectionRequest = async () => {
    if (!correctionTarget) return;
    if (!correctionReason.trim()) {
      toast.error("Correction reason is required");
      return;
    }

    const items: Array<{ productId: string; quantity: number; discount: number }> = [];
    let subTotal = 0;
    for (const line of correctionLines) {
      if (line.quantity <= 0) continue;
      const original = correctionTarget.items.find((x) => x.id === line.saleItemId);
      if (!original) {
        toast.error(`Original sale line not found: ${line.originalProductName}`);
        return;
      }
      const product = products.find((p) => p.id === line.productId);
      if (!product) {
        toast.error(`Product not found for line: ${line.originalProductName}`);
        return;
      }
      if (line.correctedUnitPrice <= 0) {
        toast.error("Corrected unit price must be greater than zero");
        return;
      }
      if (!Number.isInteger(line.quantity)) {
        toast.error(`Quantity must be a whole number for ${line.originalProductName}`);
        return;
      }
      if (line.quantity > original.quantity) {
        toast.error(`Quantity cannot exceed original sold quantity for ${line.originalProductName}`);
        return;
      }
      const basePrice = product.unitPrice;
      const originalUnitPrice = original.sellingPriceAtSale ?? original.unitPrice;
      const maxAllowedPrice = Math.min(basePrice, originalUnitPrice);
      if (line.correctedUnitPrice > maxAllowedPrice) {
        toast.error(
          `Corrected price for ${product.name} cannot exceed ${formatCurrency(maxAllowedPrice)}`
        );
        return;
      }
      const discount = Number(((basePrice - line.correctedUnitPrice) * line.quantity).toFixed(2));
      items.push({
        productId: line.productId,
        quantity: line.quantity,
        discount,
      });
      subTotal += line.correctedUnitPrice * line.quantity;
    }

    if (!items.length) {
      toast.error("At least one corrected line is required");
      return;
    }

    const discountPercent = 0;
    const taxableBase = Math.max(subTotal, 0);
    let taxAmount = 0;
    let withholdingAmount = 0;
    const taxMode = correctionTarget.taxMode ?? 0;
    if (taxMode === 1) taxAmount = Number((taxableBase * 0.12).toFixed(2));
    if (taxMode === 2) withholdingAmount = Number((taxableBase * 0.01).toFixed(2));
    if (taxMode === 3) {
      const value = correctionTarget.manualTaxValue ?? 0;
      const manual = correctionTarget.manualTaxIsPercent
        ? Number((taxableBase * (value / 100)).toFixed(2))
        : Number(value.toFixed(2));
      if (correctionTarget.manualTaxIsDeduction) withholdingAmount = manual;
      else taxAmount = manual;
    }
    const computedTotal = Number((taxableBase + taxAmount - withholdingAmount).toFixed(2));

    const paymentMethod = correctionTarget.paymentMethod;
    const originalPaid = Number((correctionTarget.amountPaid ?? 0).toFixed(2));
    let amountPaid = computedTotal;
    if (paymentMethod === PaymentMethod.Cash) {
      if (originalPaid < computedTotal) {
        toast.error("Correction total exceeds paid cash amount. Use a manual owner sale replacement.");
        return;
      }
      amountPaid = originalPaid;
    } else if (paymentMethod === PaymentMethod.QRPH) {
      if (!correctionTarget.payment?.qrphReference?.trim()) {
        toast.error("QRPH correction needs the original QRPH reference.");
        return;
      }
      if (Number(computedTotal.toFixed(2)) !== originalPaid) {
        toast.error("QRPH correction requires exact same total as original payment.");
        return;
      }
      amountPaid = computedTotal;
    } else if (paymentMethod === PaymentMethod.OnlineBank) {
      const bank = correctionTarget.payment;
      if (
        !bank?.bankName?.trim() ||
        !bank.bankBranch?.trim() ||
        !bank.bankReferenceNumber?.trim() ||
        !bank.senderName?.trim()
      ) {
        toast.error("Online bank correction needs complete original bank payment details.");
        return;
      }
      if (Number(computedTotal.toFixed(2)) !== originalPaid) {
        toast.error("Online bank correction requires exact same total as original payment.");
        return;
      }
      amountPaid = computedTotal;
    } else if (paymentMethod === PaymentMethod.Charged) {
      if (!correctionTarget.customerName?.trim() || !correctionTarget.dueDate) {
        toast.error("Charge correction requires customer and due date details.");
        return;
      }
      amountPaid = Math.min(originalPaid, computedTotal);
    } else if (paymentMethod === PaymentMethod.Cheque) {
      if (!correctionTarget.cheque) {
        toast.error("Cheque correction needs original cheque details.");
        return;
      }
      amountPaid = 0;
    }

    const salePayload: Record<string, unknown> = {
      items,
      discountPercent,
      taxMode,
      manualTaxName: correctionTarget.manualTaxName,
      manualTaxIsPercent: correctionTarget.manualTaxIsPercent ?? false,
      manualTaxValue: correctionTarget.manualTaxValue ?? 0,
      manualTaxIsDeduction: correctionTarget.manualTaxIsDeduction ?? false,
      amountPaid,
      paymentMethod,
      customerName: correctionTarget.customerName,
      dueDate: correctionTarget.dueDate,
      notes: `Approved correction for ${correctionTarget.saleNumber}`,
    };

    if (paymentMethod === 1 && correctionTarget.payment?.qrphReference) {
      salePayload.qrphReference = correctionTarget.payment.qrphReference;
    }
    if (paymentMethod === 2 && correctionTarget.payment) {
      salePayload.onlineBank = {
        bankName: correctionTarget.payment.bankName,
        branch: correctionTarget.payment.bankBranch,
        referenceNumber: correctionTarget.payment.bankReferenceNumber,
        senderName: correctionTarget.payment.senderName,
        datePaid: correctionTarget.payment.datePaid,
      };
    }
    if (paymentMethod === 4 && correctionTarget.cheque) {
      salePayload.cheque = {
        type: correctionTarget.cheque.type,
        bankName: correctionTarget.cheque.bankName,
        branch: correctionTarget.cheque.branch,
        chequeNumber: correctionTarget.cheque.chequeNumber,
        accountName: correctionTarget.cheque.accountName,
        maturityDate: correctionTarget.cheque.maturityDate,
      };
    }

    setCorrectionSubmitting(true);
    try {
      await api.post("/api/approvals/sale-correction", {
        saleId: correctionTarget.id,
        sale: salePayload,
        reason: correctionReason.trim(),
        incorrectItem: incorrectItem.trim() || undefined,
        correctItem: correctItem.trim() || undefined,
        deviceName: navigator.userAgent,
      });
      toast.success(isOwner ? "Correction request submitted" : "Correction request submitted for owner approval");
      setCorrectionTarget(null);
      setCorrectionReason("");
      setIncorrectItem("");
      setCorrectItem("");
      setCorrectionLines([]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to submit correction request");
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const resetFilters = () => {
    const r = defaultReportRange(salesHistoryDefaultRangeDays(isOwner));
    setRange(r);
    setInvoiceSearch("");
    setDebouncedSearch("");
    setPaymentFilter("all");
    setStatusFilter("all");
    setCashierFilter("all");
    setIncludeArchived(false);
    setPage(1);
  };

  const setTodayRange = () => {
    const r = defaultReportRange(salesHistoryDefaultRangeDays(isOwner));
    setRange(r);
    setPage(1);
  };

  const colSpan = isOwner ? 9 : 7;

  return (
    <>
      <PageHeader
        title="Sales"
        description={
          isOwner
            ? "All transactions including voided. Records older than 5 years are not available."
            : "Your sales from the last 7 days only (including voided transactions)."
        }
      />

      <KpiGrid className="mb-4">
        <StatCard
          title="Matching invoices"
          value={loading ? "—" : String(totalCount)}
          icon={Receipt}
        />
        <StatCard
          title="Total amount"
          value={loading ? "—" : formatCurrency(summary.totalAmount)}
          icon={PhilippinePeso}
        />
        <StatCard
          title="Completed"
          value={loading ? "—" : String(summary.completedCount)}
          icon={Receipt}
        />
        <StatCard
          title="Voided"
          value={loading ? "—" : String(summary.voidedCount)}
          icon={RotateCcw}
        />
      </KpiGrid>

      <Card className="mb-3 border-border/50 bg-muted/20 shadow-none">
        <FilterBar
          compact
          footer={
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
                Reset
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={setTodayRange}>
                Today
              </Button>
              {isOwner && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  Archived
                </label>
              )}
            </>
          }
        >
            <FilterField compact className="w-[9.5rem] shrink-0">
              <Label className="text-[11px] font-medium text-muted-foreground">From</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={range.from}
                min={minHistoryDate}
                max={range.to}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </FilterField>
            <FilterField compact className="w-[9.5rem] shrink-0">
              <Label className="text-[11px] font-medium text-muted-foreground">To</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={range.to}
                min={range.from || minHistoryDate}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </FilterField>
            <FilterField compact className="min-w-[12rem] flex-1 basis-[14rem]">
              <Label className="text-[11px] font-medium text-muted-foreground">Invoice / search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-sm"
                  placeholder="S20260601-0001"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </div>
            </FilterField>
            <FilterField compact className="w-[8.5rem] shrink-0">
              <Label className="text-[11px] font-medium text-muted-foreground">Payment</Label>
              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v ?? "all")}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField compact className="w-[8.5rem] shrink-0">
              <Label className="text-[11px] font-medium text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            {isOwner && (
              <FilterField compact className="w-[9.5rem] shrink-0">
                <Label className="text-[11px] font-medium text-muted-foreground">Cashier</Label>
                <Select value={cashierFilter} onValueChange={(v) => setCashierFilter(v ?? "all")}>
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cashiers</SelectItem>
                    {cashiers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            )}
        </FilterBar>
      </Card>

      <TableShell
        footer={
          totalCount > 0 ? (
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              itemLabel="sales"
              onPageChange={(p) => void load(p)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          ) : undefined
        }
      >
        <ResponsiveDataView
          mobile={
            loading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading sales…</p>
            ) : sales.length === 0 ? (
              <EmptyState
                compact
                title="No sales match filters"
                description="Try a wider date range or clear filters."
              />
            ) : (
              sales.map((s) => {
                const st = SALE_STATUS[s.status];
                return (
                  <RecordMobileCard
                    key={s.id}
                    title={s.saleNumber}
                    subtitle={`${formatDate(s.createdAt)} · ${PAYMENT_LABELS[s.paymentMethod] ?? "—"}`}
                    amount={formatCurrency(s.totalAmount)}
                    badge={
                      <Badge variant={st?.variant ?? "secondary"} className="text-[10px]">
                        {st?.label ?? "—"}
                      </Badge>
                    }
                    onOpen={() => void openDetail(s.id)}
                    meta={
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void printSale(s.id)}
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Print
                        </Button>
                        {s.status === 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              setVoidTarget(s);
                              setVoidReason("");
                            }}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            {isOwner ? "Void" : "Request void"}
                          </Button>
                        )}
                      </div>
                    }
                  />
                );
              })
            )
          }
        >
          <Table enterprise>
            <TableHeader>
              <TableRow>
                <TableHead sticky>Invoice</TableHead>
                <TableHead>Date</TableHead>
                {isOwner && <TableHead hideBelow="lg">Cashier</TableHead>}
                <TableHead>Payment</TableHead>
                <TableHead hideBelow="md">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {isOwner && (
                  <TableHead hideBelow="xl" className="text-right">
                    Profit
                  </TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableEmptyRow colSpan={colSpan} title="Loading sales…" />
              )}
              {!loading &&
                sales.map((s) => {
                  const st = SALE_STATUS[s.status];
                  return (
                    <TableRow key={s.id} onRowClick={() => void openDetail(s.id)}>
                      <TableCell sticky className="font-mono text-xs">
                        {s.saleNumber}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(s.createdAt)}
                      </TableCell>
                      {isOwner && (
                        <TableCell hideBelow="lg">{s.cashierName}</TableCell>
                      )}
                      <TableCell>{PAYMENT_LABELS[s.paymentMethod] ?? "—"}</TableCell>
                      <TableCell hideBelow="md" className="max-w-[8rem] truncate text-xs">
                        {s.taxTypeLabel ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.totalAmount)}
                      </TableCell>
                      {isOwner && (
                        <TableCell hideBelow="xl" className="text-right text-amount-positive">
                          {formatCurrency(s.grossProfit ?? 0)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={st?.variant ?? "secondary"}>{st?.label ?? "—"}</Badge>
                      </TableCell>
                      <TableRowActions>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Print receipt"
                          aria-label={`Print receipt ${s.saleNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void printSale(s.id);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {s.status === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Void sale"
                            aria-label={`Void sale ${s.saleNumber}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoidTarget(s);
                              setVoidReason("");
                            }}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableRowActions>
                    </TableRow>
                  );
                })}
              {!loading && !sales.length && (
                <TableEmptyRow
                  colSpan={colSpan}
                  title="No sales match filters"
                  description="Try a wider date range or clear filters."
                />
              )}
            </TableBody>
          </Table>
        </ResponsiveDataView>
      </TableShell>

      <Dialog open={!!detail} dismissible onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent size="xl" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
            <DialogTitle className="font-mono">{detail?.saleNumber}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="erp-dialog-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4 text-sm sm:px-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={SALE_STATUS[detail.status]?.variant}>
                  {SALE_STATUS[detail.status]?.label}
                </Badge>
                <span className="text-muted-foreground">{formatDate(detail.createdAt)}</span>
              </div>
              <p>
                Cashier: <strong>{detail.cashierName}</strong> ·{" "}
                {PAYMENT_LABELS[detail.paymentMethod]}
              </p>
              {detail.paymentMethod === PaymentMethod.OnlineBank && detail.payment && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 font-medium">Online bank payment</p>
                  <p>Bank: {detail.payment.bankName ?? "—"}</p>
                  <p>Branch / address: {detail.payment.bankBranch ?? "—"}</p>
                  <p>Reference: {detail.payment.bankReferenceNumber ?? "—"}</p>
                  <p>Sender: {detail.payment.senderName ?? "—"}</p>
                </div>
              )}
              {detail.paymentMethod === PaymentMethod.Cheque && detail.cheque && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 font-medium">Cheque / PDC</p>
                  <p>Bank: {detail.cheque.bankName}</p>
                  <p>Branch / address: {detail.cheque.branch ?? "—"}</p>
                  <p>Cheque #: {detail.cheque.chequeNumber}</p>
                  <p>Account: {detail.cheque.accountName}</p>
                  <p>Maturity: {formatDate(detail.cheque.maturityDate)}</p>
                </div>
              )}
              {detail.paymentMethod === PaymentMethod.Split &&
                (detail.payments?.length ?? 0) > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="mb-1 font-medium">Split payment breakdown</p>
                    <div className="space-y-1">
                      {detail.payments!.map((p, i) => {
                        const ref = p.bankReferenceNumber || p.qrphReference;
                        return (
                          <div key={i} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              {PAYMENT_LABELS[p.method] ?? "Payment"}
                              {p.bankName ? ` · ${p.bankName}` : ""}
                              {ref ? ` · ${ref}` : ""}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatCurrency(p.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex justify-between border-t pt-1">
                      <span className="font-medium">Paid now</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(detail.amountPaid)}
                      </span>
                    </div>
                    {(detail.receivableBalance ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium">Balance due</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(detail.receivableBalance ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              <div className="rounded-lg border bg-muted/30 p-3 [&_.border-black]:border-border">
                <ReceiptTaxBreakdown sale={detail} />
              </div>
              {detail.status === 1 && detail.voidReason && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                  Void reason: {detail.voidReason}
                  {detail.voidedByName && (
                    <span className="block text-xs">By {detail.voidedByName}</span>
                  )}
                </p>
              )}
              {detail.replacesSaleNumber && (
                <p className="text-muted-foreground">
                  Correction for voided invoice:{" "}
                  <span className="font-mono">{detail.replacesSaleNumber}</span>
                </p>
              )}
              {detail.replacedBySaleNumber && (
                <p>
                  Replaced by:{" "}
                  <span className="font-mono font-medium">{detail.replacedBySaleNumber}</span>
                </p>
              )}
              {detail.status === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => openCorrection(detail)}
                >
                  {isOwner ? "Request correction (owner)" : "Request correction"}
                </Button>
              )}
              {detail.status === 1 && !detail.replacedBySaleId && isOwner && (
                <Link href="/pos">
                  <Button size="sm" variant="outline" className="w-full">
                    Create correction sale at POS
                  </Button>
                </Link>
              )}
              {isOwner && (
                <p className="text-sm text-amount-positive">
                  Gross profit (merchandise):{" "}
                  <span className="font-semibold">
                    {formatCurrency(detail.grossProfit ?? 0)}
                  </span>
                </p>
              )}
              <div className="border-t pt-2">
                <p className="mb-2 font-medium">Line items</p>
                <ul className="space-y-1">
                  {detail.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2 text-sm">
                      <span>
                        {i.productName} x {i.quantity}
                        {i.productBatchId && (
                          <span className="block text-xs text-muted-foreground">
                            Batch {i.batchCode ?? i.productBatchId.slice(0, 8)}
                            {i.batchReceivedDate ? ` · received ${i.batchReceivedDate}` : ""}
                          </span>
                        )}
                        {isOwner && (
                          <span className="block text-xs text-muted-foreground">
                            Sell {formatCurrency(i.sellingPriceAtSale ?? i.unitPrice)} · Cost{" "}
                            {formatCurrency(i.costPriceAtSale ?? 0)}
                          </span>
                        )}
                        {i.returnedQuantity > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            ({i.returnedQuantity} returned)
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        {formatCurrency(i.lineTotal)}
                        {isOwner && i.profitAmount != null && (
                          <span className="block text-xs text-amount-positive">
                            +{formatCurrency(i.profitAmount)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter showCloseButton={false} className="shrink-0 border-t px-5 py-3 sm:px-6">
            {detail && (
              <Button variant="secondary" onClick={() => setPrintOpen(true)}>
                <Printer className="mr-2 h-4 w-4" />
                Print receipt
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaleReceiptDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        sale={detail}
        storeSettings={storeSettings}
      />

      <Dialog open={!!voidTarget} dismissible onOpenChange={(open) => !open && closeVoidDialog()}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Void sale {voidTarget?.saleNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Voiding restores inventory and marks the invoice as voided. The record is always kept for audit.
            </p>

            <div className="space-y-1.5">
              <Label>Reason for void <span className="text-destructive">*</span></Label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Wrong items rung up"
              />
            </div>

            {!isOwner && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  How do you want to void?
                </Label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setVoidOwnerMode(false)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      !voidOwnerMode
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Send className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">Send request to owner</span>
                      <span className="block text-xs text-muted-foreground">
                        Owner reviews and approves later in the Approval Center.
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoidOwnerMode(true)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      voidOwnerMode
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">Owner is here — void now</span>
                      <span className="block text-xs text-muted-foreground">
                        Owner authorizes immediately with their password.
                      </span>
                    </span>
                  </button>
                </div>

                {voidOwnerMode && (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                    <div className="space-y-1.5">
                      <Label>Owner</Label>
                      <Select
                        value={voidOwnerUsername}
                        onValueChange={(v) => setVoidOwnerUsername(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {ownerOptions.map((o) => (
                            <SelectItem key={o.id} value={o.email}>
                              <span className="flex flex-col">
                                <span className="font-medium">{o.fullName}</span>
                                <span className="text-xs text-muted-foreground">{o.email}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {ownerOptions.length === 0 && (
                        <p className="text-xs text-destructive">No owner accounts available.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Owner password</Label>
                      <Input
                        type="password"
                        value={voidOwnerPassword}
                        onChange={(e) => setVoidOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={closeVoidDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={voidSale}
              disabled={
                voidSubmitting ||
                !voidReason.trim() ||
                (!isOwner && voidOwnerMode && (!voidOwnerUsername.trim() || !voidOwnerPassword))
              }
            >
              {voidSubmitting
                ? "Processing..."
                : isOwner
                  ? "Void sale"
                  : voidOwnerMode
                    ? "Void now (owner)"
                    : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!correctionTarget}
        dismissible
        onOpenChange={(open) => !open && setCorrectionTarget(null)}
      >
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              Correction request — {correctionTarget?.saleNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Incorrect item / entry</Label>
                <Input
                  value={incorrectItem}
                  onChange={(e) => setIncorrectItem(e.target.value)}
                  placeholder="e.g. SS Angle Bar scanned by mistake"
                />
              </div>
              <div className="space-y-1">
                <Label>Correct item / entry</Label>
                <Input
                  value={correctItem}
                  onChange={(e) => setCorrectItem(e.target.value)}
                  placeholder="e.g. SS Flat Bar"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason (required)</Label>
              <Input
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Wrong item/qty/price entered after checkout"
              />
            </div>
            {correctionTarget && (
              <p className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
                {correctionPaymentRule(correctionTarget.paymentMethod)}
              </p>
            )}
            <div className="max-h-[320px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original line</TableHead>
                    <TableHead>Corrected product</TableHead>
                    <TableHead className="w-[120px]">Qty</TableHead>
                    <TableHead className="w-[160px]">Corrected unit price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correctionLines.map((line, index) => (
                    <TableRow key={line.saleItemId}>
                      <TableCell className="text-sm">{line.originalProductName}</TableCell>
                      <TableCell>
                        <Select
                          value={line.productId}
                          onValueChange={(v) =>
                            setCorrectionLines((prev) =>
                              prev.map((x, i) =>
                                i === index ? { ...x, productId: v ?? x.productId } : x
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            setCorrectionLines((prev) =>
                              prev.map((x, i) =>
                                i === index
                                  ? { ...x, quantity: Math.max(1, Number(e.target.value || 1)) }
                                  : x
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0.01}
                          value={line.correctedUnitPrice}
                          onChange={(e) =>
                            setCorrectionLines((prev) =>
                              prev.map((x, i) =>
                                i === index
                                  ? { ...x, correctedUnitPrice: Math.max(0.01, Number(e.target.value || 0.01)) }
                                  : x
                              )
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setCorrectionTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitCorrectionRequest} disabled={correctionSubmitting || !correctionReason.trim()}>
              {correctionSubmitting ? "Submitting..." : "Submit correction request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
