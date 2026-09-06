# Phase 1 GRS — Production activation (after flag-OFF deploy)

**Prerequisite:** Phase 1 **code + migration** already deployed with  
`ExchangeWorkflow__Phase1Enabled = false` and legacy smoke tests **passed**  
([DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md) §7).

**This document:** Turning the workflow **ON** in live production — separate approval from the initial deploy.

**Store policy:** [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md) — operational returns only (wrong size / spec / item); no defective/warranty scenarios.

---

## Goal

1. Short **activation window** (controlled, reversible).
2. **Owner-supervised** then **cashier-supervised** live testing.
3. **Inventory** verified on real SKUs in production.
4. **No operational confusion** (legacy vs Phase 1 clear to staff).
5. If stable → **keep `Phase1Enabled: true`**.
6. Full live operation with Phase 1 inspection workflow (exchange settlement still Phase 2+).

---

## Before flipping the flag

- [ ] Initial deploy completed; legacy smoke L1–L9 passed with flag **OFF**
- [ ] Pre-activation DB backup (same as [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md) §3)
- [ ] Owner + at least one cashier available for supervised window
- [ ] Low-traffic time slot chosen (e.g. start of day, not peak rush)
- [ ] Rollback agreed: set flag `false` + restart API (§ Rollback below)
- [ ] Staff briefed: **no cash refund at return** — replace/exchange after owner approval

---

## Activation window (production)

### 1. Enable flag (supervised)

On droplet:

```bash
# Edit /etc/gensanpos/gensanpos.env
ExchangeWorkflow__Phase1Enabled=true

systemctl restart gensanpos-api
sleep 3
curl -sf http://127.0.0.1:5170/health && echo OK
```

Hard-refresh all browsers (Ctrl+Shift+R). Confirm:

- Returns page shows **Phase 1 — inspection workflow** banner
- **New return** → “Submit return for inspection”
- **No** refund-method dropdown
- `/api/app-features` → `exchangeWorkflowPhase1Enabled: true` (authenticated)

### 2. Owner-supervised live tests

Use **real** operational scenarios only (wrong size / spec / item on a **test or low-risk invoice** if possible).

| # | Owner action | Verify |
|---|--------------|--------|
| O1 | Open pending filter / list | Pending slips visible |
| O2 | **Approve** one submitted return | Stock **increases**; status approved |
| O3 | **Reject** one pending (or use test slip) | Pending qty released; **no** stock change |
| O4 | Void an **approved** exchange slip (if tested) | Stock reversed |
| O5 | Wording / banners | No “refund” on Phase 1 path |

### 3. Cashier-supervised live tests

| # | Cashier action | Verify |
|---|----------------|--------|
| C1 | Submit return for inspection | Pending; **no** stock change yet |
| C2 | Cancel **own** pending slip | Cancelled; pending released |
| C3 | Lookup same invoice | Available qty respects pending |
| C4 | Dialog clarity | Understands replace/exchange, not cash refund |

### 4. Inventory (production, real SKUs)

For at least one line tested end-to-end, record:

| Checkpoint | Product SKU | Stock before | After submit | After approve/reject |
|------------|-------------|--------------|--------------|----------------------|
| Submit pending | | | unchanged | — |
| Approve | | | — | +return qty |
| Reject path | | | unchanged | unchanged |

Cross-check **Inventory** screen and product movement notes (resellable operational return).

### 5. Operational confusion check

| Question | Expected |
|----------|----------|
| Do staff know this is **not** a cash-refund desk? | Yes |
| Is legacy **completed** GRS history still understandable? | Yes (`WorkflowKind` legacy rows unchanged) |
| Any duplicate or stuck pending slips? | None |
| POS / sales / receivables unaffected for non-return flows? | Yes |

---

## Decision: keep enabled or rollback

### If stable → keep ON

- Leave `ExchangeWorkflow__Phase1Enabled=true` in production env
- Document activation date + who supervised
- Monitor pending queue daily (owner)
- Phase 2 (GEX / replacement POS) remains future work

### If issues → rollback (same window)

```bash
# /etc/gensanpos/gensanpos.env
ExchangeWorkflow__Phase1Enabled=false

systemctl restart gensanpos-api
```

Users immediately return to **legacy GRS** (banner gone, refund dropdown, Process return).  
Pending exchange-era slips may need owner review — do not delete data without a plan.

---

## “Deploy all in live” (after activation stable)

Once the activation window passes and you **keep the flag ON**:

- Production is already on current release artifacts; no second “feature deploy” required unless a newer build exists.
- **Operational go-live** = Phase 1 inspection workflow **enabled** for all stores/users on that server.
- Continue: owner monitors pending → approve/reject; cashiers submit for inspection only.
- **Still out of scope until later phases:** full exchange POS, financial settlement, net reporting changes.

If a **new code release** is needed after activation, redeploy with [deploy/PRODUCTION-CHECKLIST.md](../deploy/PRODUCTION-CHECKLIST.md) and **confirm flag stays `true`** in env after restart (or intentionally `false` if rolling back workflow only).

---

## Activation log

| Field | Value |
|-------|--------|
| Activation date/time | |
| Supervised by (owner) | |
| Cashier tester | |
| Pre-activation DB backup path | |
| Flag set to true at | |
| O1–O5 / C1–C4 pass? | |
| Inventory SKU verified | |
| Confusion issues? | |
| Decision | Keep ON / Rollback OFF |
| Notes | |

---

## Related docs

- Deploy (flag OFF): [DEPLOY-PHASE1-PRODUCTION.md](./DEPLOY-PHASE1-PRODUCTION.md)
- UAT (local/staging): [UAT-PHASE1-GRS-RUNBOOK.md](./UAT-PHASE1-GRS-RUNBOOK.md)
- Policy: [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md)
