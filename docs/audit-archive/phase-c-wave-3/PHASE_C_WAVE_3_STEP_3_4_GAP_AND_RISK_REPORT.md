# PHASE C · WAVE 3 · STEP 3.4 — GAP & RISK REPORT
## Purchasing Lifecycle & Accounts Payable

**Date:** 2026-09-28  
**Status:** All critical gaps closed for Step 3.4 scope

---

## 1. Gaps Identified and Resolved

| Gap | Severity | Resolution |
|-----|----------|------------|
| No discrete payment row per installment | HIGH | `PurchasePayment` table added |
| Race condition on concurrent payments | HIGH | Optimistic-lock `updateMany` guard |
| No GL posting for AP settlement | HIGH | `autoPostSupplierPaymentToLedger` |
| Over-payment not validated | MEDIUM | `remaining + 0.005` guard → 400 |
| No payment history API | MEDIUM | `GET /api/purchases/:id/payments` |
| No AP visibility in UI | MEDIUM | AP KPI card + history feed |
| No reference number for bank payments | LOW | Field added to payment modal |

---

## 2. Residual Risks

### R1 — Shadow Database Baseline Gap (LOW)
**Description:** Migrations 3.2 and 3.3 cannot replay in the shadow DB because `chart_of_accounts` was created before the migration framework was introduced (no baseline migration exists).  
**Impact:** `prisma migrate dev` must always use the `db execute + migrate resolve --applied` workaround.  
**Mitigation:** Document as a known constraint. A future step can create a baseline migration via `prisma migrate diff --from-empty`.

### R2 — GL Posting Fire-and-Forget (LOW)
**Description:** `autoPostSupplierPaymentToLedger` is called with `.catch(log)` — failures are logged but the payment still succeeds.  
**Impact:** GL can get out of sync with AP balance if posting fails (e.g., closed fiscal period).  
**Mitigation:** Consistent with existing pattern across all 4 GL posting functions. A reconciliation job is the standard remedy.

### R3 — AP Aging Not Implemented (FUTURE)
**Description:** `unpaidCount` is returned but there is no aging bucket (0–30d, 31–60d, 61–90d, 90d+) breakdown.  
**Impact:** AP aging report is not available.  
**Recommendation:** Future step to add AP aging endpoint and UI table.

### R4 — Payment Reversal Not Implemented (FUTURE)
**Description:** Once a payment is recorded, there is no endpoint to reverse/void it.  
**Impact:** Manual DB correction required for erroneous payments.  
**Recommendation:** Add `DELETE /api/purchases/:id/payments/:paymentId` with GL reversal in a future step.

### R5 — Supplier Credit Terms Not Tracked (FUTURE)
**Description:** No `paymentTerms` or `dueDate` field on `Purchase` or `Supplier`.  
**Impact:** AP aging lacks due-date awareness.  
**Recommendation:** Future step to add `paymentTerms`, `dueDate` to `Purchase` and supplier payment terms fields.

### R6 — No Email/Notification on Payment Recorded (LOW)
**Description:** Supplier is not notified when a payment is recorded against their account.  
**Impact:** Manual supplier communication required.  
**Recommendation:** Hook into notification service in a future step.

---

## 3. Technical Debt

| Item | Priority |
|------|----------|
| Add `prisma migrate diff --from-empty` baseline migration | MEDIUM |
| Add retry/dead-letter queue for GL posting failures | LOW |
| Add AP aging endpoint | MEDIUM |
| Add payment reversal endpoint | MEDIUM |
| Load test concurrent payments endpoint | LOW |
