"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  FileDown,
  PhilippinePeso,
  Printer,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { api, downloadExport } from "@/lib/api";
import { buildQuery } from "@/lib/query";
import { formatCurrency, formatDate } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import type { Customer, CustomerLedgerDetail } from "@/lib/types";
import { PaymentMethod, PAYMENT_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatementDialog } from "@/components/receivables/statement-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResponsiveDataView } from "@/components/enterprise/responsive-data-view";
import { RecordMobileCard } from "@/components/enterprise/record-mobile-card";
import { EmptyState, TableEmptyRow } from "@/components/enterprise/empty-state";
import { TableShell } from "@/components/enterprise/table-shell";

const PAYMENT_FILTER = [
  { value: "", label: "All methods" },
  { value: String(PaymentMethod.Cash), label: PAYMENT_LABELS[PaymentMethod.Cash] },
  { value: String(PaymentMethod.QRPH), label: PAYMENT_LABELS[PaymentMethod.QRPH] },
  { value: String(PaymentMethod.OnlineBank), label: PAYMENT_LABELS[PaymentMethod.OnlineBank] },
  { value: String(PaymentMethod.Cheque), label: PAYMENT_LABELS[PaymentMethod.Cheque] },
];

function LedgerContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [ledger, setLedger] = useState<CustomerLedgerDetail | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [invoice, setInvoice] = useState("");

  useEffect(() => {
    api
      .get<ListResponse<Customer>>("/api/customers?includeInactive=true&page=0")
      .then((data) => setCustomers(asList(data)));
  }, []);

  useEffect(() => {
    const id = searchParams.get("customerId");
    if (id) setCustomerId(id);
  }, [searchParams]);

  const loadLedger = useCallback(() => {
    if (!customerId) {
      setLedger(null);
      return;
    }
    const qs = buildQuery({
      from: from || undefined,
      to: to || undefined,
      unpaidOnly: unpaidOnly || undefined,
      overdueOnly: overdueOnly || undefined,
      paymentMethod: paymentMethod || undefined,
      invoice: invoice.trim() || undefined,
    });
    api
      .get<CustomerLedgerDetail>(`/api/customers/${customerId}/ledger?${qs}`)
      .then(setLedger)
      .catch(() => setLedger(null));
  }, [customerId, from, to, unpaidOnly, overdueOnly, paymentMethod, invoice]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const printLedger = () => window.print();

  const exportPdf = () => {
    if (!customerId) return;
    void downloadExport(
      `/api/customers/${customerId}/statement/export/pdf`,
      `ledger-statement-${ledger?.customerName ?? customerId}.pdf`
    );
  };

  return (
    <>
      <PageHeader
        title="Customer ledger"
        description="Accounting-style running balance for charge sales and payments"
      />

      <Card className="mb-4 shadow-erp print:hidden">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label className="text-xs">Customer</Label>
            <OptionSelect
              className="mt-1"
              value={customerId}
              onValueChange={setCustomerId}
              searchable
              searchPlaceholder="Search customer name..."
              placeholder="Select customer"
              options={customers.map((c) => ({
                value: c.id,
                label:
                  c.outstandingBalance > 0
                    ? `${c.name} — ${formatCurrency(c.outstandingBalance)}`
                    : c.name,
                searchText: `${c.name} ${c.phone ?? ""}`,
              }))}
            />
          </div>
          <div>
            <Label className="text-xs">From date</Label>
            <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To date</Label>
            <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Payment method</Label>
            <OptionSelect
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              placeholder="All methods"
              options={PAYMENT_FILTER.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </div>
          <div>
            <Label className="text-xs">Invoice #</Label>
            <Input
              className="mt-1"
              placeholder="Search invoice..."
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4 lg:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
              Unpaid only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
              Overdue only
            </label>
            <Button variant="outline" size="sm" onClick={loadLedger}>
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {ledger && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <StatCard
              title="Current balance"
              value={formatCurrency(ledger.currentBalance)}
              icon={Wallet}
            />
            <StatCard
              title="Total purchases"
              value={formatCurrency(ledger.totalPurchases)}
              icon={PhilippinePeso}
            />
            <StatCard
              title="Total payments"
              value={formatCurrency(ledger.totalPayments)}
              icon={TrendingDown}
            />
            <StatCard
              title="Overdue amount"
              value={formatCurrency(ledger.overdueAmount)}
              icon={AlertTriangle}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <strong className="text-lg">{ledger.customerName}</strong>
              <span className="ml-2 text-muted-foreground">Account ledger</span>
            </p>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
                Statement of account
              </Button>
              <Button variant="outline" size="sm" onClick={exportPdf}>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={printLedger}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <TableShell id="ledger-print">
            <ResponsiveDataView
              mobile={
                ledger.entries.length === 0 ? (
                  <EmptyState compact title="No transactions match your filters" />
                ) : (
                  ledger.entries.map((e, i) => (
                    <RecordMobileCard
                      key={i}
                      title={e.type}
                      subtitle={`${formatDate(e.date)}${e.invoiceNumber ? ` · ${e.invoiceNumber}` : ""}`}
                      amount={formatCurrency(e.runningBalance)}
                      meta={
                        <span>
                          {e.debit > 0
                            ? `Debit ${formatCurrency(e.debit)}`
                            : e.credit > 0
                              ? `Credit ${formatCurrency(e.credit)}`
                              : "—"}
                          {e.paymentMethod ? ` · ${e.paymentMethod}` : ""}
                          {e.processedBy ? ` · ${e.processedBy}` : ""}
                        </span>
                      }
                    />
                  ))
                )
              }
            >
              <Table enterprise>
                <TableHeader>
                  <TableRow>
                    <TableHead sticky>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead hideBelow="md">Invoice</TableHead>
                    <TableHead hideBelow="lg">Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead hideBelow="xl">Method</TableHead>
                    <TableHead hideBelow="xl">Processed by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.entries.length === 0 ? (
                    <TableEmptyRow colSpan={9} title="No transactions match your filters" />
                  ) : (
                    ledger.entries.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell sticky className="whitespace-nowrap text-sm">
                          {formatDate(e.date)}
                        </TableCell>
                        <TableCell className="text-sm">{e.type}</TableCell>
                        <TableCell hideBelow="md" className="font-mono text-xs">{e.invoiceNumber || "—"}</TableCell>
                        <TableCell hideBelow="lg" className="max-w-[14rem] truncate text-sm">{e.description}</TableCell>
                        <TableCell className="text-right text-sm">
                          {e.debit > 0 ? formatCurrency(e.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-amount-positive">
                          {e.credit > 0 ? formatCurrency(e.credit) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(e.runningBalance)}
                        </TableCell>
                        <TableCell hideBelow="xl" className="text-sm text-muted-foreground">
                          {e.paymentMethod ?? "—"}
                        </TableCell>
                        <TableCell hideBelow="xl" className="text-sm text-muted-foreground">
                          {e.processedBy ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ResponsiveDataView>
          </TableShell>

          <StatementDialog
            customerId={customerId}
            open={statementOpen}
            onOpenChange={setStatementOpen}
          />
        </>
      )}

      {!customerId && (
        <p className="py-12 text-center text-muted-foreground print:hidden">
          Select a customer to view their ledger.
        </p>
      )}
    </>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading...</p>}>
      <LedgerContent />
    </Suspense>
  );
}
