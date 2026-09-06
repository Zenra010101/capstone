"use client";

import { useRef } from "react";
import { Download, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency, formatDate, formatDateOnly } from "@/lib/format";
import { ExpenseVoucherStatus, type ExpenseVoucher } from "@/lib/types";
import {
  EXPENSE_RECEIPT_ACCEPT,
  EXPENSE_RECEIPT_MAX_COUNT,
  EXPENSE_RECEIPT_RETENTION_DAYS,
  prepareExpenseReceiptFile,
  validateExpenseReceiptFile,
} from "@/lib/expense-attachments";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: ExpenseVoucher | null;
  onChanged: () => void;
  onPrint: () => void;
};

export function ExpenseDetailDialog({ open, onOpenChange, voucher, onChanged, onPrint }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!voucher) return null;

  const canEdit = voucher.status === ExpenseVoucherStatus.Unpaid;
  const canMarkPaid = voucher.status === ExpenseVoucherStatus.Unpaid;
  const canCancel = voucher.status === ExpenseVoucherStatus.Unpaid;

  const action = async (path: string, message: string) => {
    try {
      await api.post(path);
      toast.success(message);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  const uploadAttachment = async (file: File) => {
    const err = validateExpenseReceiptFile(file, voucher.attachments.length);
    if (err) {
      toast.error(err);
      return;
    }
    const body = new FormData();
    body.append("file", await prepareExpenseReceiptFile(file));
    try {
      await api.upload(`/api/expenses/${voucher.id}/attachments`, body);
      toast.success("Attachment uploaded");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{voucher.voucherNumber}</span>
            <ExpenseStatusBadge status={voucher.status} label={voucher.statusLabel} />
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p>{formatDateOnly(voucher.expenseDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p>{voucher.categoryName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payee</p>
              <p className="font-medium">{voucher.payee}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(voucher.amount)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Particulars</p>
              <p className="whitespace-pre-wrap">{voucher.particulars}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment</p>
              <p>{voucher.paymentMethodLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bank / reference</p>
              <p>
                {voucher.bank || "—"}
                {voucher.referenceNumber ? ` · ${voucher.referenceNumber}` : ""}
              </p>
            </div>
            {voucher.remarks && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Remarks</p>
                <p>{voucher.remarks}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <p>Created by: {voucher.createdByName ?? "—"}</p>
            {voucher.paidByName && <p>Paid by: {voucher.paidByName}</p>}
            {voucher.paidAt && <p>Paid date: {formatDate(voucher.paidAt)}</p>}
            {voucher.cancelledAt && <p>Cancelled: {formatDate(voucher.cancelledAt)}</p>}
          </div>

          {voucher.attachments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Attachments{" "}
                <span className="font-normal normal-case">
                  (receipt files are kept for {Math.round(EXPENSE_RECEIPT_RETENTION_DAYS / 365)} year, then auto-removed to save space)
                </span>
              </p>
              <ul className="space-y-1">
                {voucher.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                    <span className="truncate text-xs">
                      {a.fileName}
                      {!a.fileAvailable && (
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          · file expired (record kept)
                        </span>
                      )}
                    </span>
                    {a.fileAvailable ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void downloadExport(`/api/expenses/attachments/${a.id}`, a.fileName).catch(() =>
                            toast.error("Download failed")
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Expired</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept={EXPENSE_RECEIPT_ACCEPT}
            className="hidden"
            disabled={voucher.attachments.length >= EXPENSE_RECEIPT_MAX_COUNT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAttachment(file);
              e.target.value = "";
            }}
          />
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={voucher.attachments.length >= EXPENSE_RECEIPT_MAX_COUNT}
          >
            <Upload className="mr-2 h-4 w-4" />
            Attach receipt ({voucher.attachments.length}/{EXPENSE_RECEIPT_MAX_COUNT})
          </Button>
          <Button variant="outline" onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print voucher
          </Button>
          {canMarkPaid && (
            <Button onClick={() => void action(`/api/expenses/${voucher.id}/mark-paid`, "Marked as paid")}>
              Mark paid
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => void action(`/api/expenses/${voucher.id}/cancel`, "Cancelled")}
            >
              Cancel
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close to edit from list
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
