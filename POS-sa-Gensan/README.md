# GensanPOS

Point of Sale and inventory for a **stainless steel / hardware** shop (pipes, sheets, fittings, accessories).

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui |
| Backend | ASP.NET Core 10, Clean Architecture |
| Database (local) | SQLite (`gensanpos.db`) |
| Database (production) | PostgreSQL on DigitalOcean (connection-string ready) |

## Roadmap (your phased plan)

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Auth, Owner/Cashier roles, products, categories, basic inventory | **Done** |
| **2** | POS, barcode, Cash / QRPH / Online Bank | **Done** |
| **3** | Stock receiving + approval, movements, low-stock alerts | **Done** |
| **4** | GRS, void, inventory adjustments | **Done** |
| **5** | Cheque/PDC, Utang, tax options | **Done** |
| **6** | Reports, profit, audit detail, Excel/PDF | **Done** |

## Roles

- **Owner** — full access, all sales, can void, manage catalog/users, optional POS use
- **Cashier** — POS, own sales only, view shared inventory quantities

**Sales separation:** Cashiers see only their sales on dashboard/sales list. Owner sees own sales, cashier sales, and store total. **Inventory is shared globally** for all users.

**Product catalog** includes stainless-specific fields: size, thickness, length, grade, and unit of measure (pc, sheet, m, etc.).

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@gensanpos.com` | `Owner@123` |
| Cashier | `cashier@gensanpos.com` | `Cashier@123` |

## Local setup

### Prerequisites

- .NET 10 SDK
- Node.js 20+

### Backend

```bash
cd backend
dotnet run --project GensanPOS.API
```

API: http://localhost:5170  
Swagger: http://localhost:5170/swagger

> **Schema changes:** Delete `backend/GensanPOS.API/gensanpos.db` and restart to re-seed when the model changes (migrations coming later).

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # or use existing .env.local
npm install
npm run dev
```

App: http://localhost:3000

### PostgreSQL (later)

Set `ConnectionStrings:DefaultConnection` to a PostgreSQL connection string containing `Host=` — the API auto-selects Npgsql. See `backend/GensanPOS.API/appsettings.Production.example.json`.

## Project structure

```
GensanPOS/
├── backend/
│   ├── GensanPOS.Domain/          # Entities, enums, repository interfaces
│   ├── GensanPOS.Application/     # DTOs, service interfaces, validators
│   ├── GensanPOS.Infrastructure/  # EF Core, services, JWT, seed
│   └── GensanPOS.API/             # Controllers, middleware
└── frontend/
    └── src/
        ├── app/(app)/             # Authenticated pages
        ├── components/            # UI + layout
        └── lib/                   # API client, types, auth
```

## API highlights (Phase 1–2)

- `POST /api/auth/login` — JWT
- `GET /api/dashboard` — role-scoped metrics
- `GET/POST /api/products`, `GET /api/products/barcode/{code}`
- `GET/POST /api/categories`
- `POST /api/sales` — payments: Cash, QRPH, Online Bank
- `GET /api/sales` — filtered by role
- `GET /api/inventory` — movements (Owner)

Low-stock threshold: **15 units** (fixed constant for alerts).

### Phase 3 API

- `GET/POST /api/stockreceiving` — create (pending) / list
- `POST /api/stockreceiving/{id}/approve` — Owner only, updates inventory
- `POST /api/stockreceiving/{id}/reject` — Owner only
- `GET/POST /api/suppliers`
- `GET /api/alerts` — pending receivings + low stock
- `GET /api/inventory` — movement history (all roles)

**Important:** Delete `gensanpos.db` and restart API after pulling Phase 3 to create new tables.

### Phase 4 API

- `GET/POST /api/goods-return-slips` — GRS (operational returns: wrong item/size/spec; not defective/warranty); `GET .../lookup?saleNumber=`
- `GET /api/sales?history=true` — includes voided sales
- `POST /api/sales/{id}/void` — Owner, body `{ "reason": "..." }`
- `POST /api/sales/{id}/correction` — Owner, replacement sale after void
- `GET/POST /api/inventory-adjustments` — request count correction
- `POST /api/inventory-adjustments/{id}/approve|reject` — Owner only
- Dashboard includes `todayReturns`, `todayNetSales`, chart `netTotal`

**Frontend:** `/returns`, `/adjustments`, enhanced `/sales` and dashboard.

**Important:** Delete `gensanpos.db` and restart API after pulling Phase 4 for new tables/columns.

### Phase 5 — Utang / Charged account

Credit sales complete immediately (inventory deducts, sale recorded) but **cash is not received** until the customer pays later. Original invoice amounts are never edited; each payment is an append-only row in `receivable_payments`.

- `POST /api/sales` — `paymentMethod: 3` (Charged), optional `customerId` / `customerName`, `dueDate`
- `GET /api/receivables` — list; `?overdueOnly=true` or `?status=unpaid|partial|paid`
- `GET /api/receivables/summary` — totals, unpaid/partial/overdue counts
- `GET /api/receivables/{id}` — invoice + payment history
- `POST /api/receivables/{id}/payments` — record payment (never overwrites balance on the sale)
- `GET /api/receivables/ledger?customerId=` — customer ledger (charges + payments, running balance)
- `GET/POST /api/customers`

**Statuses:** UNPAID → PARTIAL → PAID; OVERDUE when `today > dueDate` and balance &gt; 0.

**Frontend:** POS “Charged / Utang”, `/receivables`, `/customers`, `/ledger`. Dashboard shows overdue receivables.

**Important:** Delete `gensanpos.db` and restart API after pulling Phase 5 for `customers`, `customer_receivables`, `receivable_payments`.

#### Cheque / PDC

- `POST /api/sales` — `paymentMethod: 4` (Cheque) with `cheque` body (bank, branch, cheque #, account, maturity date, current vs PDC)
- `GET /api/cheques` — list; `?status=0|1|2` (pending / cleared / bounced)
- `POST /api/cheques/{id}/status` — Owner: mark **cleared** (cash recognized) or **bounced**

Sale completes and stock deducts at checkout; **cash increases only when cheque is cleared**.

#### Tax (VAT)

- `GET/PUT /api/settings` — `vatEnabled`, `vatRate` (e.g. `0.12`), `pricesIncludeVat`
- POS computes VAT from settings (exclusive = add on top; inclusive = extract from shelf price)

#### Partial utang at POS

- Charged checkout allows optional **down payment**; balance goes to receivables with payment history.

#### GRS on charged sales

- Returns reduce the customer's **receivable balance** (credit entry on ledger, sale invoice unchanged).

**Important:** Delete `gensanpos.db` and restart API after pulling Phase 5 remainder for `sale_cheques`, `store_settings`, and receivable credit columns.

### Phase 6 — Reports, profit, audit, exports

- `GET /api/reports/sales?from=&to=` — sales summary, payment breakdown, line list (Owner = store; Cashier = own sales)
- `GET /api/reports/profit?from=&to=` — net sales, COGS (product cost × qty), gross profit, margin, by day / by product
- `GET /api/reports/sales/export?format=excel|pdf` — download
- `GET /api/reports/profit/export?format=excel|pdf` — download
- `GET /api/auditlogs` — Owner: searchable audit log (`action`, `entityType`, `search`, pagination)
- `GET /api/auditlogs/export?format=excel|pdf` — Owner: export up to 5,000 rows

**Frontend:** `/reports` (Sales + Profit tabs, Excel/PDF buttons), `/audit-logs` (Owner).

**Profit note:** COGS uses the product’s current **cost price** at report time (approximate; cost-at-sale snapshot can be added later).

**Packages:** ClosedXML (Excel), QuestPDF (PDF) on the API.

### Scalability & data retention (5+ years)

Business records are **never hard-deleted**. Older rows can be **soft-archived** (`IsArchived`) via `POST /api/archive` (Owner) while remaining searchable when `includeArchived=true`.

| Area | Behavior |
|------|----------|
| **Reports** | `GET /api/reports/query?type=Sales\|Profit\|Inventory\|…&filter.page=&filter.period=custom\|monthly\|yearly` — server-side filters, SQL aggregates, paginated rows |
| **Dashboard** | Today + last 7 days + current-month top products only (no full history load) |
| **Sales history** | `GET /api/sales?history=true&page=1&pageSize=50` — paginated list without line items |
| **Inventory** | Current stock from `/api/products`; movements via `GET /api/inventory?page=` |
| **Indexes** | `CreatedAt`, `SaleNumber`, `ProductId`, `UserId`, `PaymentMethod`, composites with `IsArchived` |

**After pulling:** delete `backend/GensanPOS.API/gensanpos.db` once and restart the API so new columns/indexes apply.

**Frontend:** `/reports` report-type hub with pagination; `/sales` and `/inventory` paginated history tables; **Settings → Data archive** (Owner) calls `POST /api/archive`.

### Sales & profit (historical cost snapshots)

Each `sale_items` row stores **SellingPriceAtSale**, **CostPriceAtSale**, and **ProfitAmount** at checkout. `sales.GrossProfit` is the sum of line profits. Reports and dashboard profit use these fields — not current product cost.

- **Owner:** dashboard profit cards, `/reports` (profit + category breakdown), sales table profit column, inventory value
- **Cashier:** own sales only via `/sales` — no profit or reports menu
- Restart API after pull; existing DB lines are backfilled on startup from product cost where snapshots were missing (reset `gensanpos.db` if schema errors occur)
