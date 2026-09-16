"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CreditCard, RefreshCw, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { CustomerType, SupplierPaymentTerms } from "@/lib/types";
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
import { OptionSelect } from "@/components/ui/option-select";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_FORM_PAYMENT_OPTIONS,
  CUSTOMER_FORM_STATUS_OPTIONS,
  CUSTOMER_FORM_TYPE_OPTIONS,
  CUSTOMER_INPUT_CLASS,
  CUSTOMER_TEXTAREA_CLASS,
  customerStatusLabel,
  customerStatusToFlags,
  defaultDueDaysForPaymentTerms,
} from "./customer-form-utils";

type FormState = {
  customerCode: string;
  name: string;
  customerType: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  enableCredit: boolean;
  creditLimit: string;
  paymentTerms: string;
  customPaymentTerms: string;
  dueDays: string;
  allowCheque: boolean;
  notes: string;
};

const emptyForm = (): FormState => ({
  customerCode: "",
  name: "",
  customerType: String(CustomerType.WalkIn),
  status: "active",
  phone: "",
  email: "",
  address: "",
  enableCredit: false,
  creditLimit: "0",
  paymentTerms: String(SupplierPaymentTerms.Cod),
  customPaymentTerms: "",
  dueDays: "0",
  allowCheque: false,
  notes: "",
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-foreground/90">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-3.5 shadow-sm sm:p-4">
      <div className="mb-2.5 border-b border-border/60 pb-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function AccountSummary({ form }: { form: FormState }) {
  const creditLimit = form.enableCredit ? parseFloat(form.creditLimit) || 0 : 0;
  const outstanding = 0;
  const available = Math.max(0, creditLimit - outstanding);

  return (
    <aside className="rounded-xl border border-border/70 bg-muted/30 p-3.5 lg:sticky lg:top-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Account summary
      </p>
      <dl className="mt-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Outstanding</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(outstanding)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Credit limit</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(creditLimit)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Available credit</dt>
          <dd className="font-semibold tabular-nums text-amount-positive">
            {formatCurrency(available)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <dt className="text-muted-foreground">Account status</dt>
          <dd className="font-medium">{customerStatusLabel(form.status)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
        Future: ledger history, cheque/PDC tracking, overdue warnings
      </p>
    </aside>
  );
}

export function CustomerFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const creditEnabled =
    form.enableCredit || Number(form.customerType) === CustomerType.CreditAccount;

  const fetchNextCode = async () => {
    try {
      const res = await api.get<{ customerCode: string }>("/api/customers/next-code");
      setForm((f) => ({ ...f, customerCode: res.customerCode }));
    } catch {
      /* optional preview */
    }
  };

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    void fetchNextCode();
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [open]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onPaymentTermsChange = (value: string) => {
    const terms = Number(value);
    const due = defaultDueDaysForPaymentTerms(terms);
    set({
      paymentTerms: value,
      dueDays: String(due),
    });
  };

  const onCustomerTypeChange = (value: string) => {
    const isCredit = Number(value) === CustomerType.CreditAccount;
    set({
      customerType: value,
      enableCredit: isCredit ? true : form.enableCredit,
    });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const creditLimit = parseFloat(form.creditLimit);
    if (creditEnabled && (Number.isNaN(creditLimit) || creditLimit < 0)) {
      toast.error("Enter a valid credit limit");
      return;
    }

    const dueDays = parseInt(form.dueDays, 10);
    if (creditEnabled && (Number.isNaN(dueDays) || dueDays < 0)) {
      toast.error("Enter valid due days");
      return;
    }

    setSaving(true);
    try {
      const flags = customerStatusToFlags(form.status);
      await api.post("/api/customers", {
        customerCode: form.customerCode.trim() || undefined,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        customerType: Number(form.customerType),
        enableCredit: creditEnabled,
        creditLimit: creditEnabled ? creditLimit : 0,
        paymentTerms: Number(form.paymentTerms),
        dueDays: creditEnabled ? dueDays : 0,
        customPaymentTerms:
          Number(form.paymentTerms) === SupplierPaymentTerms.Custom
            ? form.customPaymentTerms.trim() || undefined
            : undefined,
        allowCheque: creditEnabled && form.allowCheque,
        ...flags,
      });
      toast.success("Customer created");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (!saving) void submit();
  };

  const paymentLabel = useMemo(() => {
    if (Number(form.paymentTerms) === SupplierPaymentTerms.Custom) {
      return form.customPaymentTerms.trim() || "Custom terms";
    }
    return (
      CUSTOMER_FORM_PAYMENT_OPTIONS.find((o) => o.value === form.paymentTerms)?.label ?? "COD"
    );
  }, [form.paymentTerms, form.customPaymentTerms]);

  return (
    <Dialog dismissible open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        scrollBody={false}
        className="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-card px-5 py-3 sm:px-6">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCircle2 className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                Add customer
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customer credit account setup for receivables, charge sales, and cheque/PDC workflows
              </p>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onKeyDown={handleKeyDown}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_220px]">
            <div className="space-y-2.5 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
              <Section
                title="Customer information"
                description="Account identity, type, and record status"
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Customer code" hint="Auto-generated account reference">
                    <div className="flex gap-2">
                      <Input
                        value={form.customerCode}
                        readOnly
                        className={cn(CUSTOMER_INPUT_CLASS, "font-mono bg-muted/40")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={() => void fetchNextCode()}
                        title="Regenerate code preview"
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Customer name / company" required>
                    <Input
                      ref={nameRef}
                      value={form.name}
                      onChange={(e) => set({ name: e.target.value })}
                      placeholder="e.g. Santos Construction Supply"
                      className={CUSTOMER_INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Customer type" required>
                    <OptionSelect
                      value={form.customerType}
                      onValueChange={onCustomerTypeChange}
                      placeholder="Select type"
                      options={CUSTOMER_FORM_TYPE_OPTIONS}
                    />
                  </Field>
                  <Field label="Status" required>
                    <OptionSelect
                      value={form.status}
                      onValueChange={(v) => set({ status: v || "active" })}
                      placeholder="Status"
                      options={CUSTOMER_FORM_STATUS_OPTIONS}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Contact information" description="Phone, email, and delivery address">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => set({ phone: e.target.value })}
                      className={CUSTOMER_INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      className={CUSTOMER_INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <textarea
                      value={form.address}
                      onChange={(e) => set({ address: e.target.value })}
                      rows={2}
                      placeholder="Billing / delivery address"
                      className={CUSTOMER_TEXTAREA_CLASS}
                    />
                  </Field>
                </div>
              </Section>

              <div className="rounded-xl border border-dashed border-border/80 bg-card/60 px-3.5 py-2.5">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={creditEnabled}
                    disabled={Number(form.customerType) === CustomerType.CreditAccount}
                    onChange={(e) => set({ enableCredit: e.target.checked })}
                    className="mt-1 rounded border-input"
                  />
                  <span>
                    <span className="text-sm font-medium">Enable credit account</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Allows charge sales, receivables tracking, and credit limit enforcement
                    </span>
                  </span>
                </label>
              </div>

              {creditEnabled ? (
                <Section
                  title="Credit settings"
                  description={`Payment terms: ${paymentLabel}`}
                >
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field
                      label="Credit limit"
                      required
                      hint="Maximum outstanding balance allowed for this customer"
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ₱
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.creditLimit}
                          onChange={(e) => set({ creditLimit: e.target.value })}
                          className={cn(CUSTOMER_INPUT_CLASS, "pl-7 tabular-nums")}
                        />
                      </div>
                    </Field>
                    <Field label="Payment terms" required>
                      <OptionSelect
                        value={form.paymentTerms}
                        onValueChange={onPaymentTermsChange}
                        placeholder="Payment terms"
                        options={CUSTOMER_FORM_PAYMENT_OPTIONS}
                      />
                    </Field>
                    {Number(form.paymentTerms) === SupplierPaymentTerms.Custom ? (
                      <Field label="Custom terms" className="sm:col-span-2">
                        <Input
                          value={form.customPaymentTerms}
                          onChange={(e) => set({ customPaymentTerms: e.target.value })}
                          placeholder="Describe negotiated payment terms"
                          className={CUSTOMER_INPUT_CLASS}
                        />
                      </Field>
                    ) : null}
                    <Field label="Due days" hint="Days until payment is due from invoice date">
                      <Input
                        type="number"
                        min={0}
                        value={form.dueDays}
                        onChange={(e) => set({ dueDays: e.target.value })}
                        className={cn(CUSTOMER_INPUT_CLASS, "tabular-nums")}
                      />
                    </Field>
                    <Field label="Cheque / PDC">
                      <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                        <CreditCard className="size-3.5 text-muted-foreground" />
                        <input
                          type="checkbox"
                          checked={form.allowCheque}
                          onChange={(e) => set({ allowCheque: e.target.checked })}
                          className="rounded border-input"
                        />
                        Allow cheque transactions
                      </label>
                    </Field>
                  </div>
                </Section>
              ) : null}

              <Section title="Notes" description="Agreements, delivery, and payment remarks">
                <textarea
                  value={form.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  rows={3}
                  placeholder="Contractor agreements, delivery instructions, payment notes…"
                  className={CUSTOMER_TEXTAREA_CLASS}
                />
              </Section>
            </div>

            <div className="hidden border-l bg-muted/10 p-3.5 lg:block">
              <AccountSummary form={form} />
            </div>
          </div>

          <DialogFooter
            showCloseButton={false}
            className="shrink-0 border-t bg-card px-4 py-2.5 sm:px-5"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
