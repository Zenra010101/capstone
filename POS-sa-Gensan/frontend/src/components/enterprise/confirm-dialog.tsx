"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} dismissible onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        scrollBody={false}
        showCloseButton={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="space-y-2 px-6 pb-1 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold leading-snug">{title}</DialogTitle>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </DialogHeader>
        <DialogFooter
          showCloseButton={false}
          className="!mx-0 !mb-0 mt-0 flex-row justify-end gap-3 rounded-none border-t border-border/60 bg-muted/25 px-6 py-4"
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-[8.5rem]"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-[8.5rem] font-semibold"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
