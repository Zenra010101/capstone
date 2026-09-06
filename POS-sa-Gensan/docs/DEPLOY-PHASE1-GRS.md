# GRS Phase 1 — Safe deployment & UAT (feature flag OFF)

This document covers **implementation deployment only**. Production workflow activation requires separate explicit approval and setting `ExchangeWorkflow:Phase1Enabled` to `true`.

**Store policy:** See [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md). GRS/exchange is for operational returns (wrong size, spec, or item) only — **not** defective, broken, used, or warranty claims. Approved returns restore **sellable** inventory; no quarantine or warranty subsystem.

**Operational UAT:** Completed — see [UAT-PHASE1-GRS-RUNBOOK.md](./UAT-PHASE1-GRS-RUNBOOK.md).

**Production deploy (flag OFF):** Step-by-step runbook — [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md) (backup, order, health, rollback, legacy smoke).

## Scope (Phase 1)

- Additive DB migration (`GrsPhase1ApprovalWorkflow`)
- Exchange return path: submit → pending inspection → owner approve/reject/cancel
- `PendingReturnQuantity` on sale lines
- Stock restore **only on approve** (Owner)
- Legacy GRS unchanged when flag is **OFF**
- No GEX, no replacement POS, no financial settlement (Phase 2–3)

## Configuration (must stay OFF until UAT sign-off)

```json
"ExchangeWorkflow": {
  "Phase1Enabled": false
}
```

Files: `appsettings.json`, `appsettings.Development.json`, production env / `appsettings.Production.json`.

Frontend reads `/api/app-features` → `exchangeWorkflowPhase1Enabled`.

## Deploy order

1. **Database** — apply migration on staging, then production  
   `dotnet ef database update` (from `backend/GensanPOS.API`, Infrastructure project)
2. **API** — deploy backend with flag **false**
3. **Frontend** — deploy UI (works with flag off; new UI dormant until flag on in UAT)
4. **Verify flag OFF** — legacy GRS smoke test on production

## Migration review

| Change | Risk | Notes |
|--------|------|--------|
| `SaleItems.PendingReturnQuantity` int default 0 | Low | Additive; existing rows = 0 |
| `GoodsReturnSlips.WorkflowKind` int default 0 | Low | All existing slips = LegacyRefund |
| Approval/rejection/stock columns nullable | Low | No data loss |
| Index `(Status, WorkflowKind)` | Low | Query performance for pending queue |

**Rollback (schema):** deploy previous API build; migration Down drops new columns (only if no exchange-era rows exist in prod). Safer rollback: keep migration applied, set `Phase1Enabled: false`, use legacy path only.

## Deployment gates (before prod flag ON)

- [ ] Staging/UAT screenshots or recorded demo (cashier submit, owner approve/reject)
- [ ] Migration applied and verified on staging DB
- [ ] API + frontend deployed with **Phase1Enabled: false** on production
- [ ] Rollback plan agreed (revert deploy + flag off; DB rollback only if necessary)
- [ ] Owner operational validation (approve/reject, void approved exchange slip)
- [ ] Cashier workflow validation (submit, cancel own pending)
- [ ] Inventory verification (no stock on submit; stock IN on approve; pending qty released on reject/cancel)
- [ ] Legacy GRS with flag OFF: immediate complete, stock, sales deduction, refund methods
- [ ] UAT/demo uses **operational** scenarios only (wrong size/spec/item) — not defective/warranty examples

## Rollback plan

| Scenario | Action |
|----------|--------|
| Bug after deploy, flag still OFF | Redeploy previous API/frontend artifacts; DB unchanged |
| Bug with flag ON in UAT only | Set `Phase1Enabled: false`; restart API |
| Bad migration | Restore DB snapshot; redeploy previous API (pre-migration) |
| Approved exchange slips in prod | Do not run migration Down without data migration plan |

## UAT test matrix (staging: flag ON)

### Flag OFF (production default)

1. Operational return (e.g. wrong size on invoice) → Completed, **sellable** stock restored, refund method applied, sales deduction created.
2. Void completed legacy GRS → stock and deduction reversed.

### Flag ON (UAT only)

Use **wrong item / wrong size / wrong spec** test data only (see [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md)).

1. Cashier submits operational return → `PendingInspection`, `PendingReturnQuantity` increased, **no** stock change, **no** deduction.
2. Owner approves → **resellable** stock IN, `ReturnedQuantity` up, pending released, status Approved / awaiting exchange.
3. Owner rejects → pending released, no stock.
4. Cashier cancels own pending → pending released.
5. Lookup respects `availableToReturn` with pending reserved.
6. Void approved exchange GRS → sellable stock reversed (no deduction reversal).

## Production activation (NOT part of flag-OFF deploy)

Requires **separate** approval after deploy + legacy smoke pass.

**Runbook:** [ACTIVATE-PHASE1-PRODUCTION.md](./ACTIVATE-PHASE1-PRODUCTION.md)

Sequence when ready:

1. Short activation window (`Phase1Enabled: true`, supervised)  
2. Owner-supervised live tests → cashier-supervised live tests  
3. Inventory verified on real production SKUs  
4. Confirm no operational confusion  
5. **Keep enabled if stable** — otherwise rollback flag to `false`  
6. Full live operation with Phase 1 workflow (settlement/exchange POS still later phases)

Legacy completed slips (`WorkflowKind = 0`) remain unchanged in history.

## Local SQLite (development only — not production)

**What happened:** After Phase 1 code landed, `dotnet run` against the local SQLite file failed with `no such column: g.ApprovalNotes` during startup seed/backfill.

**Cause:** Development uses `DatabaseInitializer` with `EnsureCreatedAsync` plus **manual** `GrsSchemaMigrator` / `IndexSchemaMigrator` updates — not EF `MigrateAsync` (PostgreSQL production uses EF migrations). New entity columns were not yet in the SQLite migrator.

**Fix:** `GrsSchemaMigrator` and `IndexSchemaMigrator` were updated with the same additive Phase 1 columns and index as migration `GrsPhase1ApprovalWorkflow`.

**Classification:** This was a **development-environment schema sync** issue. It is **not** a production PostgreSQL startup failure. Production deploy applies the EF migration via `dotnet ef database update` (Npgsql).

## Pre-production checklist (required before any prod deploy or flag ON)

Do **not** deploy to production or set `Phase1Enabled: true` until every item below is done and signed off.

| # | Gate | Status |
|---|------|--------|
| 1 | Final code review summary (this branch vs main) | Ready (see table below) |
| 2 | Migration review (`GrsPhase1ApprovalWorkflow`) on staging DB | Ready (apply on API start) |
| 3 | Confirm `ExchangeWorkflow:Phase1Enabled` is **false** in production config/secrets | Required at deploy |
| 4 | Staging/UAT test results (matrix below) | **Done** (local/staging) |
| 5 | Screenshots or demo: pending → approve / reject / cancel | Owner captured |
| 6 | Legacy GRS verified with flag **OFF** (immediate complete, stock, deduction, refund) | **Done** (UAT) + repeat on prod post-deploy |
| 7 | Rollback plan agreed | [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md) §6 |
| 8 | Deployment blocks agreed | [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md) §1 |

**Production config rule:** `appsettings.json`, `appsettings.Production.example.json`, and committed defaults keep `Phase1Enabled: false`. Any production override must be checked before deploy.

## Code review summary (Phase 1)

| Area | Summary |
|------|---------|
| Feature flag | `ExchangeWorkflow:Phase1Enabled` — OFF by default; API gates exchange path via `EnsurePhase1Enabled()` |
| Legacy path | Flag OFF → `CreateLegacyAsync` unchanged (stock + deduction + refund on create) |
| Exchange path | Flag ON → pending inspection, `PendingReturnQuantity`, stock on owner approve only |
| API | `POST approve/reject/cancel`, `GET /api/app-features` |
| Frontend | Returns page + new-return dialog read flag; owner actions hidden when flag OFF |
| Migration | Additive only; `WorkflowKind` default 0 for existing GRS rows |
| Out of scope | GEX, replacement POS, financial settlement (Phase 2–3) |
| Store policy | Operational returns only; approved stock = sellable; no warranty/defective path |

## Branch

`feature/grs-phase1-approval-workflow`

**Current policy:** Deploy **code + migration** with flag **OFF** using [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md). **No production `Phase1Enabled: true`** until separate activation approval.
