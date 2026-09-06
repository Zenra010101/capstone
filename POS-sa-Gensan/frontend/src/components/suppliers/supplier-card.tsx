"use client";

import Link from "next/link";
import {
  Archive,
  FileText,
  MoreHorizontal,
  Package,
  Pencil,
  Truck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SupplierListItem } from "@/lib/types";
import { SupplierStatus } from "@/lib/types";
import { CardActions, ClickableCard } from "@/components/enterprise/clickable-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupplierStatusBadge } from "./supplier-status-badge";

type Props = {
  supplier: SupplierListItem;
  isOwner: boolean;
  onView: (s: SupplierListItem) => void;
  onEdit: (s: SupplierListItem) => void;
  onArchive: (s: SupplierListItem) => void;
};

export function SupplierCard({ supplier: s, isOwner, onView, onEdit, onArchive }: Props) {
  const borderAccent =
    s.status === SupplierStatus.Preferred
      ? "border-l-blue-500"
      : s.status === SupplierStatus.Blacklisted
        ? "border-l-red-400"
        : "border-l-slate-300";

  return (
    <ClickableCard
      onCardClick={() => onView(s)}
      className={cn(
        "border-slate-200/80 border-l-4 shadow-erp transition-shadow hover:shadow-md",
        borderAccent,
        s.status === SupplierStatus.Archived && "opacity-75"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">{s.name}</h3>
          {s.contactPerson ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{s.contactPerson}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1" data-card-action>
          <SupplierStatusBadge status={s.status} label={s.statusLabel} />
          {isOwner && s.status !== SupplierStatus.Archived ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(s)}>View profile</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.location.assign(`/stock-receiving?supplierId=${s.id}`)}
                >
                  <Truck className="mr-2 h-4 w-4" /> Receiving history
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.location.assign(`/stock-receiving?create=1&supplierId=${s.id}`)
                  }
                >
                  <Package className="mr-2 h-4 w-4" /> Create receiving
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(s)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onArchive(s)}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-slate-700">
        {s.phone ? <p>{s.phone}</p> : null}
        {s.email ? <p className="text-muted-foreground">{s.email}</p> : null}
        <p className="text-xs text-muted-foreground">{s.paymentTermsLabel}</p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p>
          <span className="font-semibold">{s.suppliedProductCount}</span> products supplied
        </p>
        <p className="text-xs text-muted-foreground">
          Last receiving {s.lastReceivingDate ? formatDate(s.lastReceivingDate) : "—"}
        </p>
        {isOwner && s.lifetimePurchaseValue != null && s.lifetimePurchaseValue > 0 ? (
          <p className="text-xs font-medium text-slate-800">
            Lifetime value {formatCurrency(s.lifetimePurchaseValue)}
            {s.approvedReceivingCount != null ? <> · {s.approvedReceivingCount} approved RCVs</> : null}
          </p>
        ) : null}
      </div>

      {!isOwner ? (
        <CardActions className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/stock-receiving?supplierId=${s.id}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}
          >
            <FileText className="mr-1 h-3 w-3" /> Receiving
          </Link>
        </CardActions>
      ) : null}
    </ClickableCard>
  );
}
