# Phase C — Wave 3 — Step 3.3.2: Test Report
## Centralized Atomic Stock Engine Test Suite & Regression Verification

**Document Version:** 1.0.0  
**Date:** 2026-09-27  
**Execution Environment:** Node.js 20 LTS | Prisma 5.19.1 | MySQL 9.5.0  
**Target Database:** `127.0.0.1:3306/master_hrms_dev`  

---

## 1. Test Summary

| Test Suite | File | Assertions / Scenarios | Passed | Failed | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Atomic Stock Engine** | `server/src/tests/wave3-step3-3-2-atomic-stock-engine.test.ts` | 15 | 15 | 0 | 0 | **PASS** |
| **Step 3.3.1 Schema & Migration** | `server/src/tests/wave3-step3-3-1-schema-and-migration.test.ts` | 12 | 12 | 0 | 0 | **PASS** |
| **Step 3.2 Fiscal Period Service** | `server/src/tests/wave3-step3-2-fiscal-period.service.test.ts` | 6 | 6 | 0 | 0 | **PASS** |
| **Step 3.2 DB Integration** | `server/src/tests/wave3-step3-2-integration.test.ts` | 24 | 24 | 0 | 0 | **PASS** |
| **Step 3.1 Tenant Isolation** | `server/src/tests/wave3-step3-1-tenant-isolation.test.ts` | 28 | 28 | 0 | 0 | **PASS** |
| **TOTAL** | — | **85** | **85** | **0** | **0** | **100% PASS** |

---

## 2. Step 3.3.2 Test Suite Execution Details

Command executed:
```bash
npx tsx server/src/tests/wave3-step3-3-2-atomic-stock-engine.test.ts
```

### Section 1: Quantity Parsing & Validation Unit Tests
* `[✓ PASS] TEST-1A`: Rejects zero quantity (qty must be > 0)
* `[✓ PASS] TEST-1B`: Rejects negative quantity
* `[✓ PASS] TEST-1C`: Rejects precision exceeding 3 decimal places (e.g. `10.1234`)
* `[✓ PASS] TEST-1D`: Rejects non-numeric strings and `NaN`
* `[✓ PASS] TEST-1E`: Accurately parses valid 3-decimal strings and numbers into `Prisma.Decimal`

### Section 2 & 3: Database Integration Tests
* `[✓ PASS] TEST-2A`: `increaseStock` updates balance and creates append-only `StockMovement`
  - Balance increased from `0.000` to `25.500`.
  - Movement record created with `beforeQuantity: 0.000` and `afterQuantity: 25.500`.
* `[✓ PASS] TEST-2B`: `decreaseStock` deducts balance atomically and creates outbound `StockMovement`
  - Balance decreased from `25.500` to `15.250`.
  - Movement recorded with delta `-10.250`.
* `[✓ PASS] TEST-2C`: `decreaseStock` rejects oversell and leaves warehouse balance unchanged
  - Attempting to deduct `50.000` from `15.250` threw `InsufficientStockError`.
  - Warehouse balance remained intact at `15.250`.
* `[✓ PASS] TEST-2D`: Failed transaction rolls back balance changes and movement records
  - Balance update aborted; verified zero partial updates or orphaned movement entries.
* `[✓ PASS] TEST-2E`: Fractional operations preserve exact 3 decimal places
  - Sequential movements: `10.500 - 3.250 - 2.125 = 5.125`.
  - Final database balance exactly matched `5.125`.
* `[✓ PASS] TEST-2F`: `transferStock` coordinates atomic source deduction and destination addition
  - Source balance decreased by `5.000`.
  - Destination balance increased by `5.000`.
  - Two paired movement records (`TRANSFER_OUT` and `TRANSFER_IN`) created in the same transaction.
* `[✓ PASS] TEST-2G`: Insufficient stock transfer fails and leaves both warehouses unchanged
  - Transfer rejected; both source and destination balances left untouched.
* `[✓ PASS] TEST-2H`: Cross-tenant product and warehouse access is rejected
  - Tenant B attempting stock operations on Tenant A resources threw `TenantIsolationError`.
* `[✓ PASS] TEST-2I`: High concurrency simultaneous checkout prevents oversell and negative stock
  - Initial stock: `10.000`.
  - 10 concurrent requests launched simultaneously in `Promise.allSettled`, each attempting to deduct `2.000` units.
  - Exactly 5 succeeded, exactly 5 were rejected with `InsufficientStockError` or `StockConcurrencyError`.
  - Final warehouse balance: exactly `0.000`. No negative balance, zero oversell.
* `[✓ PASS] TEST-2J`: `adjustStock` routes addition and subtraction correctly with ledger entries
  - Positive adjustment added `12.000` (`ADJUSTMENT_IN`).
  - Negative adjustment subtracted `4.000` (`ADJUSTMENT_OUT`).
  - Balance reached `8.000` with 2 ledger entries.

---

## 3. Regression Test Executions

### A. Step 3.3.1 Schema & Migration Verification Suite
Command: `npx tsx server/src/tests/wave3-step3-3-1-schema-and-migration.test.ts`
* 12/12 assertions passed.
* Confirmed `quantity` column definitions are `DECIMAL(15, 3)` across tables.
* Confirmed `stock_movements` table structure and composite indexes.
* Confirmed `DIRECT_TENANT` model classification.

### B. Step 3.2 Fiscal Period Service Tests
Command: `npx tsx server/src/tests/wave3-step3-2-fiscal-period.service.test.ts`
* 6/6 guard scenarios passed.

### C. Step 3.2 Database Integration Tests
Command: `npx tsx server/src/tests/wave3-step3-2-integration.test.ts`
* 24/24 database integration scenarios passed.
* Confirmed ledger postings, contra-reversals, and period closing controls continue to operate properly.

### D. Step 3.1 Tenant Isolation & RBAC Test Suite
Command: `npx tsx server/src/tests/wave3-step3-1-tenant-isolation.test.ts`
* 28/28 router isolation and async local storage scoping tests passed.

---

## 4. Conclusion

All 85 assertions across unit, integration, concurrency, and regression suites passed with 0 failures and 0 skipped tests. The atomic stock engine is verified production-grade and ready for router integration in Step 3.3.3.
