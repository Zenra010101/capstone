"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { invalidateReference, ReferenceKeys } from "@/lib/reference-cache";
import type { StoreSettings } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArchiveSettingsCard } from "@/components/settings/archive-settings-card";
import { ReceiptHeaderPreview } from "@/components/settings/receipt-header-preview";
import { RECEIPT_PAPER_OPTIONS } from "@/lib/receipt-paper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<StoreSettings>("/api/settings")
      .then((s) =>
        setSettings({
          ...s,
          receiptPaperSize: s.receiptPaperSize ?? "A5",
        })
      )
      .catch(console.error);
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.put<StoreSettings>("/api/settings", settings);
      setSettings(updated);
      invalidateReference(ReferenceKeys.settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div>
        <PageHeader title="Store settings" description="Receipt header, tax, and operations" />
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <Skeleton className="h-72 w-full rounded-lg" />
          </div>
          <div className="space-y-4 xl:col-span-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const vatPercent = (settings.vatRate * 100).toFixed(0);

  return (
    <div>
      <PageHeader
        title="Store settings"
        description="Receipt header, tax, POS options, and data archive (Owner)"
        action={
          isOwner ? (
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save all settings"}
            </Button>
          ) : undefined
        }
      />

      {!isOwner && (
        <Card className="mb-6 border-border bg-muted/40 shadow-erp">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Only the Owner can change settings. You can view current options below.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-6 lg:col-span-1 xl:col-span-3">
          <Card className="shadow-erp">
            <CardHeader>
              <CardTitle className="text-base">Receipt / store header</CardTitle>
              <p className="text-xs font-normal text-muted-foreground">
                Printed on sales receipts and trust agreements
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Outlet line</Label>
                <Input
                  value={settings.outletLine}
                  onChange={(e) =>
                    setSettings({ ...settings, outletLine: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Brand line</Label>
                <Input
                  value={settings.brandLine}
                  onChange={(e) =>
                    setSettings({ ...settings, brandLine: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Tagline</Label>
                <Input
                  value={settings.tagline}
                  onChange={(e) =>
                    setSettings({ ...settings, tagline: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Company name</Label>
                <Input
                  value={settings.storeName}
                  onChange={(e) =>
                    setSettings({ ...settings, storeName: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label>Charge receipt title</Label>
                <Input
                  value={settings.trustReceiptTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, trustReceiptTitle: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label>Cash sale receipt title</Label>
                <Input
                  value={settings.cashReceiptTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, cashReceiptTitle: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1 xl:col-span-2 lg:sticky lg:top-4 lg:self-start">
          <ReceiptHeaderPreview settings={settings} />

          <Card className="shadow-erp">
            <CardHeader>
              <CardTitle className="text-base">Receipt printing</CardTitle>
              <p className="text-xs font-normal text-muted-foreground">
                Paper-saving mode for POS sales receipts
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECEIPT_PAPER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="receiptPaperSize"
                    className="mt-0.5"
                    checked={(settings.receiptPaperSize ?? "A5") === option.value}
                    onChange={() =>
                      setSettings({ ...settings, receiptPaperSize: option.value })
                    }
                    disabled={!isOwner}
                  />
                  <span>
                    {option.label}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-erp">
            <CardHeader>
              <CardTitle className="text-base">Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border"
                  checked={settings.allowCashierBarcodePrinting}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowCashierBarcodePrinting: e.target.checked,
                    })
                  }
                  disabled={!isOwner}
                />
                <span>
                  Allow cashiers to print product barcodes
                  <span className="block text-xs text-muted-foreground">
                    When enabled, cashiers can use single and bulk barcode printing from
                    Products.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-erp">
            <CardHeader>
              <CardTitle className="text-base">VAT / tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={settings.vatEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, vatEnabled: e.target.checked })
                  }
                  disabled={!isOwner}
                />
                Enable VAT on sales at POS
              </label>

              <div className="space-y-2">
                <Label>VAT rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={vatPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      vatRate: Math.min(
                        1,
                        Math.max(0, parseFloat(e.target.value || "0") / 100)
                      ),
                    })
                  }
                  disabled={!isOwner || !settings.vatEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  Philippines standard VAT is 12%
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border"
                  checked={settings.pricesIncludeVat}
                  onChange={(e) =>
                    setSettings({ ...settings, pricesIncludeVat: e.target.checked })
                  }
                  disabled={!isOwner || !settings.vatEnabled}
                />
                <span>
                  Prices include VAT
                  <span className="block text-xs text-muted-foreground">
                    Off = VAT added on top at checkout
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      {isOwner && <ArchiveSettingsCard />}
    </div>
  );
}
