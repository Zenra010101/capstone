function toDateInputFromParts(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function toStoreDateInputValue(date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return toDateInputFromParts(formatter.formatToParts(date));
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function defaultReportRange(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: toStoreDateInputValue(from),
    to: toStoreDateInputValue(to),
  };
}

/** Root `from`/`to` for legacy report endpoints and list APIs (audit, inventory, etc.). */
export function reportQueryParams(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params.toString();
}

/** `filter.from`/`filter.to` for unified reports (`ReportQueryFilter` model binding). */
export function unifiedReportFilterParams(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("filter.from", from);
  if (to) params.set("filter.to", to);
  return params.toString();
}
