"use client";

import type { BatchAllocationResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BatchAllocationWarningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: BatchAllocationResult | null;
  onConfirm: () => void;
  onSelectBatch: (batchId: string) => void;
  allowManualSelection: boolean;
};

export function BatchAllocationWarningDialog({
  open,
  onOpenChange,
  allocation,
  onConfirm,
  onSelectBatch,
  allowManualSelection,
}: BatchAllocationWarningDialogProps) {
  if (!allocation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="text-amber-700">Warning</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            This quantity will be fulfilled from {allocation.lines.length} batches using FIFO.
          </p>
          {allocation.lines.length > 1 ? (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              {allocation.lines.map((line) => (
                <div key={line.batchId} className="flex justify-between gap-2">
                  <span>
                    {line.quantity} pcs @ {formatCurrency(line.sellingPrice)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-base font-semibold">
            Total: {formatCurrency(allocation.total)}
          </p>
          <p className="text-muted-foreground">Continue with this pricing?</p>
          {allowManualSelection && allocation.availableBatches.length > 1 ? (
            <div className="space-y-2 border-t pt-3">
              <p className="font-medium">Or start with a specific batch</p>
              <div className="grid gap-2">
                {allocation.availableBatches.map((batch) => (
                  <Button
                    key={batch.batchId}
                    type="button"
                    variant="outline"
                    className="h-auto justify-between py-2"
                    onClick={() => onSelectBatch(batch.batchId)}
                  >
                    <span>{batch.batchCode ?? batch.receivedDate}</span>
                    <span className="text-xs">
                      {batch.remainingQuantity} pcs @ {formatCurrency(batch.sellingPrice)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
