
# Roadmap: MASTERHRMS Complete Enterprise Functionality Implementation

## Overview

> **Forensic Progress Reconciliation Note (November 19, 2026):**  
> All 6 foundational gap remediation phases below are **100% complete and verified**.  
> In terms of the total 197-item enterprise scope (133 Add-ons + 64 Functions), this remediation milestone brings working codebase implementation to **91 of 197 items (46.2%)** with **65 items fully verified (33.0%)**, leaving 54 items blocked by external credentials and 52 items planned for subsequent milestones. See `reverseenginerring/197_ITEM_VERIFICATION_MATRIX.md`.

This roadmap orchestrates the full transition from reverse-engineering discovery into operational, tested production software across 133 Add-ons and 64 Business Functions. The phases are structured by architectural dependency, ensuring platform foundation and critical gaps are resolved before proceeding to cross-module verification.

---

## Phases

- [x] **Phase 1: Platform Foundation & Cron Automation** - Wire inactive cron workers to startup scheduler and verify tenant isolation (Workstream A).
- [x] **Phase 2: Core HR & Offboarding Formal Relieving Letter Generation** - Implement formal Relieving Letter document generation, digital metadata, and storage upon FnF settlement completion (FN-057 / GAP-01 / Workstream B).
- [x] **Phase 3: Missing Endpoints Implementation** - Implement missing routes for Lead conversion (FN-041), Asset custodian assignment (FN-046), Expense approval (FN-055), and Tenant quota enforcement (FN-061).
- [x] **Phase 4: Core HR, Attendance, & Payroll Workflow Verification** - Verify end-to-end functionality across attendance, leave, payroll runs, and ledger postings (Workstreams C, D, E).
- [x] **Phase 5: Marketplace & Modular Add-on Architecture** - Verify add-on entitlement gating, modular plugin isolation, and third-party integrations (Workstreams G, H, I).
- [x] **Phase 6: Enterprise Regression Suite & Final Implementation Report** - Execute full test regression, TypeScript verification, and publish final enterprise report.
- [x] **Phase 7: Canonical Route Normalization & Alias Verification** - Wire 7 canonical Express route aliases for biometric punch, attendance summary, leave approval, shift swap approval, OKR objectives, OKR check-ins, and Tally import, promoting all 7 PARTIAL items to VERIFIED (Milestone 7.1-B).

---

## Phase Details

### Phase 1: Platform Foundation & Cron Automation
**Goal**: Ensure all scheduled background workers execute continuously at server startup with tenant-aware scoping and zero orphaned jobs.
**Depends on**: Nothing (First phase)
**Requirements**: REQ-CRON-01, REQ-CRON-02, REQ-CRON-03, REQ-CRON-04, REQ-SEC-01
**Success Criteria**:
  1. `server/src/index.ts` imports and registers `document-expiry.cron`, `probation-contract-expiry.cron`, `reporting-manager-change.cron`, and `saas-billing.cron`.
  2. All 4 previously inactive workers run on defined daily schedules without runtime crashes.
  3. TypeScript compilation succeeds with zero type errors.

Plans:
- [x] 01-01: Integrate and schedule inactive background cron workers in `server/src/index.ts`.

---

### Phase 2: Core HR & Offboarding Formal Relieving Letter Generation
**Goal**: Resolve critical GAP-01 in FN-057 by implementing formal relieving document rendering, digital metadata generation, and downloadable storage upon Full & Final settlement.
**Depends on**: Phase 1
**Requirements**: REQ-FNF-01, REQ-HR-01
**Success Criteria**:
  1. `POST /api/offboarding/exits/:id/settle-fnf` generates formal relieving letter document record.
  2. Document metadata is persisted and linked to the exit record and employee file.
  3. API response returns confirmation with document ID and download path.
  4. Offboarding regression tests pass.

Plans:
- [x] 02-01: Implement relieving letter document generation service and integrate with FnF settlement endpoint.

---

### Phase 3: Missing Endpoints Implementation
**Goal**: Implement the 4 missing business function endpoints identified during the forensic audit to eliminate 404 route errors.
**Depends on**: Phase 2
**Requirements**: REQ-CRM-01, REQ-AST-01, REQ-EXP-01, REQ-SUP-01
**Success Criteria**:
  1. `POST /api/crm/leads/:id/convert` creates customer record and marks lead converted.
  2. `POST /api/addons/assets/:id/assign` creates asset assignment record and updates status.
  3. `PUT /api/expenses/:id/approve` transitions expense claim status and attaches reimbursement.
  4. `PUT /api/super/tenants/:id/quota` updates tenant resource allocation limits.

Plans:
- [x] 03-01: Implement missing route handlers across CRM, Assets, Expenses, and Super Admin controllers.

---

### Phase 4: Core HR, Attendance, & Payroll Workflow Verification
**Goal**: Verify all core workforce management, attendance, leave, and statutory payroll calculation flows.
**Depends on**: Phase 3
**Requirements**: REQ-ATT-01, REQ-LEV-01, REQ-SFT-01, REQ-REC-01, REQ-PAY-01, REQ-PAY-02
**Success Criteria**:
  1. Punch ingestion, leave requests, and shift rosters execute with database persistence.
  2. Payroll calculation correctly accounts for LOP days and dual-regime tax slabs.
  3. Bank export files generate valid NEFT/NACH records.

Plans:
- [x] 04-01: Execute test verification across Core HR, Attendance, Leave, and Statutory Payroll.

---

### Phase 5: Marketplace & Modular Add-on Architecture
**Goal**: Verify add-on entitlement enforcement and third-party communication gateways.
**Depends on**: Phase 4
**Requirements**: REQ-MKT-01, REQ-CHAT-01, REQ-COM-01, REQ-MOD-01, REQ-MOD-02
**Success Criteria**:
  1. `requireEntitlement` middleware guards modular routes properly.
  2. 8 modular directories under `server/src/modules/` remain healthy and tested.
  3. Razorpay payment webhook handler processes events idempotently.

Plans:
- [x] 05-01: Audit and verify modular add-on entitlements and integration gateways.

---

### Phase 6: Enterprise Regression Suite & Final Implementation Report
**Goal**: Execute comprehensive test regression, compile GSD state, and produce the authoritative implementation report.
**Depends on**: Phase 5
**Requirements**: All REQs
**Success Criteria**:
  1. Full backend test suites execute and pass.
  2. `reverseenginerring/FUNCTIONALITY_MASTER_REGISTRY.md` updated with final execution statuses.
  3. `reverseenginerring/FINAL_ENTERPRISE_IMPLEMENTATION_REPORT.md` generated and verified.

Plans:
- [x] 06-01: Run full regression test suite, verify TypeScript, and compile final report.

---

### Phase 7: Canonical Route Normalization & Alias Verification
**Goal**: Wire 7 canonical Express route aliases for biometric punch, attendance summary, leave approval, shift swap approval, OKR objectives, OKR check-ins, and Tally import, promoting all 7 PARTIAL items to VERIFIED.
**Depends on**: Phase 6
**Requirements**: REQ-RT-01, REQ-RT-02, REQ-RT-03, REQ-RT-04, REQ-RT-05, REQ-RT-06, REQ-RT-07
**Success Criteria**:
  1. `POST /api/biometric/punch` routes directly to `processBiometricPunch`.
  2. `GET /api/attendance/summary` returns work hours and punctuality statistics.
  3. `PUT /api/leave/requests/:id/approve` and `/reject` delegate to `LeaveService.decideApplication`.
  4. `PUT /api/shifts/swaps/:id/approve` and `/reject` process shift swaps atomically.
  5. `POST /api/addons/okr/objectives` and `POST /api/addons/okr/checkins` route to `okrRouter`.
  6. `POST /api/workspace/tally-import` maps Tally XML/JSON transactions to double-entry ledger.
  7. Native integration tests in `canonical-route-aliases.test.ts` pass with exit code 0.
  8. Zero TypeScript compilation errors.

Plans:
- [x] 07-01: Implement 7 canonical route aliases and verify via native test suite.

