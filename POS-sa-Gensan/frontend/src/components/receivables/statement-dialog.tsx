"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { api, downloadExport } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/format";
import type { StatementOfAccount } from "@/lib/types";
import { RECEIVABLE_STATUS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StatementDialog({ customerId, open, onOpenChange }: Props) {
  const [data, setData] = useState<StatementOfAccount | null>(null);

  useEffect(() => {
    if (!open || !customerId) {
      setData(null);
      return;
    }
    api
      .get<StatementOfAccount>(`/api/receivables/statement/${customerId}`)
      .then(setData)
      .catch(() => setData(null));
  }, [open, customerId]);

  const printPdf = () => {
    if (!customerId) return;
    void downloadExport(
      `/api/receivables/statement/${customerId}/export/pdf`,
      `statement-${data?.customerName ?? customerId}.pdf`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Statement of account</DialogTitle>
        </DialogHeader>

        {data ? (
          <div id="statement-print" className="space-y-4 text-sm">
            <div>
              <p className="text-lg font-semibold">{data.customerName}</p>
              {data.phone && <p className="text-muted-foreground">{data.phone}</p>}
              {data.address && <p className="text-muted-foreground">{data.address}</p>}
              <p className="text-xs text-muted-foreground">
                As of {formatDate(data.statementDate)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Total outstanding</p>
                <p className="text-xl font-bold">{formatAmount(data.totalOutstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue amount</p>
                <p className="text-xl font-bold text-amount-negative">
                  {formatAmount(data.overdueAmount)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium">Open invoices</p>
              <Table enterprise>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.openInvoices.map((inv) => {
                    const st = RECEIVABLE_STATUS[inv.status];
                    return (
                      <TableRow key={inv.invoiceNumber}>
                        <TableCell className="font-mono text-xs">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(inv.remainingBalance)}
                        </TableCell>
                        <TableCell>
                          <Badge className={st?.className}>{st?.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!data.openInvoices.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No open balance
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {data.recentPayments.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Recent payments</p>
                <ul className="space-y-1 text-xs">
                  {data.recentPayments.map((p) => (
                    <li key={p.id} className="flex justify-between border-b py-1">
                      <span>
                        {formatDate(p.paymentDate)} · {p.invoiceNumber} · {p.recordedByName}
                      </span>
                      <span className="font-medium">{formatAmount(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-muted-foreground">Loading statement...</p>
        )}

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={printPdf} disabled={!customerId}>
            Download PDF
          </Button>
          <Button onClick={() => window.print()} disabled={!data}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
