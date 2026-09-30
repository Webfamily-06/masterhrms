# PHASE C · WAVE 3 · STEP 3.5 — GAP AND RISK REPORT
## Sales Invoicing, POS Registers & Accounts Receivable (AR)

**Date:** 2026-09-28  
**Status:** ✅ MITIGATED & RESOLVED  
**Classification:** Pre-Implementation Gaps, Architectural Mitigations & Forward-Looking Risks

---

## 1. Resolved Gaps & Architectural Mitigations

| Identified Gap / Risk | Risk Severity | Implemented Mitigation in Step 3.5 | Verification Status |
|---|:---:|---|:---:|
| **Payment Concurrency Race Condition**<br>Simultaneous cashier/portal submissions could over-credit an invoice. | **HIGH** | Optimistic concurrency update lock implemented using `tx.sale.updateMany({ where: { id, paidAmount: currentPaid } })`. If modified by another transaction in-flight, returns `0` affected rows and throws `409 PAYMENT_RACE`. | ✅ Verified (T4, T7) |
| **Silent Overpayment Beyond Total Invoice Amount**<br>Submitting a payment greater than the outstanding invoice balance. | **HIGH** | Strict atomic check `if (newPaid > total) throw new Error("OVERPAYMENT")` prior to database mutation. Returns `400 Bad Request` with structured error code. | ✅ Verified (T5) |
| **Unlinked General Ledger Receivables**<br>Customer payments clearing UI balance without double-entry GL debit to Cash/Bank and credit to AR (1030). | **CRITICAL** | Built `autoPostCustomerPaymentToLedger` with strict fiscal period verification (`assertOpenPeriodForPosting`), balanced double-entry validation, and chart of account balance synchronization. | ✅ Verified (T3, T4) |
| **Lack of Discrete Payment Installment Audit Trail**<br>`sale_payments` table lacked idempotency, user attribution, and auditor notes. | **MEDIUM** | Added `idempotencyKey`, `notes`, `createdById`, and `@@index([saleId])` via migration `20260928000001_step_3_5_sale_payments`. | ✅ Verified (T4, T7) |
| **Cash Register Shift Missing Register Fallback**<br>Opening a POS shift when no terminal row existed resulted in foreign key null violation. | **MEDIUM** | Updated `POST /api/sales/register/open` to auto-provision `"Main POS Counter #1"` under `resolveTenantId` if no terminal is present. | ✅ Verified (T9) |
| **Missing Sub-Resource REST Endpoints for AR**<br>UI had no standard route to fetch installment payment history for a specific sale or invoice. | **MEDIUM** | Implemented `GET /api/sales/:id/payments` and `GET /api/invoices/:id/payments` returning chronologically sorted payment rows. | ✅ Verified (T4, T10) |

---

## 2. Forward-Looking Architectural Considerations (Wave 3 Step 3.6 / Future)

1. **Lump-Sum Multi-Invoice Payment Allocation:**
   - *Current State:* Payments are recorded against individual sales/invoices.
   - *Future Enhancement:* Customer remittance allocation engine to apply a single payment across multiple outstanding invoices using FIFO or manual item allocation.
2. **Customer Credit Limit Hard Enforcement:**
   - *Current State:* `creditLimit` is stored on the `Customer` record and displayed in the UI.
   - *Future Enhancement:* Option to strictly block unpaid credit sales if `outstandingReceivable + newSaleTotal > creditLimit`.
3. **Multi-Currency AR Settlements:**
   - *Current State:* Transactions occur in the tenant's base currency.
   - *Future Enhancement:* Automatic Realized Foreign Exchange Gain/Loss journal entries upon settling invoices billed in foreign currencies.
