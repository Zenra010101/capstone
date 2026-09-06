"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";
import {
  CUSTOMER_STATUS,
  CUSTOMER_TYPE_LABELS,
} from "@/lib/types";
import { CardActions, ClickableCard } from "@/components/enterprise/clickable-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  customer: Customer;
  onOpen: (customer: Customer) => void;
  onStatement: (customerId: string) => void;
};

export function CustomerCard({ customer: c, onOpen, onStatement }: Props) {
  const statusMeta = CUSTOMER_STATUS[c.status] ?? CUSTOMER_STATUS[0];
  const typeLabel = CUSTOMER_TYPE_LABELS[c.customerType] ?? "Customer";

  return (
    <ClickableCard
      onCardClick={() => onOpen(c)}
      className={`border-slate-200/80 shadow-erp transition-shadow hover:shadow-md ${
        c.isOverCreditLimit ? "ring-2 ring-amber-400/80" : ""
      }`}
    >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900">{c.name}</h3>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
          <Badge variant="outline" className={statusMeta.className}>
            {statusMeta.label}
          </Badge>
        </div>

        {c.isOverCreditLimit && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Balance at or over credit limit
          </p>
        )}
        {c.hasBouncedCheque && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Bounced cheque{c.bouncedChequeCount > 1 ? `s (${c.bouncedChequeCount})` : ""}
            {c.lastBouncedDate ? ` · last ${formatDate(c.lastBouncedDate)}` : ""}
          </p>
        )}

        {(c.phone || c.email) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {c.phone}
            {c.phone && c.email ? " · " : ""}
            {c.email}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p
              className={`font-semibold ${
                c.outstandingBalance > 0 ? "text-red-600" : "text-slate-900"
              }`}
            >
              {formatCurrency(c.outstandingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credit limit</p>
            <p className="font-medium">{formatCurrency(c.creditLimit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total purchases</p>
            <p className="font-medium">{formatCurrency(c.totalPurchases)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overdue items</p>
            <p className={`font-medium ${c.overdueCount > 0 ? "text-red-600" : ""}`}>
              {c.overdueCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last purchase</p>
            <p className="text-xs font-medium">
              {c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last payment</p>
            <p className="text-xs font-medium">
              {c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—"}
            </p>
          </div>
        </div>

        <CardActions className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/ledger?customerId=${c.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-lg")}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            Ledger
          </Link>
          <Link
            href={`/receivables?customerSearch=${encodeURIComponent(c.name)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-lg")}
          >
            <Wallet className="mr-1.5 h-3.5 w-3.5" />
            Receivables
          </Link>
          <Link
            href={`/pos?customerId=${c.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 rounded-lg")}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            New sale
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg"
            onClick={() => onStatement(c.id)}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Statement
          </Button>
        </CardActions>
    </ClickableCard>
  );
}
