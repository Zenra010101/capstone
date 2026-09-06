"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { InventoryOnHand } from "@/lib/types";
import { StockStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOW_THRESHOLD = 15;
const CRITICAL_THRESHOLD = 5;

function severity(a: InventoryOnHand) {
  if (a.stockStatus === StockStatus.OutOfStock) return 0;
  if (a.stockStatus === StockStatus.Critical) return 1;
  return 2;
}

type Props = {
  items: InventoryOnHand[];
  onViewLedger: (productId: string, productName: string) => void;
};

export function LowStockAlerts({ items, onViewLedger }: Props) {
  const alerts = items
    .filter((p) => p.stockQuantity <= LOW_THRESHOLD)
    .sort((a, b) => severity(a) - severity(b) || a.stockQuantity - b.stockQuantity);

  if (!alerts.length) return null;

  return (
    <Card className="mb-6 border-red-200/70 bg-red-50/40 shadow-erp">
      <CardHeader className="border-b border-red-100/80 bg-red-50/50 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-800">
          <AlertTriangle className="h-5 w-5 text-red-700/80" />
          Stock alerts
          <Badge variant="outline" className="border-red-200 bg-white/80 text-red-700">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 bg-red-50/20 pb-4 pt-3">
        {alerts.map((p) => (
          <div
            key={p.productId}
            role="button"
            tabIndex={0}
            title="Click to view movement history"
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-100/90 bg-white/90 px-3 py-2 shadow-erp transition-colors hover:bg-red-50/50 cursor-pointer"
            onClick={() => onViewLedger(p.productId, p.productName)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onViewLedger(p.productId, p.productName);
              }
            }}
          >
            <div className="min-w-0">
              <Link
                href={`/products?search=${encodeURIComponent(p.productSku)}`}
                className="font-medium text-foreground hover:underline"
                data-card-action
                onClick={(e) => e.stopPropagation()}
              >
                {p.productName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {p.productSku} · {p.stockStatusLabel} ·{" "}
                <span className="font-semibold text-red-700">
                  {p.stockQuantity} {p.unitOfMeasure}
                </span>
                {` (low ≤ ${LOW_THRESHOLD}, critical ≤ ${CRITICAL_THRESHOLD})`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              data-card-action
              onClick={(e) => {
                e.stopPropagation();
                onViewLedger(p.productId, p.productName);
              }}
            >
              Movement history
            </Button>
          </div>
        ))}
        <Link
          href="/adjustments"
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "text-red-800/90")}
        >
          Request stock correction via Adjustments →
        </Link>
      </CardContent>
    </Card>
  );
}
