"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Pencil, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer, CustomerProfile } from "@/lib/types";
import {
  CUSTOMER_STATUS,
  CUSTOMER_TYPE_LABELS,
  CustomerType,
  PAYMENT_LABELS,
  RECEIVABLE_STATUS,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type Props = {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

const TYPE_OPTIONS = Object.entries(CUSTOMER_TYPE_LABELS).map(([v, label]) => ({
  value: v,
  label,
}));

export function CustomerProfileDialog({
  customerId,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    customerType: String(CustomerType.WalkIn),
    creditLimit: "0",
    isActive: true,
    isBlacklisted: false,
  });

  useEffect(() => {
    if (!open || !customerId) {
      setProfile(null);
      setEditing(false);
      return;
    }
    api
      .get<CustomerProfile>(`/api/customers/${customerId}/profile`)
      .then((p) => {
        setProfile(p);
        const c = p.customer;
        setForm({
          name: c.name,
          phone: c.phone ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
          notes: c.notes ?? "",
          customerType: String(c.customerType),
          creditLimit: String(c.creditLimit),
          isActive: c.isActive,
          isBlacklisted: c.isBlacklisted,
        });
      })
      .catch(() => setProfile(null));
  }, [open, customerId]);

  const save = async () => {
    if (!customerId || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await api.put(`/api/customers/${customerId}`, {
        name: form.name.trim(),
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        customerType: Number(form.customerType),
        creditLimit: parseFloat(form.creditLimit) || 0,
        isActive: form.isActive,
        isBlacklisted: form.isBlacklisted,
      });
      toast.success("Customer updated");
      setEditing(false);
      const p = await api.get<CustomerProfile>(`/api/customers/${customerId}/profile`);
      setProfile(p);
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    }
  };

  const c = profile?.customer;
  const statusMeta = c ? CUSTOMER_STATUS[c.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" scrollBody={false} className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            {c?.name ?? "Customer"}
            {statusMeta && (
              <Badge variant="outline" className={statusMeta.className}>
                {statusMeta.label}
              </Badge>
            )}
            {c?.isOverCreditLimit && (
              <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                Over credit limit
              </Badge>
            )}
            {c?.hasBouncedCheque && (
              <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
                Bounced cheque{c.bouncedChequeCount > 1 ? ` x${c.bouncedChequeCount}` : ""}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!profile || !c ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/ledger?customerId=${c.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <BookOpen className="mr-1.5 h-4 w-4" /> Ledger
              </Link>
              <Link
                href={`/receivables?customerSearch=${encodeURIComponent(c.name)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Wallet className="mr-1.5 h-4 w-4" /> Receivables
              </Link>
              <Link
                href={`/pos?customerId=${c.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" /> New sale
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                {editing ? "Cancel edit" : "Edit"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryBox label="Outstanding" value={formatCurrency(profile.totalOutstanding)} highlight />
              <SummaryBox label="Overdue" value={formatCurrency(profile.overdueAmount)} danger />
              <SummaryBox label="Open invoices" value={String(profile.openReceivableCount)} />
              <SummaryBox label="Credit limit" value={formatCurrency(c.creditLimit)} />
            </div>

            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="flex h-auto flex-wrap gap-1">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="receivables">Receivables</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="cheques">Cheques</TabsTrigger>
                <TabsTrigger value="bounced">Bounced</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                {editing ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name">
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field label="Type">
                      <Select value={form.customerType} onValueChange={(v) => setForm({ ...form, customerType: v ?? "0" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field label="Email">
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Field label="Address" className="sm:col-span-2">
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </Field>
                    <Field label="Credit limit">
                      <Input type="number" min={0} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                    </Field>
                    <Field label="Notes" className="sm:col-span-2">
                      <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </Field>
                    <div className="flex items-center gap-4 sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.isBlacklisted}
                          onChange={(e) => setForm({ ...form, isBlacklisted: e.target.checked })}
                        />
                        Blacklisted
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <Button onClick={save}>Save changes</Button>
                    </div>
                  </div>
                ) : (
                  <InfoGrid customer={c} />
                )}
              </TabsContent>

              <TabsContent value="receivables" className="mt-4">
                <MiniTable
                  headers={["Invoice", "Due", "Balance", "Status"]}
                  rows={profile.receivables.map((r) => {
                    const st = RECEIVABLE_STATUS[r.status];
                    return [
                      r.saleNumber,
                      formatDate(r.dueDate),
                      formatCurrency(r.remainingBalance),
                      <Badge key={r.id} variant="outline" className={st?.className}>
                        {st?.label ?? "—"}
                      </Badge>,
                    ];
                  })}
                  empty="No receivables"
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <MiniTable
                  headers={["Date", "Invoice", "Amount", "Method", "By"]}
                  rows={profile.recentPayments.map((p) => [
                    formatDate(p.paymentDate),
                    p.invoiceNumber ?? "—",
                    formatCurrency(p.amount),
                    p.isCredit ? "Credit" : (p.paymentMethod != null ? PAYMENT_LABELS[p.paymentMethod] : "—"),
                    p.recordedByName,
                  ])}
                  empty="No payments yet"
                />
              </TabsContent>

              <TabsContent value="sales" className="mt-4">
                <MiniTable
                  headers={["Date", "Invoice", "Amount", "Payment", "Cashier"]}
                  rows={profile.recentSales.map((s) => [
                    formatDate(s.createdAt),
                    s.saleNumber,
                    formatCurrency(s.totalAmount),
                    PAYMENT_LABELS[s.paymentMethod] ?? "—",
                    s.cashierName,
                  ])}
                  empty="No sales yet"
                />
              </TabsContent>

              <TabsContent value="cheques" className="mt-4">
                <MiniTable
                  headers={["Invoice", "Bank", "Cheque #", "Maturity", "Amount"]}
                  rows={profile.cheques.map((ch) => [
                    ch.saleNumber,
                    ch.bankName,
                    ch.chequeNumber,
                    formatDate(ch.maturityDate),
                    formatCurrency(ch.saleTotal),
                  ])}
                  empty="No cheque / PDC records"
                />
              </TabsContent>

              <TabsContent value="bounced" className="mt-4">
                <MiniTable
                  headers={["Bounced", "Invoice", "Cheque #", "Bank", "Amount", "Penalty", "Reason"]}
                  rows={(profile.bouncedCheques ?? []).map((b) => [
                    formatDate(b.bouncedDate),
                    b.invoiceNumber,
                    b.chequeNumber,
                    b.bankName,
                    formatCurrency(b.amount),
                    b.penaltyAmount > 0 ? formatCurrency(b.penaltyAmount) : "—",
                    b.reason,
                  ])}
                  empty="No bounced cheque history"
                />
              </TabsContent>
            </Tabs>
          </>
        )}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-slate-50/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold ${
          danger ? "text-red-600" : highlight ? "text-slate-900" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InfoGrid({ customer: c }: { customer: Customer }) {
  const rows: [string, string][] = [
    ["Type", CUSTOMER_TYPE_LABELS[c.customerType] ?? "—"],
    ["Phone", c.phone ?? "—"],
    ["Email", c.email ?? "—"],
    ["Address", c.address ?? "—"],
    ["Total purchases", formatCurrency(c.totalPurchases)],
    ["Last purchase", c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : "—"],
    ["Last payment", c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—"],
    ["Notes", c.notes ?? "—"],
  ];
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function MiniTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | ReactNode)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <Card className="overflow-hidden border shadow-erp">
      <Table enterprise>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j} className="text-sm">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

