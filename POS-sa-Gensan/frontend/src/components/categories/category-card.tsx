"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Warehouse,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category } from "@/lib/types";
import { CardActions, ClickableCard } from "@/components/enterprise/clickable-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategoryAccentClass, getCategoryIcon } from "./category-icons";

type Props = {
  category: Category;
  isOwner: boolean;
  onEdit: (c: Category) => void;
  onArchive: (c: Category) => void;
};

export function CategoryCard({ category: c, isOwner, onEdit, onArchive }: Props) {
  const router = useRouter();
  const Icon = getCategoryIcon(c.icon);
  const accent = getCategoryAccentClass(c.colorAccent);

  return (
    <ClickableCard
      onCardClick={() => router.push(`/products?categoryId=${c.id}`)}
      className={`border-slate-200/80 border-l-4 shadow-erp transition-shadow hover:shadow-md ${accent} ${
        !c.isActive ? "opacity-75" : ""
      }`}
    >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{c.name}</h3>
              {c.parentCategoryName && (
                <p className="text-xs text-muted-foreground">Under {c.parentCategoryName}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={c.isActive ? "border-green-200 bg-green-100 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}>
            {c.statusLabel}
          </Badge>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {c.description || "No description"}
        </p>

        <div className="mt-4 space-y-1 text-sm text-slate-700">
          <p>
            <span className="font-semibold">{c.productCount}</span> products ·{" "}
            <span className="font-semibold">{c.totalStockUnits}</span> units
            {c.lowStockCount > 0 && (
              <span className="ml-1 text-amber-800"> · {c.lowStockCount} low stock</span>
            )}
          </p>
          {isOwner && c.totalInventoryValue != null && (
            <p className="text-xs text-muted-foreground">
              Inventory value {formatCurrency(c.totalInventoryValue)}
              {c.profitLast30Days != null && (
                <> · Profit (30d) {formatCurrency(c.profitLast30Days)}</>
              )}
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          {c.createdByName ? `Created by ${c.createdByName} · ` : ""}
          {formatDate(c.createdAt)}
        </p>

        <CardActions className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/products?categoryId=${c.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg inline-flex items-center")}
          >
            <Package className="mr-1.5 h-3.5 w-3.5" />
            View products
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/products?categoryId=${c.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View products
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/inventory?categoryId=${c.id}`)}>
                <Warehouse className="mr-2 h-4 w-4" />
                View inventory
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(c)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit category
                  </DropdownMenuItem>
                  {c.isActive && (
                    <DropdownMenuItem
                      className="text-amber-900"
                      onClick={() => onArchive(c)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive category
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardActions>
    </ClickableCard>
  );
}
