"use client";

import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductDeactivateDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ProductDeactivateDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: ProductDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Deactivate {product?.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This hides the product from POS and new stock operations, but keeps all sales,
          inventory movements, reports, and audit history intact.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Deactivate product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
