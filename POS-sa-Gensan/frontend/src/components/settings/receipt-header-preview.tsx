"use client";

import { useState } from "react";
import type { StoreSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  settings: StoreSettings;
};

export function ReceiptHeaderPreview({ settings }: Props) {
  const [kind, setKind] = useState<"cash" | "charge">("cash");
  const title =
    kind === "charge" ? settings.trustReceiptTitle : settings.cashReceiptTitle;

  return (
    <Card className="shadow-erp">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Receipt preview</CardTitle>
        <p className="text-xs font-normal text-muted-foreground">
          Live preview of printed header (updates as you edit)
        </p>
        <div className="mt-2 flex gap-1 rounded-md border border-border/80 bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setKind("cash")}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              kind === "cash"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Cash sale
          </button>
          <button
            type="button"
            onClick={() => setKind("charge")}
            className={cn(
              "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
              kind === "charge"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Charge / trust
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-sm rounded-lg border border-border bg-white px-5 py-6 text-center text-[11px] leading-snug text-black shadow-inner">
          <p className="tracking-wide">{settings.outletLine || "—"}</p>
          <p className="text-xs font-semibold">{settings.brandLine || "—"}</p>
          <p className="text-[10px] italic text-neutral-600">{settings.tagline || "—"}</p>
          <p className="mt-2 text-sm font-bold uppercase">{settings.storeName || "—"}</p>
          <p className="mt-1 text-[10px]">{settings.address || "—"}</p>
          <p className="text-[10px]">Tel: {settings.phone || "—"}</p>
          <h2 className="my-4 text-sm font-bold underline decoration-2 underline-offset-4">
            {title || "—"}
          </h2>
          <p className="text-[10px] text-neutral-500">
            Line items and totals appear below on real receipts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
