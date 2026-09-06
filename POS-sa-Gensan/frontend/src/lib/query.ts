/**
 * Build a URL query string from a params object.
 *
 * Skips `undefined`, `null`, `false`, and empty-string values so callers can
 * pass optional filters inline. `true` serializes to "true"; numbers and
 * strings serialize via `String()`.
 *
 * Shared by list/filter pages (returns, receivables, ledger, …) that previously
 * each defined their own local copy of this helper.
 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false || value === "") {
      return;
    }
    q.set(key, value === true ? "true" : String(value));
  });
  return q.toString();
}
