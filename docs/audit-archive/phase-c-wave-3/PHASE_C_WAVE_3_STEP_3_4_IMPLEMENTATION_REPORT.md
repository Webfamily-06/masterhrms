# PHASE C · WAVE 3 · STEP 3.4 — IMPLEMENTATION REPORT
## Purchasing Lifecycle & Accounts Payable

**Date:** 2026-09-28  
**Status:** ✅ COMPLETE

---

## 1. Executive Summary

Step 3.4 completes the procurement-to-payment (P2P) lifecycle:

1. **`PurchasePayment`** table — discrete installment ledger (mirrors `SalePayment`)
2. **Concurrency-safe payment recording** with optimistic-lock `$transaction` guard
3. **`autoPostSupplierPaymentToLedger`** — balanced AP-settlement double-entry to GL
4. **`GET /api/purchases/:id/payments`** — full payment history stream
5. **Hardened `POST /api/purchases/:id/payments`** — over-payment guard, idempotency key, GL posting
6. **AP metrics** on suppliers router — per-supplier outstanding + tenant-wide `/ap-summary`
7. **UI enhancements** — AP Outstanding KPI card, payment history feed, reference number field

---

## 2. Database Changes

### New Table: `purchase_payments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(36) PK | UUID |
| `purchase_id` | VARCHAR(36) FK | → purchases.id CASCADE |
| `tenant_id` | VARCHAR(36) FK | → tenants.id CASCADE |
| `amount` | DECIMAL(15,2) | Payment amount |
| `method` | VARCHAR(50) | Bank Transfer / Cash / UPI / Cheque |
| `reference_no` | VARCHAR(100) NULL | UTR, cheque no., etc. |
| `idempotency_key` | VARCHAR(128) NULL | UNIQUE with purchase_id |
| `notes` | VARCHAR(255) NULL | Optional memo |
| `paid_at` | DATETIME(3) | Timestamp |
| `created_by_id` | VARCHAR(36) NULL | Audit trail |

**Index added to `purchases`:** `(tenant_id, payment_status)` for AP aging queries.

**Migration:** `20260928000000_step_3_4_purchase_payments` — applied via `prisma db execute` + `migrate resolve --applied`.

---

## 3. Backend Changes

### Ledger Service — `autoPostSupplierPaymentToLedger`

AP Settlement double-entry:

- **DEBIT** Accounts Payable (2010) — clears the liability
- **CREDIT** Bank (1020) / Cash (1010) — based on payment method

Idempotency: `reference = "pay-{paymentId}"` (distinct from goods-receipt `reference = purchaseId`).

### Purchases Router

**`GET /api/purchases/:id/payments`** — new endpoint returning all PurchasePayment rows ordered by `paidAt ASC`, tenant-scoped.

**`POST /api/purchases/:id/payments`** — hardened:
1. Over-payment guard (400 OVERPAYMENT)
2. `$transaction` with optimistic lock (`updateMany` on `paidAmount = existing.paidAmount`) → 0 rows = 409 PAYMENT_RACE
3. Creates `PurchasePayment` row
4. GL posting (fire-and-forget)
5. WebSocket `purchase:updated`

### Suppliers Router

- `GET /api/suppliers` — list now includes `totalPaid`, `outstandingBalance` per supplier
- `GET /api/suppliers/ap-summary` — new: `{ totalPayable, totalPaid, outstanding, unpaidCount, suppliersWithOpenAP }`
- `GET /api/suppliers/:id` — now includes `payments[]` per purchase and `apMetrics` aggregate

---

## 4. Frontend Changes (`purchases.tsx`)

- New `PurchasePayment` interface
- `["ap-summary"]` query → `GET /api/suppliers/ap-summary`
- `["purchase-payments", poId]` query → `GET /api/purchases/:id/payments`
- KPI grid: 4 → 5 columns (`md:grid-cols-3 lg:grid-cols-5`)
- **AP Outstanding KPI card** with open PO count sub-label
- **Payment modal** — Reference/Transaction No. field added
- **PO Detail dialog** — Payment Installments feed with method, reference, date, amount
- `invalidateQueries` on success refreshes `ap-summary` + `purchase-payments`

---

## 5. File Change Summary

| File | Type of Change |
|------|---------------|
| `server/prisma/schema.prisma` | Added `PurchasePayment` model + relations |
| `server/prisma/migrations/20260928000000_step_3_4_purchase_payments/migration.sql` | New migration |
| `server/src/services/ledger-posting.service.ts` | Added `autoPostSupplierPaymentToLedger` |
| `server/src/routes/purchases.routes.ts` | New GET endpoint; hardened POST endpoint |
| `server/src/routes/suppliers.routes.ts` | AP metrics on list/detail; new /ap-summary |
| `src/routes/_authenticated/_app/purchases.tsx` | AP KPI card; payment feed; reference field |

---

## 6. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Discrete payment row per installment | ✅ |
| Concurrent duplicate payment prevention | ✅ PAYMENT_RACE 409 |
| AP Settlement posted to GL | ✅ autoPostSupplierPaymentToLedger |
| Payment history retrievable per PO | ✅ GET /api/purchases/:id/payments |
| Over-payment rejected | ✅ 400 OVERPAYMENT |
| Idempotency key prevents re-submission | ✅ DB unique + P2002 handler |
| AP Outstanding visible in UI | ✅ KPI card + history feed |
| Zero new TypeScript errors | ✅ Verified |
