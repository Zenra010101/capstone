"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import {
  EXPENSE_RECEIPT_ACCEPT,
  EXPENSE_RECEIPT_MAX_COUNT,
  EXPENSE_RECEIPT_MAX_BYTES,
  formatReceiptSize,
  uploadExpenseReceipts,
  validateExpenseReceiptFile,
} from "@/lib/expense-attachments";
import {
  EXPENSE_PAYMENT_METHODS,
  ExpensePaymentMethod,
  type ExpenseCategory,
  type ExpenseVoucher,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  voucher?: ExpenseVoucher | null;
  onSaved: (created?: ExpenseVoucher) => void;
  onCategoriesChanged: () => void;
};

const paymentOptions = Object.entries(EXPENSE_PAYMENT_METHODS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  voucher,
  onSaved,
  onCategoriesChanged,
}: Props) {
  const isEdit = Boolean(voucher);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [expenseDate, setExpenseDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [payee, setPayee] = useState("");
  const [particulars, setParticulars] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(String(ExpensePaymentMethod.Cash));
  const [bank, setBank] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<File[]>([]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const categoryLabel =
    activeCategories.find((c) => c.id === categoryId)?.name ?? null;
  const paymentLabel =
    EXPENSE_PAYMENT_METHODS[Number(paymentMethod) as ExpensePaymentMethod] ?? null;

  useEffect(() => {
    if (!open) return;
    setPendingReceipts([]);
    setNewCategoryName("");
    if (voucher) {
      setExpenseDate(voucher.expenseDate);
      setCategoryId(voucher.categoryId);
      setPayee(voucher.payee);
      setParticulars(voucher.particulars);
      setAmount(String(voucher.amount));
      setPaymentMethod(String(voucher.paymentMethod));
      setBank(voucher.bank ?? "");
      setReferenceNumber(voucher.referenceNumber ?? "");
      setRemarks(voucher.remarks ?? "");
    } else {
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setCategoryId(activeCategories[0]?.id ?? "");
      setPayee("");
      setParticulars("");
      setAmount("");
      setPaymentMethod(String(ExpensePaymentMethod.Cash));
      setBank("");
      setReferenceNumber("");
      setRemarks("");
    }
  }, [open, voucher, activeCategories]);

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    try {
      const created = await api.post<ExpenseCategory>("/api/expenses/categories", { name });
      toast.success(`Category "${created.name}" added`);
      setNewCategoryName("");
      onCategoriesChanged();
      setCategoryId(created.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not add category");
    } finally {
      setAddingCategory(false);
    }
  };

  const queueReceipts = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...pendingReceipts];
    for (const file of Array.from(files)) {
      const err = validateExpenseReceiptFile(file, next.length);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        continue;
      }
      next.push(file);
    }
    setPendingReceipts(next.slice(0, EXPENSE_RECEIPT_MAX_COUNT));
    if (receiptRef.current) receiptRef.current.value = "";
  };

  const submit = async () => {
    if (!categoryId) {
      toast.error("Select or add a category");
      return;
    }
    setSaving(true);
    const body = {
      expenseDate,
      categoryId,
      payee,
      particulars,
      amount: Number(amount),
      paymentMethod: Number(paymentMethod),
      bank: bank || undefined,
      referenceNumber: referenceNumber || undefined,
      remarks: remarks || undefined,
    };
    try {
      if (isEdit && voucher) {
        await api.put(`/api/expenses/${voucher.id}`, body);
        toast.success("Expense voucher updated");
        if (pendingReceipts.length) {
          void uploadExpenseReceipts(voucher.id, pendingReceipts, api.upload).then(({ uploaded, failed }) => {
            if (uploaded) toast.success(`${uploaded} receipt(s) uploaded`);
            if (failed) toast.error(`${failed} receipt(s) could not be uploaded`);
            onSaved();
          });
        } else {
          onSaved();
        }
      } else {
        const created = await api.post<ExpenseVoucher>("/api/expenses", body);
        toast.success("Expense voucher created");
        if (pendingReceipts.length) {
          void uploadExpenseReceipts(created.id, pendingReceipts, api.upload).then(({ uploaded, failed }) => {
            if (uploaded) toast.success(`${uploaded} receipt(s) uploaded`);
            if (failed) toast.error(`${failed} receipt(s) could not be uploaded`);
          });
        }
        onSaved(created);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense voucher" : "New expense voucher"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId || null} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select category">{categoryLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addCategory();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={!newCategoryName.trim() || addingCategory}
                onClick={() => void addCategory()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Payee</Label>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Payee name" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Particulars / description</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? String(ExpensePaymentMethod.Cash))}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select payment method">{paymentLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bank</Label>
            <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Reference / check number</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Payment receipt (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Up to {EXPENSE_RECEIPT_MAX_COUNT} files, max {formatReceiptSize(EXPENSE_RECEIPT_MAX_BYTES)} each (JPG,
              PNG, WebP, PDF). Photos are compressed before upload.
            </p>
            <input
              ref={receiptRef}
              type="file"
              accept={EXPENSE_RECEIPT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => queueReceipts(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingReceipts.length >= EXPENSE_RECEIPT_MAX_COUNT}
                onClick={() => receiptRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Attach receipt
              </Button>
            </div>
            {pendingReceipts.length > 0 && (
              <ul className="space-y-1 rounded-md border p-2 text-xs">
                {pendingReceipts.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {file.name} ({formatReceiptSize(file.size)})
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setPendingReceipts((list) => list.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Create voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
