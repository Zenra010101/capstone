"use client";

import type { ReactNode } from "react";
import { FileSpreadsheet, FileText, Package } from "lucide-react";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DateRange = { from: string; to: string };

type Props = {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  loading?: boolean;
  recordCount: number;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  children: ReactNode;
  footerNote?: string;
};

export function ProductFilteredHistoryShell({
  product,
  open,
  onOpenChange,
  title,
  subtitle,
  range,
  onRangeChange,
  loading,
  recordCount,
  onExportExcel,
  onExportPdf,
  children,
  footerNote,
}: Props) {
  const hasExport = onExportExcel || onExportPdf;

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground">
                <Package className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">{title}</DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-5 font-mono text-[11px]">
                    {product.sku}
                  </Badge>
                  <span className="max-w-[16rem] truncate text-xs text-muted-foreground">
                    {product.name}
                  </span>
                </div>
              </div>
            </div>
            {hasExport ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" variant="outline" size="sm" disabled={loading} />}
                >
                  Export
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExportExcel ? (
                    <DropdownMenuItem onClick={onExportExcel}>
                      <FileSpreadsheet className="mr-2 size-4" />
                      Excel
                    </DropdownMenuItem>
                  ) : null}
                  {onExportPdf ? (
                    <DropdownMenuItem onClick={onExportPdf}>
                      <FileText className="mr-2 size-4" />
                      PDF
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b bg-muted/15 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="history-from" className="text-[11px] uppercase tracking-wide">
                  From
                </Label>
                <Input
                  id="history-from"
                  type="date"
                  value={range.from}
                  onChange={(e) => onRangeChange({ ...range, from: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label htmlFor="history-to" className="text-[11px] uppercase tracking-wide">
                  To
                </Label>
                <Input
                  id="history-to"
                  type="date"
                  value={range.to}
                  onChange={(e) => onRangeChange({ ...range, to: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${recordCount} record${recordCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10 px-4 py-3 sm:px-5">
          {children}
        </div>

        {footerNote ? (
          <div className="shrink-0 border-t bg-card px-5 py-2 text-[11px] text-muted-foreground">
            {footerNote}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
