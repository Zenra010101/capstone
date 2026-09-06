"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  FileDown,
  FileSpreadsheet,
  PhilippinePeso,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { buildQuery } from "@/lib/query";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Receivable, ReceivablesSummary } from "@/lib/types";
import { ChequeType, PaymentMethod, PAYMENT_LABELS, RECEIVABLE_STATUS } from "@/lib/types";
import { BankSelect } from "@/components/pos/bank-select";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { StatementDialog } from "@/components/receivables/statement-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/enterprise/kpi-grid";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { TableShell } from "@/components/enterprise/table-shell";
import { TablePagination, type TablePageSize } from "@/components/enterprise/table-pagination";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethod.Cash, label: PAYMENT_LABELS[PaymentMethod.Cash] },
  { value: PaymentMethod.QRPH, label: PAYMENT_LABELS[PaymentMethod.QRPH] },
  { value: PaymentMethod.OnlineBank, label: PAYMENT_LABELS[PaymentMethod.OnlineBank] },
  { value: PaymentMethod.Cheque, label: PAYMENT_LABELS[PaymentMethod.Cheque] },
];

const paymentMethodLabel = (value: string) =>
  PAYMENT_LABELS[parseInt(value, 10)] ?? "Cash";

export default function ReceivablesPage() {
  const searchParams = useSearchParams();
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");

  const [list, setList] = useState<Receivable[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") ?? "open"
  );
  const [customerSearch, setCustomerSearch] = useState(
    () => searchParams.get("customerSearch") ?? ""
  );
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState(
    () => searchParams.get("customerSearch") ?? ""
  );

  const [detail, setDetail] = useState<Receivable | null>(null);
  const [payOpen, setPayOpen] = useState<Receivable | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState(String(PaymentMethod.Cash));
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payChequeBank, setPayChequeBank] = useState("");
  const [payChequeBranch, setPayChequeBranch] = useState("");
  const [payChequeNumber, setPayChequeNumber] = useState("");
  const [payChequeAccount, setPayChequeAccount] = useState("");
  const [payChequeMaturity, setPayChequeMaturity] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  const load = useCallback(async (pageNum = page) => {
    const params: Record<string, string | undefined> = {
      page: String(pageNum),
      pageSize: String(pageSize),
    };
    if (statusFilter === "overdue") params.overdueOnly = "true";
    else if (statusFilter === "open") params.openOnly = "true";
    else if (statusFilter !== "all") params.status = statusFilter;
    if (debouncedCustomerSearch.trim())
      params.customerSearch = debouncedCustomerSearch.trim();

    const qs = buildQuery(params);
    const [paged, sum] = await Promise.all([
      api.get<{
        items: Receivable[];
        totalCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/api/receivables?${qs}`),
      api.get<ReceivablesSummary>("/api/receivables/summary"),
    ]);
    setList(paged.items);
    setPage(paged.page);
    setTotalPages(paged.totalPages);
    setTotalCount(paged.totalCount);
    setSummary(sum);
  }, [statusFilter, debouncedCustomerSearch, page, pageSize]);

  useEffect(() => {
    const fromUrl = searchParams.get("status");
    if (fromUrl) setStatusFilter(fromUrl);
    const cs = searchParams.get("customerSearch");
    if (cs != null) {
      setCustomerSearch(cs);
      setDebouncedCustomerSearch(cs);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 400);
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedCustomerSearch]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const openDetail = async (id: string) => {
    try {
      const r = await api.get<Receivable>(`/api/receivables/${id}`);
      setDetail(r);
    } catch {
      toast.error("Could not load receivable");
    }
  };

  const openPay = (r: Receivable) => {
    setPayOpen(r);
    setPayAmount("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod(String(PaymentMethod.Cash));
    setPayReference("");
    setPayNotes("");
  };

  const payFullBalance = () => {
    if (payOpen) setPayAmount(String(payOpen.remainingBalance));
  };

  const recordPayment = async () => {
    if (!payOpen) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    const method = parseInt(payMethod, 10);
    if (method === PaymentMethod.Cheque) {
      if (
        !payChequeBank.trim() ||
        !payChequeBranch.trim() ||
        !payChequeNumber.trim() ||
        !payChequeAccount.trim()
      ) {
        toast.error("Cheque requires bank, branch/address, cheque number, and account name");
        return;
      }
    }
    try {
      await api.post(`/api/receivables/${payOpen.id}/payments`, {
        amount,
        paymentDate: new Date(payDate).toISOString(),
        paymentMethod: method,
        reference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
        cheque:
          method === PaymentMethod.Cheque
            ? {
                type: ChequeType.Current,
                bankName: payChequeBank.trim(),
                branch: payChequeBranch.trim(),
                chequeNumber: payChequeNumber.trim(),
                accountName: payChequeAccount.trim(),
                maturityDate: new Date(payChequeMaturity).toISOString(),
              }
            : undefined,
      });
      toast.success(
        method === PaymentMethod.Cheque
          ? "Cheque registered (pending) — balance updates when cleared"
          : "Payment recorded — original invoice unchanged"
      );
      setPayOpen(null);
      setDetail(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Payment failed");
    }
  };

  const exportList = async (format: "excel" | "pdf") => {
    const params: Record<string, string | undefined> = { format };
    if (statusFilter === "overdue") params.overdueOnly = "true";
    else if (statusFilter === "open") params.openOnly = "true";
    else if (statusFilter !== "all") params.status = statusFilter;
    if (debouncedCustomerSearch.trim())
      params.customerSearch = debouncedCustomerSearch.trim();
    await downloadExport(
      `/api/receivables/export?${buildQuery(params)}`,
      `receivables.${format === "pdf" ? "pdf" : "xlsx"}`
    );
  };

  return (
    <>
      <PageHeader
        title="Charge / Receivables"
        description="Charged sales with separate payment records — original invoices are never edited"
        action={
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <>
                <Button variant="outline" size="sm" onClick={() => void exportList("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => void exportList("pdf")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
            <Link href="/customers">
              <Button variant="outline">Customers</Button>
            </Link>
          </div>
        }
      />

      <KpiGrid>
        <StatCard
          title="Total outstanding"
          value={formatCurrency(summary?.totalOutstanding ?? 0)}
          icon={PhilippinePeso}
        />
        <StatCard
          title="Collected today"
          value={formatCurrency(summary?.collectedToday ?? 0)}
          subtitle="Cash-in payments recorded today"
          icon={Wallet}
        />
        <StatCard
          title="Overdue amount"
          value={formatCurrency(summary?.overdueAmount ?? 0)}
          subtitle={`${summary?.overdueCount ?? 0} account(s) past due`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Active customers"
          value={String(summary?.activeCustomersWithBalance ?? 0)}
          subtitle="With open balance"
          icon={Users}
        />
      </KpiGrid>

      <Card className="mb-4 flex flex-col gap-3 p-3 shadow-erp sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs">Search customer</Label>
          <Input
            placeholder="Customer name"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setDebouncedCustomerSearch(customerSearch);
            }}
          />
        </div>
      </Card>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="open">Open balances</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="0">Unpaid</TabsTrigger>
          <TabsTrigger value="1">Partial</TabsTrigger>
          <TabsTrigger value="2">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <TableShell>
        <ResponsiveDataView
          mobile={
            list.length === 0 ? (
              <EmptyState compact title="No receivables in this view" />
            ) : (
              list.map((r) => {
                const st = RECEIVABLE_STATUS[r.status];
                return (
                  <RecordMobileCard
                    key={r.id}
                    title={r.customerName}
                    subtitle={r.saleNumber}
                    meta={`Due ${formatDate(r.dueDate)}${r.daysOverdue > 0 ? ` · ${r.daysOverdue}d overdue` : ""}`}
                    amount={formatCurrency(r.remainingBalance)}
                    amountTone={r.daysOverdue > 0 ? "negative" : "neutral"}
                    badge={
                      <Badge variant={st?.variant ?? "secondary"} className="text-[10px]">
                        {st?.label ?? "—"}
                      </Badge>
                    }
                    onOpen={() => void openDetail(r.id)}
                    onAction={() => (r.remainingBalance > 0 ? openPay(r) : openDetail(r.id))}
                    actionLabel={r.remainingBalance > 0 ? "Record payment" : "View"}
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
              <TableHead>Customer</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead hideBelow="md" className="text-right">Total</TableHead>
              <TableHead hideBelow="lg" className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead hideBelow="xl">Last payment</TableHead>
              <TableHead hideBelow="lg" className="text-right">Days overdue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => {
              const st = RECEIVABLE_STATUS[r.status];
              return (
                <TableRow key={r.id} onRowClick={() => void openDetail(r.id)}>
                  <TableCell sticky className="font-mono text-xs">{r.saleNumber}</TableCell>
                  <TableCell className="max-w-[10rem] truncate">{r.customerName}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(r.dueDate)}
                  </TableCell>
                  <TableCell hideBelow="md" className="text-right">{formatCurrency(r.totalAmount)}</TableCell>
                  <TableCell hideBelow="lg" className="text-right text-amount-positive">
                    {formatCurrency(r.paidAmount)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(r.remainingBalance)}
                  </TableCell>
                  <TableCell hideBelow="xl" className="whitespace-nowrap text-sm">
                    {r.lastPaymentDate ? formatDate(r.lastPaymentDate) : "—"}
                  </TableCell>
                  <TableCell hideBelow="lg" className="text-right">
                    {r.daysOverdue > 0 ? (
                      <span className="font-medium text-amount-negative">{r.daysOverdue}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st?.variant} className={st?.className}>
                      {st?.label}
                    </Badge>
                  </TableCell>
                  <TableRowActions>
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.remainingBalance > 0 && (
                        <Button size="sm" onClick={() => openPay(r)}>
                          Pay
                        </Button>
                      )}
                      <Link href={`/sales?search=${encodeURIComponent(r.saleNumber)}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View invoice in Sales"
                          aria-label={`View invoice ${r.saleNumber} in Sales`}
                        >
                          Invoice
                        </Button>
                      </Link>
                      {r.customerId && (
                        <>
                          <Link href={`/ledger?customerId=${r.customerId}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Customer ledger"
                              aria-label={`Ledger for ${r.customerName}`}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Statement of account"
                            aria-label={`Statement for ${r.customerName}`}
                            onClick={() => setStatementCustomerId(r.customerId!)}
                          >
                            Statement
                          </Button>
                        </>
                      )}
                    </div>
                  </TableRowActions>
                </TableRow>
              );
            })}
            {!list.length && (
              <TableEmptyRow colSpan={10} title="No receivables in this view" />
            )}
          </TableBody>
        </Table>
        </ResponsiveDataView>
      </TableShell>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        itemLabel="receivables"
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        className="mt-4 rounded-lg border bg-card"
      />

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {detail?.saleNumber} — {detail?.customerName}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-medium">{formatCurrency(detail.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-amount-positive">
                <span>Paid</span>
                <span>{formatCurrency(detail.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Balance</span>
                <span>{formatCurrency(detail.remainingBalance)}</span>
              </div>
              <p className="text-muted-foreground">Due: {formatDate(detail.dueDate)}</p>
              <div className="border-t pt-2">
                <p className="mb-2 font-medium">Payment history</p>
                {!detail.payments.length && (
                  <p className="text-muted-foreground">No payments yet</p>
                )}
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="rounded border p-2 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>
                          {p.isCredit ? "Credit " : ""}
                          {formatCurrency(p.amount)}
                          {!p.isCredit && p.paymentMethod != null && (
                            <span className="ml-1 text-muted-foreground">
                              · {PAYMENT_LABELS[p.paymentMethod] ?? p.paymentMethod}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(p.paymentDate)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {formatCurrency(p.balanceBefore)} {"->"} {formatCurrency(p.balanceAfter)}
                        {p.recordedByName && ` · ${p.recordedByName}`}
                        {p.reference && ` · Ref ${p.reference}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            {detail && detail.remainingBalance > 0 && (
              <Button
                onClick={() => {
                  openPay(detail);
                  setDetail(null);
                }}
              >
                Record payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Record payment — {payOpen?.saleNumber}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creates a separate payment record. Original invoice {payOpen?.saleNumber} is not
            modified.
          </p>
          <div className="space-y-3 py-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label>Amount paid</Label>
                <Input
                  type="number"
                  step="0.01"
                  max={payOpen?.remainingBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={payFullBalance}>
                Full balance
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Payment date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Payment method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{paymentMethodLabel(payMethod)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {parseInt(payMethod, 10) === PaymentMethod.Cheque && (
              <>
                <p className="text-xs text-amber-800">
                  Cheque payments stay pending until cleared in Cheques &amp; PDC. A bounce keeps the
                  invoice unpaid.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Bank</Label>
                    <BankSelect value={payChequeBank} onChange={setPayChequeBank} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Branch / address</Label>
                    <Input
                      value={payChequeBranch}
                      onChange={(e) => setPayChequeBranch(e.target.value)}
                      placeholder="Bank branch or street address on cheque"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cheque #</Label>
                    <Input value={payChequeNumber} onChange={(e) => setPayChequeNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Account name</Label>
                    <Input value={payChequeAccount} onChange={(e) => setPayChequeAccount(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Maturity date</Label>
                    <Input
                      type="date"
                      value={payChequeMaturity}
                      onChange={(e) => setPayChequeMaturity(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Reference (optional)</Label>
              <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setPayOpen(null)}>
              Cancel
            </Button>
            <Button onClick={() => void recordPayment()}>Save payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StatementDialog
        customerId={statementCustomerId}
        open={!!statementCustomerId}
        onOpenChange={(o) => !o && setStatementCustomerId(null)}
      />
    </>
  );
}



