export interface ReportPrintStamp {
  generatedAt: string;
  printedAtLabel: string;
  printedDateLabel: string;
  printedAtPreciseLabel?: string;
}

/** Server-generated print timestamp (Asia/Manila). Read-only — never set client-side. */
export async function fetchPrintStamp(): Promise<ReportPrintStamp> {
  const { api } = await import("@/lib/api");
  return api.get<ReportPrintStamp>("/api/reports/print-stamp");
}
