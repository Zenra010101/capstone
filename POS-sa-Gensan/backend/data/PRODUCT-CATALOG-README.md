# Product catalog — master files & update workflow

This folder holds the **official production product lists** for GensanPOS:

- **264 stainless SKUs** (sheets, plates, tubes, bars) — `client-production-catalog.csv`
- **502 accessories SKUs** (PH001–PH158 price list) — `accessories-catalog.csv`

## Master files (edit these)

| File | Best for | Purpose |
|------|----------|---------|
| [client-production-catalog.xlsx](./client-production-catalog.xlsx) | **Owners / office staff** | Edit prices and specs in Excel, then save or export to CSV |
| [client-production-catalog.csv](./client-production-catalog.csv) | **Import & version control** | Same data as Excel; used by the import CLI and API |
| [client-production-catalog.md](./client-production-catalog.md) | **Reference / printing / Git diff** | Read-only snapshot grouped by category (regenerate after edits) |
| [accessories-catalog.csv](./accessories-catalog.csv) | **Import accessories** | PH001–PH158 from accessories price list PDF |
| [PH-ACC-Price1.pdf](./PH-ACC-Price1.pdf) | **Source PDF** | Original accessories price list |
| [product-catalog.template.csv](./product-catalog.template.csv) | New columns / training | Column reference with example rows |

## Catalog categories (production)

Only these four categories are used by the real client list:

| Category | Product types |
|----------|----------------|
| **Stainless Sheets** | 202/304 sheets — 2B, MIR, HL, checkered, perforated |
| **Stainless Plates** | Heavy 1B plate (4.0–6.0 mm) |
| **Stainless Tubes** | Round, square, rectangular, decorative, twisted |
| **Stainless Bars** | Shafting, angle bar, flat bar |
| **Accessories** | Fittings, hinges, glass clips, abrasives, tools (PH price list) |

Empty demo categories (Pipes, Fittings) are archived automatically on import. Use **Accessories** for the PH price-list products.

## Column reference

| Column | Required | Notes |
|--------|----------|-------|
| **SKU** | Yes | Unique code, e.g. `SS-SHT304-2B-1P0` |
| **Name** | Yes | Display name on POS and labels |
| **Category** | Yes | Must match one of the four categories above (or import creates it) |
| **Unit** | Yes | `sheet` for sheets/plates, `pc` for tubes and bars |
| **UnitPrice** | Yes | **Selling price (SRP)** — right-side value from client price lists |
| **Barcode** | Recommended | Unique; keep existing values when updating prices |
| **Grade** | Optional | `202` or `304` |
| **Size** | Optional | e.g. `4ft x 8ft`, `1/2" x 1.2mm` |
| **Thickness** | Optional | e.g. `1.0mm` |
| **MaterialType** | Optional | Finish: `2B`, `MIR`, `HL`, `2B CHK`, `Standard`, etc. |
| **Description** | Optional | Longer notes |
| **StockQuantity** | Optional | Default `0` at import; set via receiving/adjustments |

## How to update prices or add products

### Option A — Edit Excel (recommended for staff)

1. Open `client-production-catalog.xlsx` in Excel.
2. Change **UnitPrice** (and other columns as needed). Do not duplicate SKU or barcode.
3. Save the workbook.
4. **File → Save As → CSV UTF-8** as `client-production-catalog.csv` (overwrite the file in this folder),  
   **or** run the export script below to refresh CSV + MD from Excel manually saved CSV.
5. Import into the database (see below).

### Option B — Edit CSV directly

1. Edit `client-production-catalog.csv` in a text editor or Excel.
2. Regenerate Excel + Markdown reference:
   ```powershell
   .\scripts\export-product-catalog-docs.ps1 -SkipRegenerate
   ```
3. Import into the database.

### Option C — Regenerate from price-list source code

If the original price-list tables in `scripts/generate-client-catalog.ps1` change:

```powershell
.\scripts\export-product-catalog-docs.ps1
```

This rebuilds CSV, Excel, and Markdown from the scripted client tables.

## Import into GensanPOS

**Preview first (no database changes):**

```powershell
.\scripts\import-product-catalog.ps1 -File "backend\data\client-production-catalog.csv" -DryRun
```

**Apply updates (upserts by SKU, archives empty categories):**

```powershell
.\scripts\import-product-catalog.ps1 -File "backend\data\client-production-catalog.csv"
```

**Add accessories without touching existing stainless products:**

```powershell
.\scripts\import-product-catalog.ps1 -File "backend\data\accessories-catalog.csv" -NoArchive
```

Regenerate accessories CSV after editing the PDF source:

```powershell
node backend\data\generate-accessories-catalog.mjs
```

**Owner API:** `POST /api/product-catalog/import` with the CSV or XLSX file.

**Archive leftover empty categories only:**

```powershell
cd backend\GensanPOS.API
dotnet run -- catalog-import --archive-empty-categories
```

## Rules to keep the catalog clean

1. **One SKU = one product row** — each size/spec is its own line.
2. **UnitPrice = selling price** — never mix cost into this column unless you add a separate `CostPrice` column later.
3. **Do not reuse barcodes** — each product keeps a unique barcode across updates.
4. **Upsert by SKU** — re-import updates existing rows matched by SKU; new SKUs are added.
5. **No sample products** — import archives demo SKUs before loading the real list (default).

## File locations summary

```
backend/data/
  client-production-catalog.xlsx   ← edit in Excel
  client-production-catalog.csv    ← import this
  client-production-catalog.md     ← full readable list (regenerated)
  accessories-catalog.csv          ← accessories import (502 SKUs)
  PH-ACC-Price1.pdf                ← accessories price list source
  generate-accessories-catalog.mjs ← rebuild accessories CSV from source data
  PRODUCT-CATALOG-README.md          ← this guide
  product-catalog.template.csv       ← column template

scripts/
  export-product-catalog-docs.ps1  ← refresh CSV + XLSX + MD
  import-product-catalog.ps1       ← import to database
  generate-client-catalog.ps1        ← rebuild from price-list source
```
