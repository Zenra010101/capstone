"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { GoodsReturnSlip, SaleForReturn } from "@/lib/types";
import { PaymentMethod } from "@/lib/types";
import { GRS_STORE_POLICY } from "@/lib/grs-policy";
import {
  GrsExchangeReplacementSection,
  computeReplacementTotal,
  isExchangeReplacementValid,
  type ReplacementLine,
} from "@/components/grs/grs-exchange-replacement-section";
import {
  computeExchangeSettlement,
  GrsExchangeSettlement,
  isExchangePaymentValid,
} from "@/components/grs/grs-exchange-settlement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

type LineState = {
  saleItemId: string;
  label: string;
  max: number;
  unitPrice: number;
  qty: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (grs?: GoodsReturnSlip) => void;
};

function parseReturnQty(raw: string): number | null {
  if (raw.trim() === "") return null;
  const q = parseInt(raw, 10);
  if (Number.isNaN(q)) return null;
  return q;
}

function lineQtyError(line: LineState): string | null {
  const q = parseReturnQty(line.qty);
  if (q === null) return null;
  if (q < 0) return "Quantity cannot be negative";
  if (q === 0) return null;
  if (q > line.max) {
    return `Maximum ${line.max} — only ${line.max} available to return on this invoice`;
  }
  return null;
}

export function NewReturnDialog({ open, onOpenChange, onCreated }: Props) {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [lines, setLines] = useState<LineState[]>([]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [goodCondition, setGoodCondition] = useState(false);
  const [replacementLines, setReplacementLines] = useState<ReplacementLine[]>([]);
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState<number>(PaymentMethod.Cash);
  const [exchangeAmountTendered, setExchangeAmountTendered] = useState("");
  const [exchangeQrphReference, setExchangeQrphReference] = useState("");
  const [exchangeBankName, setExchangeBankName] = useState("");
  const [exchangeBankReference, setExchangeBankReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setInvoiceSearch("");
    setSale(null);
    setLines([]);
    setReason("");
    setNotes("");
    setGoodCondition(false);
    setReplacementLines([]);
    setExchangePaymentMethod(PaymentMethod.Cash);
    setExchangeAmountTendered("");
    setExchangeQrphReference("");
    setExchangeBankName("");
    setExchangeBankReference("");
  };

  const lineErrors = useMemo(() => lines.map(lineQtyError), [lines]);
  const hasQtyErrors = lineErrors.some((e) => e != null);

  const previewTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = parseReturnQty(l.qty);
      if (q === null || q <= 0 || q > l.max) return sum;
      return sum + l.unitPrice * q;
    }, 0);
  }, [lines]);

  const replacementTotal = useMemo(
    () => computeReplacementTotal(replacementLines),
    [replacementLines]
  );

  const { amountDue: exchangeAmountDue } = useMemo(
    () => computeExchangeSettlement(previewTotal, replacementTotal),
    [previewTotal, replacementTotal]
  );

  const exchangePaymentReady = useMemo(() => {
    if (exchangeAmountDue <= 0.01) return true;
    return isExchangePaymentValid(
      exchangeAmountDue,
      exchangePaymentMethod,
      exchangeAmountTendered,
      exchangeQrphReference,
      exchangeBankName,
      exchangeBankReference,
      sale?.customerName
    ).ok;
  }, [
    exchangeAmountDue,
    exchangePaymentMethod,
    exchangeAmountTendered,
    exchangeQrphReference,
    exchangeBankName,
    exchangeBankReference,
    sale?.customerName,
  ]);

  const lookupSale = async () => {
    if (!invoiceSearch.trim()) return;
    try {
      const found = await api.get<SaleForReturn>(
        `/api/goods-return-slips/lookup?saleNumber=${encodeURIComponent(invoiceSearch.trim())}`
      );
      setSale(found);
      setReplacementLines([]);
      if (!found.items?.length) {
        setSale(null);
        setLines([]);
        toast.error("All items on this invoice have already been returned");
        return;
      }
      setLines(
        found.items.map((i) => {
          const max =
            i.availableToReturn ??
            Math.max(0, i.quantitySold - (i.returnedQuantity ?? 0));
          return {
            saleItemId: i.saleItemId,
            max,
            unitPrice: i.sellingPriceAtSale || i.unitPrice,
            qty: "",
            label: i.productBatchId
              ? `${i.productName} (${i.productSku}) · Batch ${
                  i.batchCode ?? i.productBatchId.slice(0, 8)
                }${i.batchReceivedDate ? ` · received ${i.batchReceivedDate}` : ""}`
              : `${i.productName} (${i.productSku})`,
          };
        })
      );
    } catch (e) {
      setSale(null);
      setLines([]);
      toast.error(e instanceof ApiError ? e.message : "Invoice not found or not eligible");
    }
  };

  const submit = async () => {
    if (!sale) return;
    if (!goodCondition) {
      toast.error(GRS_STORE_POLICY.acknowledgment);
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required");
      return;
    }
    const overMax = lines.filter((l) => {
      const q = parseReturnQty(l.qty);
      return q != null && q > l.max;
    });
    if (overMax.length) {
      toast.error(
        `Return quantity cannot exceed what was sold. Max ${overMax[0].max} for the first invalid line.`
      );
      return;
    }

    const items = lines
      .map((l) => ({
        saleItemId: l.saleItemId,
        quantity: parseReturnQty(l.qty) ?? 0,
        condition: 0,
      }))
      .filter((i) => i.quantity > 0);
    if (!items.length) {
      toast.error("Enter quantity for at least one return line");
      return;
    }

    const returnCredit = lines.reduce((sum, l) => {
      const q = parseReturnQty(l.qty);
      if (q == null || q <= 0 || q > l.max) return sum;
      return sum + l.unitPrice * q;
    }, 0);

    if (!isExchangeReplacementValid(returnCredit, replacementLines)) {
      toast.error("Replacement total must be at least the return credit");
      return;
    }

    const amountDue = Math.max(0, replacementTotal - returnCredit);
    if (amountDue > 0.01) {
      const payCheck = isExchangePaymentValid(
        amountDue,
        exchangePaymentMethod,
        exchangeAmountTendered,
        exchangeQrphReference,
        exchangeBankName,
        exchangeBankReference,
        sale.customerName
      );
      if (!payCheck.ok) {
        toast.error(payCheck.message ?? "Complete payment details");
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        originalSaleId: sale.id,
        reason: reason.trim(),
        goodConditionConfirmed: true,
        notes: notes.trim() || undefined,
        items,
        replacementItems: replacementLines.map((l) => ({
          productId: l.product.id,
          quantity: parseReturnQty(l.qty) ?? 0,
        })),
      };
      if (amountDue > 0.01) {
        body.exchangePaymentMethod = exchangePaymentMethod;
        if (exchangePaymentMethod === PaymentMethod.Cash) {
          const tendered = parseFloat(exchangeAmountTendered);
          body.exchangeAmountPaid = Number.isNaN(tendered) ? amountDue : tendered;
        } else {
          body.exchangeAmountPaid = amountDue;
        }
        if (exchangePaymentMethod === PaymentMethod.QRPH) {
          body.qrphReference = exchangeQrphReference.trim();
        }
        if (
          exchangePaymentMethod === PaymentMethod.OnlineBank ||
          exchangePaymentMethod === PaymentMethod.Cheque
        ) {
          if (exchangeBankName.trim()) body.bankName = exchangeBankName.trim();
          body.bankReference = exchangeBankReference.trim();
        }
      }

      if (isOwner) {
        const grs = await api.post<GoodsReturnSlip>("/api/goods-return-slips", body);
        toast.success("Return and exchange completed");
        onCreated(grs);
      } else {
        await api.post("/api/approvals/returns", {
          returnRequest: body,
          deviceName: navigator.userAgent,
        });
        toast.success("Return request submitted for owner approval");
        onCreated();
      }
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        size="xl"
        scrollBody={false}
        showCloseButton={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3.5 sm:px-6">
          <DialogTitle>Return and exchange</DialogTitle>
          <p className="text-sm text-muted-foreground">{GRS_STORE_POLICY.summary}</p>
          <p className="text-xs text-muted-foreground">
            {isOwner
              ? "Owner can finalize immediately."
              : "Cashier submits request; owner approval is required before finalization."}
          </p>
        </DialogHeader>

        <DialogBody className="space-y-5 px-5 py-4 sm:px-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search original invoice e.g. S20260520-0001"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void lookupSale()}
            />
            <Button type="button" variant="secondary" onClick={() => void lookupSale()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {sale && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {sale.saleNumber}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Sold {formatDate(sale.createdAt)} · {sale.cashierName}
                  </span>
                </div>
                {sale.customerName && (
                  <p className="text-sm">
                    Customer: <span className="font-medium">{sale.customerName}</span>
                  </p>
                )}
                <p className="text-sm">
                  Invoice total: <span className="font-medium">{formatCurrency(sale.totalAmount)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Original invoice stays on file. {isOwner ? "Owner completes immediately after validation." : "Cashier submits for owner approval after validation."}
                </p>
              </div>

              {sale.paymentMethod === PaymentMethod.Charged && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Charge sale — any amount due is collected at exchange; balance on account may
                  still apply separately.
                  {sale.receivableBalance != null
                    ? ` (balance ${formatCurrency(sale.receivableBalance)})`
                    : ""}
                </p>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium">Items to return</Label>
                {lines.map((l, idx) => {
                  const err = lineErrors[idx];
                  return (
                    <div
                      key={l.saleItemId}
                      className={cn(
                        "grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_7.5rem]",
                        err && "border-destructive/60 bg-destructive/5"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{l.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Max {l.max} · {formatCurrency(l.unitPrice)} each
                        </p>
                        {err && (
                          <p className="mt-1 text-xs font-medium text-destructive">{err}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min={0}
                          max={l.max}
                          inputMode="numeric"
                          aria-invalid={!!err}
                          placeholder={`0–${l.max}`}
                          value={l.qty}
                          className={cn(err && "border-destructive focus-visible:ring-destructive/40")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const next = [...lines];
                            next[idx] = { ...l, qty: raw };
                            setLines(next);
                          }}
                          onBlur={() => {
                            const q = parseReturnQty(l.qty);
                            if (q != null && q > l.max) {
                              const next = [...lines];
                              next[idx] = { ...l, qty: String(l.max) };
                              setLines(next);
                              toast.error(`Adjusted to maximum ${l.max} for this line`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>Return reason</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Wrong size, wrong specification, wrong item"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <label className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
                <input
                  type="checkbox"
                  checked={goodCondition}
                  onChange={(e) => setGoodCondition(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border"
                />
                <span className="text-sm">{GRS_STORE_POLICY.acknowledgment}</span>
              </label>

              {previewTotal > 0 && (
                <p className="text-right text-sm">
                  <span className="text-muted-foreground">Return credit:</span>{" "}
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(previewTotal)}
                  </span>
                </p>
              )}

              {previewTotal > 0 && (
                <>
                  <GrsExchangeReplacementSection
                    creditTotal={previewTotal}
                    lines={replacementLines}
                    onLinesChange={setReplacementLines}
                  />
                  {replacementLines.length > 0 && (
                    <GrsExchangeSettlement
                      creditTotal={previewTotal}
                      replacementTotal={replacementTotal}
                      paymentMethod={exchangePaymentMethod}
                      onPaymentMethodChange={setExchangePaymentMethod}
                      amountTendered={exchangeAmountTendered}
                      onAmountTenderedChange={setExchangeAmountTendered}
                      qrphReference={exchangeQrphReference}
                      onQrphReferenceChange={setExchangeQrphReference}
                      bankName={exchangeBankName}
                      onBankNameChange={setExchangeBankName}
                      bankReference={exchangeBankReference}
                      onBankReferenceChange={setExchangeBankReference}
                      customerName={sale.customerName}
                    />
                  )}
                </>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter showCloseButton={false} className="shrink-0 border-t px-5 py-3 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              !sale ||
              submitting ||
              hasQtyErrors ||
              !previewTotal ||
              !isExchangeReplacementValid(previewTotal, replacementLines) ||
              !exchangePaymentReady
            }
            title={hasQtyErrors ? "Fix quantities that exceed the maximum" : undefined}
          >
            {submitting ? "Processing..." : isOwner ? "Complete exchange" : "Request owner approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
