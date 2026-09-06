import QRCode from "qrcode";
import type { SalesSummaryReport } from "@/lib/types";

function qrPayloadFromReport(report: SalesSummaryReport): string | null {
  const url = report.verificationUrl?.trim();
  if (url && /^https?:\/\//i.test(url)) return url;

  const text = report.verificationQrText?.trim();
  if (text && /^https?:\/\//i.test(text)) return text;

  const json = report.verificationQrPayload?.trim();
  if (json) return json;

  return null;
}

/** Build a data URL for the verification QR before opening the print dialog. */
export async function buildSalesReportQrDataUrl(
  report: SalesSummaryReport
): Promise<string | null> {
  if (report.verificationQrPngBase64?.trim()) {
    return `data:image/png;base64,${report.verificationQrPngBase64.trim()}`;
  }

  const payload = qrPayloadFromReport(report);
  if (!payload) return null;

  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "Q",
  });
}
