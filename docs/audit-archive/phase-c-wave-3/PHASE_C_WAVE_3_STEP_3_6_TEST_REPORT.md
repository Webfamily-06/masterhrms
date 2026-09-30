# PHASE C · WAVE 3 · STEP 3.6 — TEST REPORT
## Sales & Purchase Returns Engine (Credit & Debit Notes)

**Date:** 2026-09-28  
**Author:** Antigravity Senior ERP Architect & Staff Backend Engineer  
**Suite:** `server/src/tests/wave3-step3-6-sales-purchase-returns.test.ts`  
**Execution Runtime:** Node.js 20 LTS | Prisma 5.22.0 | Express 4 | MySQL/MariaDB 10.11 (`master_hrms_dev`)  
**Status:** ✅ ALL 12 SCENARIOS PASSED (100.0% SUCCESS RATE)

---

## 1. Test Suite Summary Table

| ID | Category | Scenario / Assertion | Status | Duration | Evidence |
|---|---|---|---|---|---|
| **T1** | Sales Returns | Partial Sales Return creation & returnable quantity calculation | ✅ PASS | 45ms | `HTTP 201 \| Return: SR-2026-0001 \| Total: 2360 \| Status: draft` |
| **T2** | Credit Notes | Sales Return Approval -> Credit Note auto-generation (`CN-YYYY-XXXX`) | ✅ PASS | 32ms | `HTTP 200 \| Credit Note: CN-2026-0001 \| Balance: 2360 \| Status: active` |
| **T3** | Sales Returns | Sales Return Completion -> Atomic restock via `InventoryMovementService` & balanced GL auto-posting | ✅ PASS | 64ms | `HTTP 200 \| Stock Restocked: +2 (Before: 50, After: 52) \| JE JE-2026-0001-9225 Balanced: true (Debit 2360 = Credit 2360)` |
| **T4** | Validation Guards | Sales Return Quantity Overdraft Guard (Attempting to return more than sold -> 400) | ✅ PASS | 12ms | `HTTP 400 \| Error: "Requested return quantity (4) exceeds available quantity (3) for product 35c2a497-0277-456a-acef-f6b429f2bc54"` |
| **T5** | Validation Guards | Full Sales Return & Second Return Rejection (Return exhaustion guard -> 400) | ✅ PASS | 28ms | `Return 2 HTTP 201 (3 units) \| Return 3 HTTP 400 ("Requested return quantity (1) exceeds available quantity (0)")` |
| **T6** | Purchase Returns | Partial Purchase Return creation & returnable quantity calculation | ✅ PASS | 36ms | `HTTP 201 \| Return: PR-2026-0001 \| Total: 2124 \| Status: draft` |
| **T7** | Debit Notes | Purchase Return Approval -> Debit Note auto-generation (`DN-YYYY-XXXX`) | ✅ PASS | 29ms | `HTTP 200 \| Debit Note: DN-2026-0001 \| Balance: 2124 \| Status: active` |
| **T8** | Purchase Returns | Purchase Return Completion -> Atomic stock decrement via `InventoryMovementService` & balanced GL auto-posting | ✅ PASS | 58ms | `HTTP 200 \| Stock Decremented: -3 (Before: 52, After: 49) \| JE JE-2026-0002-1478 Balanced: true (Debit 2124 = Credit 2124)` |
| **T9** | Validation Guards | Purchase Return Overdraft Guard (Attempting to return more than received -> 400) | ✅ PASS | 11ms | `HTTP 400 \| Error: "Requested return quantity (8) exceeds available quantity (7) for product 35c2a497-0277-456a-acef-f6b429f2bc54"` |
| **T10** | Validation Guards | Purchase Return Depleted Inventory Conflict Guard (422 Insufficient Stock) | ✅ PASS | 39ms | `HTTP 422 \| Code: INSUFFICIENT_STOCK \| Error: "Insufficient stock for product..."` |
| **T11** | Tenant Isolation | Multi-Tenant Isolation: Cross-tenant return creation/approval rejection (404) | ✅ PASS | 18ms | `GET /sales/:id HTTP 404 \| POST /approve HTTP 404 \| POST /sales HTTP 404` |
| **T12** | Financial Compliance | Closed Fiscal Period Rejection Guard for Return Ledger Postings (422 `PERIOD_CLOSED`) | ✅ PASS | 42ms | `HTTP 422 \| Code: PERIOD_CLOSED \| Error: "The fiscal year for this transaction date is closed"` |

---

## 2. Regression & Stability Analysis

| Suite | Scope | Total Scenarios | Passed | Regressions | Status |
|---|---|---|---|---|---|
| `wave3-step3-6-sales-purchase-returns.test.ts` | Returns, Credit/Debit Notes, GL, Inventory | 12 | 12 | 0 | ✅ 100% PASS |
| `wave3-step3-5-sales-pos-ar.test.ts` | POS checkout, AR Invoicing, Payments, GL, Shifts | 10 | 10 | 0 | ✅ 100% PASS |
| `wave3-step3-3-5-inventory-finalization.test.ts` | Atomic stock, Multi-hop transfers, Overdrafts | 25 | 25 | 0 | ✅ 100% PASS |
| `wave3-step3-1-tenant-isolation.test.ts` | Dynamic proxy, Cross-tenant queries, RBAC | 28 | 28 | 0 | ✅ 100% PASS |
| `npx tsc --noEmit` (Frontend) | React + TypeScript + TanStack Router & Query | — | — | 0 | ✅ 0 Errors |

---

## 3. Key Technical Discoveries & Fixes

1. **Transaction Isolation in General Ledger Auto-Posting**:
   - In MariaDB with `REPEATABLE READ`, accessing or creating missing Chart of Accounts (`taxAcc` or `taxInputAcc`) inside the `$transaction` callback via outer client led to `P2025: Record to update not found`.
   - **Resolution**: All accounts (`returnsAcc`, `creditAcc`, `taxAcc`, `apAcc`, `purchRetAcc`, `taxInputAcc`) are resolved *prior* to opening the transaction snapshot, guaranteeing that all foreign key rows exist in the snapshot.
2. **Child-Dependent Relation Handling in Tenant Extension**:
   - `sanitizeWritePayload` in `tenant-isolation.extension.ts` previously assumed all nested creates were direct tenant models with `tenantId`.
   - **Resolution**: Introduced `KNOWN_CHILD_RELATION_KEYS` (`details`, `items`, `lines`, `payments`, `warehouseStocks`, etc.) ensuring child tables without a `tenant_id` column never have rogue properties injected.
3. **Double-Entry Balance Verification**:
   - Both sales returns (`Debit 4020 + Debit 2020 = Credit 1010/1020/1030`) and purchase returns (`Debit 2010 = Credit 5020 + Credit 1040`) were strictly asserted in the database with $\sum \text{Debit} \equiv \sum \text{Credit}$.
