"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { SupplierContact, SupplierDetail, SupplierListItem } from "@/lib/types";
import {
  SupplierContactRole,
  SupplierPaymentTerms,
  SupplierStatus,
} from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { cn } from "@/lib/utils";
import {
  SUPPLIER_CONTACT_ROLE_OPTIONS,
  SUPPLIER_EDIT_STATUS_OPTIONS,
  SUPPLIER_FORM_PAYMENT_OPTIONS,
  SUPPLIER_FORM_STATUS_OPTIONS,
  SUPPLIER_INPUT_CLASS,
  SUPPLIER_TEXTAREA_CLASS,
} from "./supplier-form-utils";

const emptyContact = (): SupplierContact => ({
  name: "",
  role: SupplierContactRole.General,
  phone: "",
  email: "",
  isPrimary: false,
});

type FormState = {
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  customPaymentTerms: string;
  notes: string;
  deliveryNotes: string;
  supplierRemarks: string;
  status: string;
};

const emptyForm = (): FormState => ({
  supplierCode: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  paymentTerms: String(SupplierPaymentTerms.Cod),
  customPaymentTerms: "",
  notes: "",
  deliveryNotes: "",
  supplierRemarks: "",
  status: String(SupplierStatus.Active),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SupplierListItem | SupplierDetail | null;
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

function SummaryPreview({ form }: { form: FormState }) {
  const paymentLabel =
    Number(form.paymentTerms) === SupplierPaymentTerms.Custom
      ? form.customPaymentTerms.trim() || "Custom terms"
      : SUPPLIER_FORM_PAYMENT_OPTIONS.find((o) => o.value === form.paymentTerms)?.label ?? "—";

  return (
    <aside className="rounded-xl border border-border/70 bg-muted/30 p-3.5 lg:sticky lg:top-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Supplier preview
      </p>
      <div className="mt-2.5 space-y-2 text-sm">
        <p className="font-semibold leading-snug">
          {form.name.trim() || "New supplier name"}
        </p>
        {form.supplierCode ? (
          <p className="font-mono text-xs text-muted-foreground">{form.supplierCode}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <SupplierStatusBadge
            status={Number(form.status) as SupplierStatus}
          />
        </div>
        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Payment terms</dt>
            <dd className="font-medium">{paymentLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Primary contact</dt>
            <dd className="font-medium">
              {form.contactPerson.trim() || "—"}
              {form.phone.trim() ? (
                <span className="block text-muted-foreground">{form.phone.trim()}</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
        Future: lead time, categories, procurement history, linked receivings
      </p>
    </aside>
  );
}

export function SupplierFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [expandedContacts, setExpandedContacts] = useState<Record<number, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editing;
  const statusOptions = isEdit ? SUPPLIER_EDIT_STATUS_OPTIONS : SUPPLIER_FORM_STATUS_OPTIONS;

  const fetchNextCode = async () => {
    try {
      const res = await api.get<{ supplierCode: string }>("/api/suppliers/next-code");
      setForm((f) => ({ ...f, supplierCode: res.supplierCode }));
    } catch {
      /* preview optional */
    }
  };

  useEffect(() => {
    if (!open) return;

    if (!editing) {
      setForm(emptyForm());
      setContacts([]);
      setExpandedContacts({});
      void fetchNextCode();
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const detail = await api.get<SupplierDetail>(`/api/suppliers/${editing.id}`);
        setForm({
          supplierCode: detail.supplierCode ?? "",
          name: detail.name,
          contactPerson: detail.contactPerson ?? "",
          phone: detail.phone ?? "",
          email: detail.email ?? "",
          address: detail.address ?? "",
          paymentTerms: String(detail.paymentTerms),
          customPaymentTerms: detail.customPaymentTerms ?? "",
          notes: detail.notes ?? "",
          deliveryNotes: detail.deliveryNotes ?? "",
          supplierRemarks: detail.supplierRemarks ?? "",
          status: String(detail.status),
        });
        setContacts(
          detail.contacts.map((c) => ({
            name: c.name,
            role: c.role,
            phone: c.phone ?? "",
            email: c.email ?? "",
            isPrimary: c.isPrimary,
          }))
        );
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load supplier");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, editing]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const buildPayload = () => ({
    supplierCode: form.supplierCode.trim() || undefined,
    name: form.name.trim(),
    contactPerson: form.contactPerson.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    address: form.address.trim() || undefined,
    paymentTerms: Number(form.paymentTerms),
    customPaymentTerms:
      Number(form.paymentTerms) === SupplierPaymentTerms.Custom
        ? form.customPaymentTerms.trim() || undefined
        : undefined,
    notes: form.notes.trim() || undefined,
    deliveryNotes: form.deliveryNotes.trim() || undefined,
    supplierRemarks: form.supplierRemarks.trim() || undefined,
    status: Number(form.status),
    contacts: contacts
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        role: c.role,
        phone: c.phone?.trim() || undefined,
        email: c.email?.trim() || undefined,
        isPrimary: c.isPrimary,
      })),
  });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/suppliers/${editing.id}`, buildPayload());
        toast.success("Supplier updated");
      } else {
        await api.post("/api/suppliers", buildPayload());
        toast.success("Supplier created");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (!saving && !loading) void submit();
  };

  const toggleContactExpanded = (index: number) => {
    setExpandedContacts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const setPrimaryContact = (index: number, checked: boolean) => {
    setContacts((prev) =>
      prev.map((c, i) => ({
        ...c,
        isPrimary: i === index ? checked : false,
      }))
    );
  };

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
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight sm:text-lg">
                {isEdit ? "Edit supplier" : "Add supplier"}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Procurement and warehouse sourcing profile for receiving and traceability
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading supplier…</p>
        ) : (
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
                  title="Supplier information"
                  description="Identity, status, and procurement terms"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="Supplier code" hint="Auto-generated procurement reference">
                      <div className="flex gap-2">
                        <Input
                          value={form.supplierCode}
                          readOnly
                          className={cn(SUPPLIER_INPUT_CLASS, "font-mono bg-muted/40")}
                        />
                        {!isEdit ? (
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
                        ) : null}
                      </div>
                    </Field>
                    <Field label="Supplier name" required>
                      <Input
                        ref={nameRef}
                        value={form.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder="e.g. Metro Steel Trading"
                        className={SUPPLIER_INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Status" required>
                      <OptionSelect
                        value={form.status}
                        onValueChange={(v) =>
                          set({ status: v || String(SupplierStatus.Active) })
                        }
                        placeholder="Status"
                        options={statusOptions}
                      />
                    </Field>
                    <Field label="Payment terms" required>
                      <OptionSelect
                        value={form.paymentTerms}
                        onValueChange={(v) =>
                          set({ paymentTerms: v || String(SupplierPaymentTerms.Cod) })
                        }
                        placeholder="Payment terms"
                        options={SUPPLIER_FORM_PAYMENT_OPTIONS}
                      />
                    </Field>
                    {Number(form.paymentTerms) === SupplierPaymentTerms.Custom ? (
                      <Field label="Custom terms" className="sm:col-span-2">
                        <Input
                          value={form.customPaymentTerms}
                          onChange={(e) => set({ customPaymentTerms: e.target.value })}
                          placeholder="Describe negotiated payment terms"
                          className={SUPPLIER_INPUT_CLASS}
                        />
                      </Field>
                    ) : null}
                  </div>
                </Section>

                <Section
                  title="Primary contact"
                  description="Main warehouse / procurement point of contact"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="Contact person">
                      <Input
                        value={form.contactPerson}
                        onChange={(e) => set({ contactPerson: e.target.value })}
                        className={SUPPLIER_INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={form.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                        className={SUPPLIER_INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Email" className="sm:col-span-2">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => set({ email: e.target.value })}
                        className={SUPPLIER_INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Address" className="sm:col-span-2">
                      <textarea
                        value={form.address}
                        onChange={(e) => set({ address: e.target.value })}
                        rows={2}
                        placeholder="Warehouse, office, or delivery address"
                        className={SUPPLIER_TEXTAREA_CLASS}
                      />
                    </Field>
                  </div>
                </Section>

                <Section
                  title="Procurement notes"
                  description="Operational context for receiving and purchasing"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Field label="Notes" hint="General procurement notes">
                      <textarea
                        value={form.notes}
                        onChange={(e) => set({ notes: e.target.value })}
                        rows={2}
                        className={SUPPLIER_TEXTAREA_CLASS}
                        placeholder="Ordering preferences, account manager, etc."
                      />
                    </Field>
                    <Field label="Delivery notes" hint="Receiving / logistics remarks">
                      <textarea
                        value={form.deliveryNotes}
                        onChange={(e) => set({ deliveryNotes: e.target.value })}
                        rows={2}
                        className={SUPPLIER_TEXTAREA_CLASS}
                        placeholder="Dock hours, pallet rules, seal requirements…"
                      />
                    </Field>
                    <Field label="Supplier remarks" className="sm:col-span-2">
                      <textarea
                        value={form.supplierRemarks}
                        onChange={(e) => set({ supplierRemarks: e.target.value })}
                        rows={2}
                        className={SUPPLIER_TEXTAREA_CLASS}
                        placeholder="Quality issues, lead time patterns, special handling…"
                      />
                    </Field>
                  </div>
                </Section>

                <Section
                  title="Additional contacts"
                  description="Sales, accounting, warehouse, and backup contacts"
                >
                  {contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No additional contacts yet. Add contacts for sales, accounting, or warehouse
                      coordination.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((c, i) => {
                        const expanded = expandedContacts[i] !== false;
                        const roleLabel =
                          SUPPLIER_CONTACT_ROLE_OPTIONS.find((o) => Number(o.value) === c.role)
                            ?.label ?? "General";

                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-lg border bg-muted/20 transition-colors",
                              c.isPrimary
                                ? "border-primary/40 ring-1 ring-primary/15"
                                : "border-border/70"
                            )}
                          >
                            <div className="flex items-center gap-2 px-3 py-2">
                              <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() => toggleContactExpanded(i)}
                              >
                                <p className="truncate text-sm font-medium">
                                  {c.name.trim() || "Unnamed contact"}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {roleLabel}
                                  {c.phone ? ` · ${c.phone}` : ""}
                                </p>
                              </button>
                              {c.isPrimary ? (
                                <Badge
                                  variant="outline"
                                  className="h-5 shrink-0 gap-1 border-primary/30 bg-primary/5 text-[10px] text-primary"
                                >
                                  <Star className="size-3 fill-current" />
                                  Primary
                                </Badge>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => toggleContactExpanded(i)}
                              >
                                {expanded ? (
                                  <ChevronUp className="size-3.5" />
                                ) : (
                                  <ChevronDown className="size-3.5" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  setContacts((prev) => prev.filter((_, j) => j !== i))
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                            {expanded ? (
                              <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input
                                    placeholder="Full name"
                                    value={c.name}
                                    onChange={(e) => {
                                      const next = [...contacts];
                                      next[i] = { ...next[i], name: e.target.value };
                                      setContacts(next);
                                    }}
                                    className={SUPPLIER_INPUT_CLASS}
                                  />
                                  <OptionSelect
                                    value={String(c.role)}
                                    onValueChange={(v) => {
                                      const next = [...contacts];
                                      next[i] = {
                                        ...next[i],
                                        role: Number(v) as SupplierContactRole,
                                      };
                                      setContacts(next);
                                    }}
                                    placeholder="Role"
                                    options={SUPPLIER_CONTACT_ROLE_OPTIONS}
                                  />
                                  <Input
                                    placeholder="Phone"
                                    value={c.phone ?? ""}
                                    onChange={(e) => {
                                      const next = [...contacts];
                                      next[i] = { ...next[i], phone: e.target.value };
                                      setContacts(next);
                                    }}
                                    className={SUPPLIER_INPUT_CLASS}
                                  />
                                  <Input
                                    placeholder="Email"
                                    type="email"
                                    value={c.email ?? ""}
                                    onChange={(e) => {
                                      const next = [...contacts];
                                      next[i] = { ...next[i], email: e.target.value };
                                      setContacts(next);
                                    }}
                                    className={SUPPLIER_INPUT_CLASS}
                                  />
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={c.isPrimary}
                                    onChange={(e) => setPrimaryContact(i, e.target.checked)}
                                    className="rounded border-input"
                                  />
                                  Mark as primary alternate contact
                                </label>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setContacts((prev) => [...prev, emptyContact()]);
                      setExpandedContacts((prev) => ({
                        ...prev,
                        [contacts.length]: true,
                      }));
                    }}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add contact
                  </Button>
                </Section>
              </div>

              <div className="hidden border-l bg-muted/10 p-3.5 lg:block">
                <SummaryPreview form={form} />
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
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Saving…" : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
