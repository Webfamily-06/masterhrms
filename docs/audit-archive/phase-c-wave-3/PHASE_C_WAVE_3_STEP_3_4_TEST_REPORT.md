# PHASE C · WAVE 3 · STEP 3.4 — TEST REPORT
## Purchasing Lifecycle & Accounts Payable

**Date:** 2026-09-28  
**Status:** ✅ PASSED (manual + static verification)

---

## Test Coverage Matrix

### T1 — Happy Path: Partial then Full Payment

**Setup:** PO with `total = 10000`, `paidAmount = 0`, `paymentStatus = unpaid`

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T1.1 | POST `/api/purchases/:id/payments` `{amount: 4000}` | 201; `paidAmount=4000`, `paymentStatus=partial` | ✅ |
| T1.2 | GET `/api/purchases/:id/payments` | `[{amount:4000, method:"Bank Transfer"}]` | ✅ |
| T1.3 | POST `/api/purchases/:id/payments` `{amount: 6000}` | 201; `paidAmount=10000`, `paymentStatus=paid` | ✅ |
| T1.4 | GET `/api/purchases/:id/payments` | 2 rows, total = 10000 | ✅ |
| T1.5 | JournalEntry for pay-{paymentId1} exists | referenceType=purchase_payment | ✅ |
| T1.6 | JournalEntry for pay-{paymentId2} exists | referenceType=purchase_payment | ✅ |

### T2 — Over-Payment Guard

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T2.1 | POST `{amount: 10001}` against PO with `remaining = 10000` | 400 OVERPAYMENT | ✅ |
| T2.2 | `paidAmount` unchanged after rejection | still 0 | ✅ |

### T3 — Concurrency Guard (PAYMENT_RACE)

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T3.1 | Two simultaneous POST `{amount:5000}` requests | One succeeds 201; other gets 409 PAYMENT_RACE | ✅ (updateMany guard prevents both committing) |

### T4 — Idempotency Key

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T4.1 | POST `{amount:5000, idempotencyKey:"pay-abc-001"}` | 201 | ✅ |
| T4.2 | Repeat POST same key | 409 DUPLICATE_PAYMENT (P2002) | ✅ |

### T5 — Zero Amount Rejection

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T5.1 | POST `{amount: 0}` | 400 "amount must be greater than 0" | ✅ |
| T5.2 | POST `{amount: -100}` | 400 | ✅ |

### T6 — Tenant Isolation

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T6.1 | POST payment for PO belonging to different tenant | 404 | ✅ |
| T6.2 | GET `/api/purchases/:id/payments` for foreign PO | 404 | ✅ |

### T7 — GL Ledger Posting

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T7.1 | After payment, check `journal_entries` | Entry with `reference = "pay-{id}"`, `referenceType = "purchase_payment"` | ✅ |
| T7.2 | Check `journal_items` | DEBIT AP 2010 = amount; CREDIT Bank 1020 = amount | ✅ |
| T7.3 | Check `chart_of_accounts` balance | AP balance decremented; Bank balance decremented | ✅ |
| T7.4 | Re-posting same paymentId | Idempotency guard skips → no duplicate JE | ✅ |

### T8 — AP Summary Endpoint

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| T8.1 | GET `/api/suppliers/ap-summary` | `outstanding = sum(total) - sum(paidAmount)` for non-cancelled POs | ✅ |
| T8.2 | After full payment of a PO | `outstanding` decreases by PO total | ✅ |
| T8.3 | Cancelled PO | Excluded from totals | ✅ |

### T9 — Frontend Queries

| Test | Expected |
|------|----------|
| AP Outstanding KPI card loads without error | ✅ |
| KPI value matches `/api/suppliers/ap-summary` response | ✅ |
| Payment history feed appears in PO detail dialog | ✅ |
| Payment history empty when no payments made | ✅ (section hidden) |
| Reference no. field POSTs correctly in payload | ✅ |
| `queryClient.invalidateQueries` refreshes all 3 query keys on success | ✅ |

---

## TypeScript Compilation

```
cd server && npx tsc --noEmit | grep -E "purchases|suppliers|ledger-posting|PurchasePayment"
# Output: (empty — zero errors in Step 3.4 files)
```

---

## Schema Verification

```sql
DESCRIBE purchase_payments;
-- id, purchase_id, tenant_id, amount, method, reference_no,
-- idempotency_key, notes, paid_at, created_by_id ✅

SHOW INDEX FROM purchase_payments;
-- purchase_payments_purchase_id_idempotency_key_key (UNIQUE) ✅
-- purchase_payments_tenant_id_paid_at_idx ✅

SHOW INDEX FROM purchases WHERE Key_name LIKE '%payment_status%';
-- purchases_tenant_id_payment_status_idx ✅
```

---

## Known Limitations

- Concurrency test (T3) verified by code-path analysis (optimistic lock), not via parallel load test
- GL posting is fire-and-forget; transient failures are logged but not retried (consistent with existing pattern for `autoPostPurchaseToLedger`)
