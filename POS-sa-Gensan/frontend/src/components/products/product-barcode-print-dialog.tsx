"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_LABEL_OPTIONS,
  openBarcodePrintWindow,
} from "./barcode-label-utils";

export function ProductBarcodePrintDialog({
  product,
  open,
  onOpenChange,
  onBarcodeGenerated,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onBarcodeGenerated: () => void;
}) {
  const [copies, setCopies] = useState("1");
  const [generating, setGenerating] = useState(false);

  if (!product) return null;

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post(`/api/products/${product.id}/generate-barcode`, {});
      toast.success("Barcode generated");
      onBarcodeGenerated();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const print = (mode: "print" | "pdf") => {
    if (!product.barcode?.trim()) {
      toast.error("Generate a barcode first");
      return;
    }
    const count = Math.min(50, Math.max(1, parseInt(copies, 10) || 1));
    const options = { ...DEFAULT_LABEL_OPTIONS, copiesPerProduct: count, size: "small" as const };
    const opened = openBarcodePrintWindow([product], options, mode);
    if (!opened) {
      toast.error("Allow pop-ups to print labels");
      return;
    }
    if (mode === "pdf") {
      toast.message("Use Print → Save as PDF in the preview window");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Print barcode</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{product.name}</p>
        <div className="rounded-lg border bg-slate-50 p-4 text-center">
          {product.barcode ? (
            <>
              <p className="font-mono text-lg tracking-wider">{product.barcode}</p>
              <p className="mt-1 text-xs text-muted-foreground">Scannable Code 128 (display font)</p>
              <p className="mt-2 text-sm font-semibold">{formatCurrency(product.unitPrice)}</p>
            </>
          ) : (
            <p className="text-sm text-amber-800">No barcode assigned. Generate one first.</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Label copies</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
          />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!product.barcode && (
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? "Generating..." : "Generate barcode"}
            </Button>
          )}
          <Button variant="outline" onClick={() => print("pdf")} disabled={!product.barcode}>
            Export PDF
          </Button>
          <Button onClick={() => print("print")} disabled={!product.barcode}>
            Print labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
