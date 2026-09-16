"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, downloadExport } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import {
  buildCashierDayOptions,
  cashierSalesSummaryQuery,
  SALES_REPORT_PRESETS,
  salesSummaryQuery,
  type SalesReportPreset,
} from "@/lib/sales-report-presets";
import { CASHIER_SALES_LOOKBACK_DAYS } from "@/lib/sales-retention";
import type { SalesSummaryReport, StoreSettings } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { SalesSummaryReportPrint } from "@/components/sales/sales-summary-report-print";
import { SalesSummaryReportTable } from "@/components/sales/sales-summary-report-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSalesReportQrDataUrl } from "@/lib/sales-report-qr";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { waitForSalesReportPrintReady } from "@/lib/wait-for-print-qr";

export default function SalesReportPage() {
  const { isRole, user } = useAuth();
  const isOwner = isRole("Owner");
  const cashierDayOptions = useMemo(
    () => buildCashierDayOptions(CASHIER_SALES_LOOKBACK_DAYS),
    []
  );
  const [preset, setPreset] = useState<SalesReportPreset>("today");
  const [cashierDayIso, setCashierDayIso] = useState(
    () => cashierDayOptions[0]?.isoDate ?? ""
  );
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState<SalesSummaryReport | null>(null);
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activePreset = SALES_REPORT_PRESETS.find((p) => p.id === preset)!;

  const reportQueryString = useCallback(() => {
    if (!isOwner) {
      return cashierSalesSummaryQuery(cashierDayIso);
    }
    return salesSummaryQuery(activePreset.apiPreset, customFrom, customTo);
  }, [activePreset.apiPreset, cashierDayIso, customFrom, customTo, isOwner]);

  const reportFileSlug = useCallback(() => {
    if (!isOwner) return cashierDayIso || "day";
    return activePreset.apiPreset;
  }, [activePreset.apiPreset, cashierDayIso, isOwner]);

  useEffect(() => {
    cachedGet(ReferenceKeys.settings, REFERENCE_TTL_MS, () =>
      api.get<StoreSettings>("/api/settings")
    ).then(setStoreSettings).catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    if (isOwner && preset === "custom" && (!customFrom || !customTo)) {
      toast.error("Select start and end dates");
      return;
    }
    if (!isOwner && !cashierDayIso) {
      toast.error("Select a report date");
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SalesSummaryReport>(
        `/api/reports/sales-summary?${reportQueryString()}`
      );
      setReport({ ...data, lines: data.lines ?? [] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [cashierDayIso, customFrom, customTo, isOwner, preset, reportQueryString]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const exportPdf = async () => {
    if (isOwner && preset === "custom" && (!customFrom || !customTo)) {
      toast.error("Select start and end dates");
      return;
    }
    if (!isOwner && !cashierDayIso) {
      toast.error("Select a report date");
      return;
    }
    try {
      const q = new URLSearchParams(reportQueryString());
      q.set("format", "pdf");
      q.set("verifyBaseUrl", window.location.origin);
      await downloadExport(
        `/api/reports/sales-summary/export?${q}`,
        `sales-summary-${reportFileSlug()}.pdf`
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Export failed");
    }
  };

  const printReport = async () => {
    if (isOwner && preset === "custom" && (!customFrom || !customTo)) {
      toast.error("Select start and end dates");
      return;
    }
    if (!isOwner && !cashierDayIso) {
      toast.error("Select a report date");
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams(reportQueryString());
      q.set("verify", "true");
      q.set("verifyBaseUrl", window.location.origin);
      const data = await api.get<SalesSummaryReport>(`/api/reports/sales-summary?${q}`);
      const qrDataUrl = await buildSalesReportQrDataUrl(data);
      flushSync(() => {
        setPrintQrDataUrl(qrDataUrl);
        setReport({ ...data, lines: data.lines ?? [] });
      });
      await waitForSalesReportPrintReady();
      window.print();
      setPrintQrDataUrl(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to prepare print");
    } finally {
      setLoading(false);
    }
  };

  const storeName =
    report?.storeName?.trim() ||
    storeSettings?.storeName?.trim() ||
    "GensanPOS";
  const storeAddress = report?.storeAddress?.trim() || storeSettings?.address?.trim();
  const printedBy = user?.fullName?.trim() || user?.role || "Owner";

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Daily sales report"
          description={
            isOwner
              ? "Print or save line-item sales in your daily report format"
              : `Print or save daily sales for today or any day in the last ${CASHIER_SALES_LOOKBACK_DAYS} days`
          }
        />

        <Card className="mb-6 shadow-erp">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOwner ? (
              <div className="flex flex-wrap gap-2">
                {SALES_REPORT_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={preset === p.id ? "default" : "outline"}
                    onClick={() => setPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Select a day (cashiers can view the last {CASHIER_SALES_LOOKBACK_DAYS} days only).
                </p>
                <div className="flex flex-wrap gap-2">
                  {cashierDayOptions.map((day) => (
                    <Button
                      key={day.isoDate}
                      type="button"
                      size="sm"
                      variant={cashierDayIso === day.isoDate ? "default" : "outline"}
                      onClick={() => setCashierDayIso(day.isoDate)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {preset === "custom" && isOwner ? (
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button type="button" onClick={() => void loadReport()} disabled={loading}>
                  Apply range
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => void loadReport()} disabled={loading}>
                Refresh
              </Button>
              <Button type="button" variant="outline" onClick={printReport} disabled={!report || loading}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button type="button" onClick={() => void exportPdf()} disabled={!report || loading}>
                <FileDown className="mr-2 h-4 w-4" />
                Save as PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {report ? (
          <Card className="shadow-erp">
            <CardHeader>
              <CardTitle className="text-lg">{report.periodLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Printed {report.printedAtLabel}
                <span className="text-xs"> · system timestamp (read-only)</span>
                {report.preparedFor ? ` · ${report.preparedFor}` : user?.fullName ? ` · ${user.fullName}` : ""}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Total sales (gross)" value={formatCurrency(report.grossSales)} />
                <Metric label="Transactions" value={report.transactionCount.toLocaleString()} />
                <Metric label="Returns / exchanges" value={formatCurrency(report.totalReturns)} />
                <Metric label="Net sales" value={formatCurrency(report.netSales)} large />
              </dl>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Line items — net of returns ({report.lines.length})
                </p>
                <SalesSummaryReportTable report={report} />
              </div>
              <p className="text-xs text-muted-foreground">
                Summary: gross invoice totals ({formatCurrency(report.grossSales)}) minus returns (
                {formatCurrency(report.totalReturns)}) = net sales ({formatCurrency(report.netSales)}).
                The table NET TOTAL should match net sales. Use Print or Save as PDF for the
                official report with verification QR, timestamp, and signature lines.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-erp">
            <CardContent className="py-12 text-center text-muted-foreground">
              {loading ? "Loading report…" : "No report data"}
            </CardContent>
          </Card>
        )}
      </div>

      {mounted && report
        ? createPortal(
            <SalesSummaryReportPrint
              report={report}
              storeName={storeName}
              storeAddress={storeAddress}
              printedBy={printedBy}
              qrDataUrl={printQrDataUrl}
            />,
            document.body
          )
        : null}
    </>
  );
}

function Metric({
  label,
  value,
  large,
  className,
}: {
  label: string;
  value: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-semibold tabular-nums ${large ? "text-2xl text-primary" : "text-lg"}`}>
        {value}
      </dd>
    </div>
  );
}
