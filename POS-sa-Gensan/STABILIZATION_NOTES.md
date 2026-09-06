# GensanPOS — Stabilization Notes

Living record of the stabilization / refactoring / UI-UX polishing effort.
Scope rule throughout: **stabilize, clean, optimize, and improve UX/maintainability
without changing business logic, DB schema, or API contracts** unless explicitly approved.

## Git baseline, branches & tags

| Ref | Meaning |
|---|---|
| `pre-phase-d-baseline` (tag) | Pre-stabilization production code — rollback baseline |
| `phase-d-release` (tag) | Cumulative Phases A–D (frontend stabilization) deployed to production |
| `audit-hotfix-release` (tag) | Audit logs UTC date-filter hotfix (backend) deployed to production |
| `main` | Production source of truth (currently at `audit-hotfix-release`) |

Work was done on per-phase branches and merged into `main` with `--no-ff` merge commits.

---

## Phase A — Design system consolidation (frontend)
Centralized design tokens; replaced hardcoded hex values with semantic CSS variables
(`globals.css`, `enterprise-ui.ts`), added `--primary-hover` and ERP shadow tokens,
normalized button radii. Visual parity preserved.

## Phase B — Responsive parity (frontend)
Introduced consistent `ResponsiveDataView` + `RecordMobileCard` + `TableShell` usage,
progressive column hiding (`hideBelow`) and sticky identity columns on wide tables
(ledger, audit logs, users, reports, returns, products, inventory). Desktop usability
preserved; reduced horizontal-scroll chaos on smaller laptops; mobile card fallback.

## Phase C — Frontend cleanup & dedup
- Added `api.upload()` to standardize multipart uploads (receiving + supplier dialogs).
- Extracted shared `buildQuery()` (`lib/query.ts`); applied to returns/receivables/ledger.
- Deferred (higher regression risk, needs sign-off): void/archive dialog consolidation,
  payment-option arrays, approval-queue structural refactor.

## Phase D — Performance optimization (frontend)
- **Deduped `/api/alerts`** via a single shared `AlertsProvider` (one 60s poller for navbar
  + dashboard; previously a duplicate fetch on every dashboard visit). Alerts are NOT
  cached with a stale TTL (they reflect stock/approval state).
- **Lightweight session reference cache** (`lib/reference-cache.ts`, 60s TTL, request
  de-dup, failure-safe) applied ONLY to reference lists: categories, store settings, users.
  Transactional/financial data (sales, inventory, stock, receivables, audit logs, approvals)
  is never cached. Same-session correctness preserved via explicit invalidation on mutation.
- **Settings endpoint consistency:** Sales page was calling the non-existent
  `/api/settings/store` (404, swallowed → null store settings on receipt reprints). Pointed
  it at `/api/settings`, removing a wasted request and restoring the receipt store header.

**Deployment:** frontend-only release; API/Nginx untouched; DB unchanged; no migrations.

---

## Hotfix — Audit logs UTC date filter (backend) — `audit-hotfix-release`

**Symptom (production only):** Security Log and Operational Log pages showed
"An unexpected error occurred." (HTTP 500). Audit Excel/PDF export affected too.

**Root cause:** `AuditLogRepository.ApplyFilters` compared `CreatedAt` against date bounds
with `DateTimeKind.Unspecified`:

```csharp
query = query.Where(a => a.CreatedAt >= from.Value.Date);
query = query.Where(a => a.CreatedAt <  to.Value.Date.AddDays(1));
```

On PostgreSQL (production), `DateTime` maps to `timestamp with time zone`; Npgsql rejects
non-UTC `DateTime` parameters → unhandled exception → 500 from `ExceptionHandlingMiddleware`.
Masked locally because dev uses SQLite (permissive about `DateTimeKind`).

**Not caused by Phases A–D:** the frontend audit request is byte-for-byte identical to the
pre-stabilization baseline, and the API was never redeployed during Phase D. Pre-existing
bug; first exercised against production PostgreSQL after the Phase D deploy.

**Fix** (`backend/GensanPOS.Infrastructure/Repositories/AuditLogRepository.cs`): mirror the
UTC-conversion pattern already used by `StockReceivingRepository` and
`InventoryAdjustmentRepository`:

```csharp
var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
query = query.Where(a => a.CreatedAt >= fromUtc);
var toUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc);
query = query.Where(a => a.CreatedAt < toUtc);
```

Fixes both log pages and the export (shared `ApplyFilters`). No schema, migration, API
contract, or frontend change. Commit `7c171d7`.

**Deployment:** API-only release (`gensanpos-api-hotfix.tar.gz`); snapshot of `api/` taken;
fresh DB backup taken; `rsync --delete` of `api/` + restored `uploads` symlink; restarted
**only** `gensanpos-api`; `gensanpos-web` and Nginx untouched; no migrations ran.

**Verification:** health checks passed; Security/Operational log pages load correctly with
working date filters; database unchanged.

---

## Retained safety artifacts (keep until production stability confirmed)
- Frontend deploy snapshot: `/var/www/gensanpos/web.bak-2026-05-31-063048`
- Frontend deploy API snapshot: `/var/www/gensanpos/api.bak-2026-05-31-063048`
- Audit hotfix API snapshot: `/var/www/gensanpos/api.bak-<hotfix SNAP tag>`
- DB backups: `/var/backups/gensanpos/gensanpos-20260531-063118.dump` (+ hotfix-time dump)

## Outstanding / recommended follow-ups
- **Latent date-kind risk (verify, don't assume):** the same `Kind=Unspecified` date pattern
  exists in `ReceivableRepository`, `GoodsReturnSlipRepository`, and `SaleRepository`. They
  appear to work in production (dates likely arrive as UTC via their flows), but should be
  verified and, if needed, normalized with the same `SpecifyKind(..., Utc)` pattern.
- **Phase E (documentation-only):** backend risk notes — dual-DB strategy, catalog import
  behavior, startup mutations, and the dev JWT secret in `appsettings.json`.
- Deferred structural refactors from Phase C (dialog consolidation, approval-queue) remain
  acceptable to defer while the production system runs stably.

---

## Phase F — UI/UX modernization (frontend) — `phase-f-release`

Goal: a calmer, more premium "modern enterprise ERP / SaaS" feel while preserving density,
operational speed, workflows, business logic, API contracts, role permissions, and the
responsiveness/performance work from Phases A–D. **Frontend-only, presentation layer.**

Branch `ui/phase-f-modernization`, merged to `main` via `--no-ff`. Baseline tag
`pre-phase-f-baseline`; release tag `phase-f-release`. 25 files changed (+194 / −157),
all under `frontend/`. No backend, schema, or migration changes.

**F.1 — Foundation tokens** (`b3dff18`)
- `globals.css`, `enterprise-ui.ts`: cooler slate neutral ramp, slate-tinted layered
  elevation, tighter body line-height, deeper/calmer sidebar palette. Primary blue accent
  and success/warning/danger business colors preserved. Token-only.

**F.2 — Core primitives** (`7553d7f`)
- Unified form-control radius: `input` + `select` trigger → `rounded-md` (match buttons).
- Unified focus ring to `ring-2 ring-ring/40` across `input`/`select`/`badge`.
- Fixed `card` header/footer radius to match the card (`rounded-lg`).
- Added additive primitives: `ui/skeleton.tsx` (`Skeleton`) and
  `enterprise/empty-state.tsx` (`EmptyState`). Not wired in F.2.

**F.3 — App shell & navigation** (`85dc8df`)
- Topbar aligned to the sidebar brand header (`h-14`) → one continuous header seam.
- Active sidebar item: brand-blue left accent bar instead of the right chevron + layered
  inset shadow/ring (calmer, clearer hierarchy). Nav structure/roles/collapse/mobile intact.

**F.4 — Page-level polish (empty states)** (`a7a71c3`)
- Replaced ad-hoc per-page empty markup (mixed `py-6/8/10/12`, mixed typography, duplicated
  for mobile + desktop) with shared `EmptyState` + new `TableEmptyRow` helper.
- Wired across: products, inventory (on-hand + movements), receivables, sales, returns,
  stock-receiving, adjustments, dashboard (2 mini-tables), users, cheques, ledger, customers,
  suppliers, categories, and the audit-logs view (Security + Operational).
- Loading remains handled by route-level `loading.tsx` → `PageSkeleton`; **no** per-page
  loading booleans introduced (no behavior change). Errors still surface via toasts.

**Build status:** clean production build at each phase; final build ✓ 25/25 routes, TypeScript
passed, no lint errors. Reviewed locally (production build + `next start`) and approved
per-phase before merge.

**Deployment (frontend-only):** release tarball built with `deploy/scripts/build-release.ps1`;
only the `web/` folder deployed. Web snapshot taken before deploy (rollback insurance); DB
backup taken as insurance only. `rsync --delete` of `web/` → `/var/www/gensanpos/web/`;
restarted **only** `gensanpos-web`; API, Nginx, database, and migrations all untouched.

**Verification:** `gensanpos-web` active; web local `307` (auth redirect) and public health OK.
Browser checks: theme consistency, sidebar/topbar alignment, forms/focus states, empty states
(desktop + mobile), table readability, POS workflow, receivables/audit logs/date filters,
laptop/mobile responsiveness.

**Rollback:** restore the web snapshot (`rsync --delete` snapshot → web folder), `chown`
`www-data`, restart `gensanpos-web` only. Git-level: `reset --hard pre-phase-f-baseline`
(pre-push only). Frontend-only + file snapshot ⇒ fast rollback; DB/API never at risk.

---

## Post-audit fixes (H1, H2, C3) — read-only audit follow-up

Isolated branches merged to `main` (no schema, no workflow changes):

| ID | Branch | Scope | Change |
|---|---|---|---|
| H1 | `fix/h1-reports-date-filter` | Frontend | Unified reports send `filter.from` / `filter.to` (was root `from`/`to`, ignored by model binder) |
| H2 | `fix/h2-receivables-export-openonly` | Frontend | Export includes `openOnly=true` when Open balances tab active (matches list) |
| C3 | `fix/c3-unified-reports-scoping` | Backend API | Cashier: receivables report scoped to own sales; stock receiving to own requests; inventory cost masked; Audit + Profit unified query/export → 403 |

**Deploy:** frontend-only for H1+H2; API-only restart `gensanpos-api` for C3 (can be separate releases).

**Deferred (audit):** C1 checkout transaction, C2 stock concurrency, H3/H4 financial recalculation, UTC date standardization on remaining repositories.
