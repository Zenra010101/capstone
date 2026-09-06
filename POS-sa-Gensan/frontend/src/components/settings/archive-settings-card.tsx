"use client";

import { useEffect, useState } from "react";
import { Archive, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ArchiveResult {
  salesArchived: number;
  returnsArchived: number;
  receivingsArchived: number;
  receivablesArchived: number;
  auditLogsArchived: number;
}

function defaultBeforeDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

function presetYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function ArchiveSettingsCard() {
  const [beforeDate, setBeforeDate] = useState(defaultBeforeDate);
  const [includeSales, setIncludeSales] = useState(true);
  const [includeReturns, setIncludeReturns] = useState(true);
  const [includeReceivings, setIncludeReceivings] = useState(true);
  const [includeReceivables, setIncludeReceivables] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<ArchiveResult | null>(null);
  const [lastResult, setLastResult] = useState<ArchiveResult | null>(null);

  const archivePayload = {
    beforeDate: `${beforeDate}T00:00:00.000Z`,
    includeSales,
    includeReturns,
    includeReceivings,
    includeReceivables,
    includeAuditLogs,
  };

  useEffect(() => {
    if (!confirmOpen) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    void api
      .post<ArchiveResult>("/api/archive/preview", archivePayload)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    confirmOpen,
    beforeDate,
    includeSales,
    includeReturns,
    includeReceivings,
    includeReceivables,
    includeAuditLogs,
  ]);

  const previewTotal = preview
    ? preview.salesArchived +
      preview.returnsArchived +
      preview.receivingsArchived +
      preview.receivablesArchived +
      preview.auditLogsArchived
    : 0;

  const anySelected =
    includeSales ||
    includeReturns ||
    includeReceivings ||
    includeReceivables ||
    includeAuditLogs;

  const runArchive = async () => {
    setRunning(true);
    try {
      const result = await api.post<ArchiveResult>("/api/archive", archivePayload);
      setLastResult(result);
      setConfirmOpen(false);
      const total =
        result.salesArchived +
        result.returnsArchived +
        result.receivingsArchived +
        result.receivablesArchived +
        result.auditLogsArchived;
      if (total === 0) {
        toast.message("No matching unarchived records for that date");
      } else {
        toast.success(`Archived ${total} record(s) — nothing was deleted`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Archive failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Card className="mt-6 border-amber-200/80 shadow-erp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="h-4 w-4 text-amber-700" />
            Data archive (soft)
          </CardTitle>
          <CardDescription>
            Mark older records as archived to keep daily screens fast. Data stays in the
            database for reports, search, and exports when you enable{" "}
            <strong>Include archived</strong> on Reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This does <strong>not</strong> delete sales, inventory history, tax records,
              or audit trails. It only sets <code className="text-xs">IsArchived</code> so
              default lists and dashboards skip old rows.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Archive records before</Label>
            <Input
              type="date"
              className="w-44"
              value={beforeDate}
              onChange={(e) => setBeforeDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Everything with a date strictly before this day (UTC) in the selected
              categories will be archived.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBeforeDate(presetYearsAgo(1))}
              >
                1 year ago
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBeforeDate(presetYearsAgo(3))}
              >
                3 years ago
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBeforeDate(presetYearsAgo(5))}
              >
                5 years ago
              </Button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Include in this run</legend>
            <ArchiveCheckbox
              label="Sales transactions"
              checked={includeSales}
              onChange={setIncludeSales}
            />
            <ArchiveCheckbox
              label="Goods return slips (GRS)"
              checked={includeReturns}
              onChange={setIncludeReturns}
            />
            <ArchiveCheckbox
              label="Stock receiving records"
              checked={includeReceivings}
              onChange={setIncludeReceivings}
            />
            <ArchiveCheckbox
              label="Receivables / Charge accounts"
              checked={includeReceivables}
              onChange={setIncludeReceivables}
            />
            <ArchiveCheckbox
              label="Audit log entries"
              checked={includeAuditLogs}
              onChange={setIncludeAuditLogs}
              hint="Usually keep recent audit logs unarchived unless storage is tight."
            />
          </fieldset>

          <Button
            variant="secondary"
            disabled={!anySelected}
            onClick={() => setConfirmOpen(true)}
          >
            Review &amp; archive...
          </Button>

          {lastResult && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Last archive run</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {lastResult.salesArchived > 0 && (
                  <li>Sales: {lastResult.salesArchived}</li>
                )}
                {lastResult.returnsArchived > 0 && (
                  <li>Returns (GRS): {lastResult.returnsArchived}</li>
                )}
                {lastResult.receivingsArchived > 0 && (
                  <li>Stock receiving: {lastResult.receivingsArchived}</li>
                )}
                {lastResult.receivablesArchived > 0 && (
                  <li>Receivables: {lastResult.receivablesArchived}</li>
                )}
                {lastResult.auditLogsArchived > 0 && (
                  <li>Audit logs: {lastResult.auditLogsArchived}</li>
                )}
                {lastResult.salesArchived === 0 &&
                  lastResult.returnsArchived === 0 &&
                  lastResult.receivingsArchived === 0 &&
                  lastResult.receivablesArchived === 0 &&
                  lastResult.auditLogsArchived === 0 && (
                    <li>No matching unarchived records found for that date.</li>
                  )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm archive</DialogTitle>
            <DialogDescription>
              Mark selected record types created or dated before{" "}
              <strong>{beforeDate}</strong> as archived? This cannot be undone from the UI
              (records remain in the database).
            </DialogDescription>
          </DialogHeader>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {includeSales && <li>Sales transactions</li>}
            {includeReturns && <li>Goods return slips</li>}
            {includeReceivings && <li>Stock receiving</li>}
            {includeReceivables && <li>Receivables</li>}
            {includeAuditLogs && <li>Audit logs</li>}
          </ul>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            {previewLoading ? (
              <p className="text-muted-foreground">Counting matching records...</p>
            ) : preview ? (
              previewTotal === 0 ? (
                <p className="text-muted-foreground">
                  No unarchived records match this cutoff. If your live data is newer than{" "}
                  <strong>{beforeDate}</strong>, that is expected — nothing will change.
                </p>
              ) : (
                <>
                  <p className="font-medium">{previewTotal} record(s) will be archived:</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {includeSales && preview.salesArchived > 0 && (
                      <li>Sales: {preview.salesArchived}</li>
                    )}
                    {includeReturns && preview.returnsArchived > 0 && (
                      <li>Returns (GRS): {preview.returnsArchived}</li>
                    )}
                    {includeReceivings && preview.receivingsArchived > 0 && (
                      <li>Stock receiving: {preview.receivingsArchived}</li>
                    )}
                    {includeReceivables && preview.receivablesArchived > 0 && (
                      <li>Receivables: {preview.receivablesArchived}</li>
                    )}
                    {includeAuditLogs && preview.auditLogsArchived > 0 && (
                      <li>Audit logs: {preview.auditLogsArchived}</li>
                    )}
                  </ul>
                </>
              )
            ) : (
              <p className="text-muted-foreground">Could not load preview counts.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={runArchive}
              disabled={running || previewLoading || (preview !== null && previewTotal === 0)}
            >
              {running ? "Archiving..." : "Archive records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ArchiveCheckbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
        )}
      </span>
    </label>
  );
}
