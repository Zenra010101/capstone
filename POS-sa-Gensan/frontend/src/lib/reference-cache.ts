/**
 * Lightweight, session-level cache for REFERENCE data only.
 *
 * Intended strictly for slowly-changing dropdown / lookup lists:
 *   - categories
 *   - store settings
 *   - users
 *
 * NOT for transactional or financial data (sales, inventory, stock levels,
 * receivables, audit logs, approvals) — never route those through this.
 *
 * Behavior:
 *   - In-memory (per browser tab); cleared on full page reload.
 *   - Caches the in-flight promise, so concurrent callers share one request
 *     (request de-duplication) and repeat calls within the TTL reuse the result.
 *   - Failures are never cached.
 *   - Callers invalidate on mutation via `invalidateReference(keyPrefix)` so the
 *     same session never sees stale reference data after an edit.
 */

type CacheRecord = { promise: Promise<unknown>; expires: number };

const cache = new Map<string, CacheRecord>();

/** Default TTL for reference lists. */
export const REFERENCE_TTL_MS = 60_000;

export function cachedGet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expires > now) {
    return existing.promise as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fetcher();
    } catch (err) {
      // Never cache failures — drop so the next caller retries.
      cache.delete(key);
      throw err;
    }
  })();

  cache.set(key, { promise, expires: now + ttlMs });
  return promise;
}

/**
 * Invalidate cached reference data. Pass a key prefix to clear a family of
 * entries (e.g. "categories"), or nothing to clear everything.
 */
export function invalidateReference(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

/** Stable cache keys so callers and invalidators stay in sync. */
export const ReferenceKeys = {
  categoriesActive: "categories:withActiveProductsOnly=true",
  categoriesAll: "categories:all",
  settings: "settings",
  users: "users",
} as const;

/** Prefix that matches every "categories:*" entry, for bulk invalidation. */
export const CATEGORY_KEY_PREFIX = "categories";
