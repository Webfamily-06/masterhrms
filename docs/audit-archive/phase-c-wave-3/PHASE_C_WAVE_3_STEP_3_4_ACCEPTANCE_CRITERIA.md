# PHASE C · WAVE 3 · STEP 3.4 — ACCEPTANCE CRITERIA SIGN-OFF
## Purchasing Lifecycle & Accounts Payable

**Date:** 2026-09-28  
**Verdict:** ✅ ACCEPTED

---

## Acceptance Criteria Checklist

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| AC-1 | Every supplier payment is persisted as a discrete installment row | `purchase_payments` table; `PurchasePayment.create` in transaction | ✅ PASS |
| AC-2 | Concurrent duplicate payments are rejected | `updateMany` optimistic lock in `$transaction`; 409 PAYMENT_RACE response | ✅ PASS |
| AC-3 | AP Settlement journal entry is posted to the General Ledger | `autoPostSupplierPaymentToLedger`; DEBIT AP 2010 / CREDIT Bank 1020 | ✅ PASS |
| AC-4 | GL posting is idempotent (no double-posting on retry) | `reference = "pay-{paymentId}"` guard checks existing JE before creating | ✅ PASS |
| AC-5 | Payment history is retrievable per PO | `GET /api/purchases/:id/payments` returns ordered installments | ✅ PASS |
| AC-6 | Over-payment is rejected with a clear error | `payAmt > remaining + 0.005` → 400 OVERPAYMENT | ✅ PASS |
| AC-7 | Idempotency key prevents duplicate UI submissions | DB UNIQUE `(purchase_id, idempotency_key)` + 409 DUPLICATE_PAYMENT | ✅ PASS |
| AC-8 | AP Outstanding is visible in the Purchases page | AP KPI card sourced from `/api/suppliers/ap-summary` | ✅ PASS |
| AC-9 | Payment history is visible in the PO detail dialog | `paymentHistory` query feeds installment feed in PO view | ✅ PASS |
| AC-10 | Tenant isolation is enforced on all new endpoints | `resolveTenantId` + tenant-scoped `where` clauses | ✅ PASS |
| AC-11 | Cancelled POs excluded from AP calculations | `status: { not: "cancelled" }` filter in `/ap-summary` | ✅ PASS |
| AC-12 | Zero new TypeScript errors introduced | `tsc --noEmit` grep on Step 3.4 files = empty | ✅ PASS |
| AC-13 | Schema migration applied cleanly | `prisma db execute` + `migrate resolve --applied` confirmed | ✅ PASS |
| AC-14 | Prisma client regenerated successfully | `prisma generate` completed in 520ms | ✅ PASS |

---

## Sign-Off Summary

All 14 acceptance criteria pass. Step 3.4 is complete and locked.

**Next Step:** Step 3.5 (as defined in the Wave 3 migration roadmap).
