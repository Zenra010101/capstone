# Phase 1 GRS — Operational UAT runbook

Use this while reviewing **before** staging sign-off or production.  
**Production:** `ExchangeWorkflow:Phase1Enabled` must stay **`false`**.

**Policy:** Only test [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md) scenarios — wrong **size**, **specification**, or **item**. Do not test defective/warranty flows through GRS.

---

## Setup

### Local Phase 1 testing

1. In `backend/GensanPOS.API/appsettings.Development.json` set:
   ```json
   "ExchangeWorkflow": { "Phase1Enabled": true }
   ```
2. Restart API (`dotnet run` in `GensanPOS.API`).
3. Frontend: http://localhost:3000 — hard refresh (Ctrl+Shift+R) after API restart.
4. Confirm on **Returns**:
   - Amber **Phase 1 — inspection workflow** banner
   - **New return** dialog title: “Submit return for inspection”
   - **No** “Refund method” dropdown (if you still see it, the flag is still OFF or the page needs refresh)

### Legacy comparison (same machine)

1. Set `Phase1Enabled` back to **`false`**, restart API.
2. Banner should **not** appear; button says **“Process return”** (not “Submit for inspection”).
3. Run legacy smoke tests below.

### Accounts

| Role | Email | Password |
|------|--------|----------|
| Owner | owner@gensanpos.com | Owner@123 |
| Cashier | cashier@gensanpos.com | Cashier@123 |

### Test data

- Pick a **completed** sale with returnable qty (POS sale or existing invoice).
- Note **product SKU**, **stock on hand** (Inventory), and **invoice line** before each test.
- Use return reason examples: “Wrong size”, “Wrong specification”, “Wrong item”.

---

## A. Legacy GRS (`Phase1Enabled: false`)

| # | Step | Expected | Pass | Notes / screenshot |
|---|------|----------|------|-------------------|
| A1 | Cashier: Returns → New return → lookup invoice → qty → policy checkbox → **Process return** | GRS **Completed** immediately | ☐ | |
| A2 | Check product **stock** | **Increased** by return qty | ☐ | |
| A3 | Check today’s sales impact | Return deduction applied (legacy) | ☐ | |
| A4 | Lookup same invoice again | **Available to return** reduced | ☐ | |
| A5 | Owner void completed GRS | Stock reversed; deduction reversed | ☐ | |

**Clarity:** No “pending inspection” status; refund method visible; no approve/reject buttons.

---

## B. Phase 1 — Cashier (`Phase1Enabled: true`)

| # | Step | Expected | Pass | Notes / screenshot |
|---|------|----------|------|-------------------|
| B1 | Cashier submit return | Status **Pending inspection**; toast mentions inspection | ☐ | |
| B2 | Product **stock** after submit | **Unchanged** from baseline | ☐ | |
| B3 | Invoice lookup / available qty | **Pending** reserved; available reduced | ☐ | |
| B4 | Sales deduction / refund on create | **None** (Phase 1) | ☐ | |
| B5 | Dialog UX | Title “Submit return for inspection”; policy checkbox; no refund field | ☐ | |
| B6 | Cashier cancel **own** pending slip | Cancelled; pending qty **released** | ☐ | |

---

## C. Phase 1 — Owner approval

| # | Step | Expected | Pass | Notes / screenshot |
|---|------|----------|------|-------------------|
| C1 | Filter **Pending inspection** | Pending GRS visible | ☐ | |
| C2 | **Approve** with optional notes | **Approved**; stock **restored** (sellable) | ☐ | |
| C3 | Approve dialog copy | Mentions resellable stock; operational policy | ☐ | |
| C4 | **Reject** with reason | **Rejected**; stock **unchanged**; pending **released** | ☐ | |
| C5 | Void **approved** exchange GRS (if testing) | Stock reversed; no sales-deduction reversal | ☐ | |

---

## D. Pending quantity protection

| # | Step | Expected | Pass | Notes |
|---|------|----------|------|-------|
| D1 | Submit pending for qty **N** on a line | Pending holds **N** | ☐ | |
| D2 | Second return on same line (pending still open) | Cannot exceed **available** (sold − returned − pending) | ☐ | |
| D3 | After reject/cancel | Available increases; pending cleared | ☐ | |
| D4 | After approve | Returned qty up; pending cleared | ☐ | |

---

## E. Responsiveness (small laptop / ~1366×768)

Test **Returns** list, **New return** dialog, **Approve/Reject** dialogs, detail drawer.

| # | Check | Pass | Issue |
|---|--------|------|-------|
| E1 | Filters usable without horizontal scroll | ☐ | |
| E2 | Mobile cards / table actions reachable | ☐ | |
| E3 | Dialog fits viewport; primary buttons visible without scroll | ☐ | |
| E4 | Approve + Reject not cramped on narrow width | ☐ | |

---

## F. Legacy vs Phase 1 — confusion check

| Signal | Legacy (flag OFF) | Phase 1 (flag ON) |
|--------|-------------------|-------------------|
| Page banner | None | Owner approval required |
| New return button label | Process return | Submit for inspection |
| After create | Completed + stock in | Pending inspection, no stock |
| Owner actions | Void on completed | Approve / Reject on pending |
| Refund method | Shown | Hidden |

---

## Issue log (fill during testing)

| ID | Role | Screen | Steps | Expected | Actual | Severity |
|----|------|--------|-------|----------|--------|----------|
| 1 | | | | | | |
| 2 | | | | | | |

**Severity:** Blocker / Major / Minor / UX

---

## Sign-off (after UAT)

- [ ] All sections A–F passed or issues logged
- [ ] Screenshots/demo attached to issue tracker or PR
- [ ] Inventory behavior verified on real SKUs
- [ ] Owner confirms operational wording and approval flow
- [ ] `Phase1Enabled` confirmed **false** in production config
- [ ] Ready for staging deploy (code only, flag still OFF) — **not** production activation

See also: [DEPLOY-PHASE1-GRS.md](./DEPLOY-PHASE1-GRS.md)
