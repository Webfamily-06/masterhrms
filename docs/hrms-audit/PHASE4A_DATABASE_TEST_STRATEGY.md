# MASTERHRMS — PHASE 4A
## Database Remediation & Migration Testing Strategy

**Document Reference:** `docs/hrms-audit/PHASE4A_DATABASE_TEST_STRATEGY.md`  
**Execution Date:** 2026-11-04  
**Author:** Principal QA Architect & PostgreSQL Reliability Engineer  
**Scope:** Verification strategy, dry-run architecture, isolated test environment requirements, and test suite matrix for Phase 4 remediation  
**Status:** **TEST STRATEGY SPECIFICATION**

---

## 1. Executive Summary & Mandatory Test Boundaries

A cornerstone requirement of institutional database management is the **strict separation between production data and test execution**.

### STRICT RULES GOVERNING DATABASE TESTING:
1. **Production Supabase is NOT an Authorized Test Database:** Writing test fixtures, dropping/re-creating tables, or executing test teardowns on the live Supabase instance (`aws-0-ap-south-1.pooler.supabase.com`) is **STRICTLY PROHIBITED**.
2. **Dedicated Isolated Test Environment Mandatory:** True database-writing tests must ONLY run against a verified, isolated local or containerized PostgreSQL test instance.
3. **Transparent Limitation Reporting:** If an isolated PostgreSQL instance is not provisioned or accessible, database-writing tests must be deferred, and the limitation must be prominently stated.
4. **No Unlabeled Mocking:** Unit tests using mock objects must be explicitly labeled as mocked. They can never be represented as hardware integration proof.

---

## 2. Multi-Stage Testing Framework

```
+-----------------------------------------------------------------------------------+
| STAGE 1: Static Schema & Build Validation (Zero DB writes)                        |
| - Prisma Schema Validation (npx prisma validate)                                  |
| - Backend TypeScript Compilation (tsc --noEmit)                                   |
| - CMS Next.js Typecheck (npm --prefix CMS run typecheck)                          |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| STAGE 2: Read-Only Production Pre-Flight Scans (Zero DB writes)                   |
| - Physical column drift scans                                                     |
| - Duplicate key scans on journal_entries and loan_installments                    |
| - Row count and datatype verification on leave_requests                           |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| STAGE 3: Isolated Database Dry-Run (Dedicated Test Database Required)             |
| - Stand up isolated PostgreSQL 15 container (Docker / Local pg)                   |
| - Restore pre-migration production dump into test database                        |
| - Apply Phase 4 remediation DDL sequence (Phases 1-6)                             |
| - Verify post-condition schemas, datatypes, and indexes                           |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| STAGE 4: Automated Functional & Concurrency Suites (Isolated Test DB)             |
| - Workstream A: Payroll Engine & Golden Cohort (35 tests)                         |
| - Workstream A: Blocker Remediation (15 tests)                                    |
| - Workstream B: Contract Billing & MMU (17 tests)                                 |
| - Workstream C: Statutory Registers U, V, W, X, S (16 tests)                      |
| - Workstream D: Monthly Payroll Automation Lifecycle (19 tests)                   |
| - Distributed Concurrency & Locking Suite (13 tests: CONC-01 to CONC-13)          |
| - Device Session Creation & Multi-Device Revocation Tests                         |
| - Leave Request Decimal Precision (0.5 day) Integration Tests                     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Detailed Test Suite Specifications

### 3.1. Test Suite 1: Pure In-Memory Business Logic (Executed & Verified)
- **Files:** `workstream-a-payroll-engine.test.ts`, `workstream-b-contract-billing.test.ts`, `workstream-a-blocker-remediation.test.ts`
- **Scope:** 70 automated tests validating statutory rules (EPF, ESI, PT, LWF), MMU contractor formulas, GST place of supply, and salary structures.
- **Database Dependency:** None (100% in-memory deterministic logic).
- **Execution Evidence:** 70/70 PASS (0 failures).

### 3.2. Test Suite 2: Device Session Lifecycle Test
- **File:** `server/src/tests/device-session.test.ts`
- **Scope:** Validates multi-device logins, refresh token hashing, individual device revocation, and `revokeAllSessions`.
- **Pre-requisite:** Table `device_sessions` created in PostgreSQL.
- **Verification Criteria:**
  - Login from Device 1 creates active row in `device_sessions`.
  - Login from Device 2 creates second distinct row for same user.
  - Logging out of Device 1 updates `revoked: true` on Device 1 while Device 2 remains active (`revoked: false`).

### 3.3. Test Suite 3: Leave Request Half-Day Precision Test
- **Target:** `prisma.leaveRequest.create`
- **Scope:** Verify non-integer day values:
  ```typescript
  const halfDay = await db.leaveRequest.create({
    data: {
      tenantId: "test-tenant",
      employeeId: "test-emp",
      startDate: new Date("2026-11-10"),
      endDate: new Date("2026-11-10"),
      days: 0.5,
      status: "approved",
      reason: "Half-day medical checkup",
    },
  });
  assert.strictEqual(Number(halfDay.days), 0.5);
  ```
- **Verification Criteria:** Value persists as `0.5` without rounding to `1` or `0`.

### 3.4. Test Suite 4: Distributed Concurrency & Hardware Locking (`CONC-01` to `CONC-13`)
- **File:** `server/src/tests/distributed-payroll-concurrency.test.ts`
- **Scope:** 13 multi-worker concurrency tests against PostgreSQL:
  - Atomic conditional claiming on `approvalStatus: "APPROVED" -> "FINALIZING"` (`CONC-01`, `CONC-02`).
  - General Ledger posting idempotency and transaction advisory locking (`CONC-03`).
  - Real PostgreSQL employee loan deduction concurrency and double-decrement immunity (`CONC-04`).
  - Crash recovery threshold, safe rollback, GL backfill, and double-entry validation (`CONC-06` to `CONC-13`).
- **Pre-requisite:** Isolated test database.

---

## 4. Environment Provisioning for Dry-Run

To satisfy the isolated testing requirement prior to production maintenance:

```bash
# Provision isolated local PostgreSQL 15 test container
docker run --name masterhrms-test-db \
  -e POSTGRES_PASSWORD=test_secret \
  -e POSTGRES_DB=masterhrms_test \
  -p 5433:5432 -d postgres:15

# Restore production logical dump into isolated test database
pg_restore -h localhost -p 5433 -U postgres -d masterhrms_test masterhrms_pre_migration_backup.dump

# Point environment to isolated test database
export DATABASE_URL="postgresql://postgres:test_secret@localhost:5433/masterhrms_test"
export DIRECT_URL="$DATABASE_URL"

# Execute migration runbook on test database
# Execute all 115 test suites against test database
```

---

## 5. Limitation & Status Declaration

- **Current Environment Status:** The active workspace connects exclusively to the cloud Supabase production instance (`aws-0-ap-south-1`).
- **Limitation Declaration:** A dedicated, isolated local PostgreSQL test database is currently not provisioned in this terminal session.
- **Operational Action Taken:** Database-writing integration test runs are properly held in reserve until the isolated test container is initialized. Pure in-memory suites and static builds were independently verified passing 100%.

