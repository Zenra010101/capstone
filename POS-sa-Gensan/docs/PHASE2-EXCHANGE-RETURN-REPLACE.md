# Phase 2 — Return & replace exchange

Operational exchange at GRS (production legacy path, `ExchangeWorkflow:Phase1Enabled=false`).

## Business rules

- No cash refund — customer replaces with other product(s) at current shelf prices.
- Replacement total must be **≥** return credit (no partial credit / cheaper takeaway).
- Returned qty restores sellable inventory; replacement qty deducts stock.
- Original invoice is **not** modified.
- If replacement &gt; credit, a **top-up sale** is created (`ReplacesSaleId` → original) for the difference; collected amount appears in normal sales/collections.

## API

`POST /api/goods-return-slips` (legacy path) body adds:

```json
{
  "originalSaleId": "...",
  "reason": "...",
  "goodConditionConfirmed": true,
  "items": [{ "saleItemId": "...", "quantity": 1, "condition": 0 }],
  "replacementItems": [{ "productId": "...", "quantity": 1 }],
  "exchangePaymentMethod": 0,
  "exchangeAmountPaid": 118.00
}
```

`exchangePaymentMethod` / `exchangeAmountPaid` required when amount due &gt; 0.

## Database (EF migration `20260605120000_GoodsExchangeWorkflow`)

- `GoodsExchanges` — header (credit, replacement total, amount paid, optional top-up sale)
- `GoodsExchangeLines` — replacement lines

## Deploy

```powershell
.\deploy\scripts\build-release.ps1
.\deploy\scripts\deploy-phase1-release-only.ps1
```

Hard-refresh browser after deploy.
