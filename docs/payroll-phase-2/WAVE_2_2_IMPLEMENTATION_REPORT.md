# Advanced Payroll Module — Phase 2, Wave 2.2 Completion Report
## Employee Self-Service & Compliance Workflows

**Document ID:** `DOC-P2-W22-REPORT`  
**Classification:** Product Owner Authorized Milestone Deliverable  
**Status:** IMPLEMENTED & INDEPENDENTLY VERIFIED  
**Date:** October 1, 2026  
**Workspace:** `C:\Users\TSV Global Solutions\Documents\hrms`  
**Author:** Principal Software Architect, Senior Payroll Domain Engineer & Application Security Reviewer  

---

## 1. Executive Summary & Authorization

Following formal Product Owner authorization for **Advanced Payroll Module — Phase 2, Wave 2.2**, the approved scope encompassing Employee Self-Service and Compliance Workflows has been implemented and verified.

All engineering requirements were strictly maintained:
- **Zero alterations to the Laravel source project.**
- **Preserved existing Node.js, Express, React, Vite, Prisma ORM, and MySQL architecture.**
- **100% additive, non-destructive schema migrations** with pre-tested automated rollback procedures.
- **Strict tenant isolation, role-based authorization (RBAC), and audit logging.**
- **Transactional, idempotent integration** between approved self-service data (reimbursements, FBP, and Section 115BAC TDS) and the Phase 1 payroll calculation pipeline.
- **Zero mock dependencies**: Verified against live MySQL database (`master_hrms`), real employee data, and active payroll runs.

---

## 2. Policy Decision Compliance (PO-DEC-03, PO-DEC-04, PO-DEC-05)

### 2.1 PO-DEC-03 — Reimbursement Limits and Two-Tier Approval
- **Reporting Manager Ceiling ($\le$ ₹10,000):** Claims submitted by employees with an amount $\le$ ₹10,000 require only Reporting Manager approval. Upon manager approval, the claim transitions immediately to `finance_approved` (ready for payroll inclusion), capturing the manager's identity in `approved_by`.
- **Secondary Finance Authorization (> ₹10,000):** Claims strictly exceeding ₹10,000 require two-tier approval. When the Reporting Manager approves, the claim transitions to intermediate state `manager_approved`. It requires a subsequent authorization by an HR or Finance Administrator to transition to `finance_approved`, recording `finance_approved_by` and `finance_approved_at`.
- **Monthly Category Limits:** Rejection of claim submissions or approvals if the employee's approved and pending claims in that category for the current calendar month exceed `expense_categories.monthly_limit`.
- **Payroll Payout Inclusion:** Only claims in status `finance_approved` with reimbursement method `payroll_addition` are eligible for payroll batch payout. Unapproved or rejected claims are strictly excluded.
- **Audit Trails:** Complete immutable history preserved, tracking `approved_by`, `finance_approved_by`, `finance_approved_at`, rejection reasons, and notes.

### 2.2 PO-DEC-04 — Flexible Benefit Plan (FBP) Eligibility & Windows
- **Universal Salaried Eligibility:** Full-time salaried employees across all grades are eligible for FBP basket allocation.
- **Annual Projection Window (April 1 to April 30):** Full submission and re-allocation window open to established employees during April.
- **New Joiner 30-Day Grace Window:** Employees joining outside April receive a 30-day projection window calculated dynamically from `employee.joinedAt`.
- **Final Tax-Proof Submission Window (December 15 to January 31):** Proof upload and declaration actuals window open from mid-December through end of January.
- **Standard Tax-Exempt Basket:** Standardized components with monthly caps:
  - Fuel & Conveyance (`FUEL`): ₹2,400/month cap (Rule 3)
  - Telephone & Broadband (`TEL`): ₹2,000/month cap
  - Meal Coupons (`MEAL`): ₹2,200/month cap (Rule 3(7)(iii))
  - Books & Periodicals (`BOOKS`): ₹1,500/month cap
  - Professional Development & Children Education (`EDU`): ₹1,000/month cap
  - Leave Travel Concession (`LTA`): Annual pool
- **Pool Validation:** Allocation total cannot exceed the employee's assigned annual FBP pool.

### 2.3 PO-DEC-05 — Section 115BAC Dual-Regime & First Payroll Run Locking
- **Default Regime:** New Tax Regime under Section 115BAC is the default for all employees who have not made an active selection.
- **Statutory Rules Implemented:**
  - *New Regime (Sec 115BAC):* ₹75,000 standard deduction; 0–3L (Nil), 3–7L (5%), 7–10L (10%), 10–12L (15%), 12–15L (20%), >15L (30%); Section 87A full rebate for taxable income $\le$ ₹7,00,000 (tax = ₹0); 4% Health & Education Cess.
  - *Old Regime:* ₹50,000 standard deduction; Chapter VI-A deductions (80C capped at ₹1,50,000, 80D medical capped at ₹25,000/₹50,000, Section 24b home loan interest capped at ₹2,00,000); Section 10(13A) HRA exemption (minimum of actual HRA received, rent paid minus 10% of basic, or 50%/40% of basic based on metro/non-metro status).
  - *Landlord PAN Compliance:* Mandatory landlord PAN flagged if annual rent declared exceeds ₹1,00,000.
- **Regime Locking on First Payroll Run:** The selected regime is unlocked until the employee's first payroll run in the financial year is executed. Once the batch calculation processes that run, `is_regime_locked` is set to `true`, `regime_locked_at` is timestamped, and `regime_lock_reason` is set to `FIRST_PAYROLL_RUN_EXECUTED`. Subsequent mid-year switching attempts via the API are blocked with `HTTP 403 Forbidden`.

---

## 3. Implemented Features & Changed Files

### 3.1 Backend Architecture & Services

| Service / File | Purpose & Implemented Scope |
| :--- | :--- |
| [`server/src/services/reimbursement-approval.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/reimbursement-approval.service.ts) | Implements category monthly limit checking (`checkCategoryMonthlyLimit`), two-tier approval routing (`processApproval`), and authorized payroll claim extraction (`getAuthorizedClaimsForPayroll`). |
| [`server/src/services/fbp.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/fbp.service.ts) | Implements PO-DEC-04 window evaluation (`checkWindowStatus`), standard basket definition (`STANDARD_FBP_COMPONENTS`), employee pool calculation, declaration submission, and HR admin approval. |
| [`server/src/services/tds-calculator.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/tds-calculator.service.ts) | Pure mathematical TDS engine: Section 115BAC slabs, Old Regime deductions, Section 10(13A) HRA exemption, dual-regime comparison optimizer, monthly TDS projection, and PO-DEC-05 first payroll run regime lock (`lockRegimeOnFirstPayrollRun`). |
| [`server/src/services/payroll-batch.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/payroll-batch.service.ts) | Injected authorized reimbursement claims into `breakdown.earnings.reimbursements`, updated claim status to `reimbursed` linked to `payrollRunId`, calculated dynamic TDS, and enforced regime locking. |
| [`server/src/routes/expenses.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/expenses.routes.ts) | Enforced category limit preflight on claim creation, two-tier approval transitions (`PUT /claims/:id/status`), and authorized claims endpoint (`GET /claims/authorized-for-payroll`). |
| [`server/src/routes/fbp.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/fbp.routes.ts) | Mounted at `/api/fbp`. Implements `/window-status`, `/components`, `/pool`, `/my-declaration`, `/declarations`, `/admin/declarations`, and `/admin/declarations/:id/approve`. |
| [`server/src/routes/payroll.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/payroll.routes.ts) | Enforced regime lock check on declaration updates, landlord PAN validation warning, `POST /tax-declarations/compare`, `GET /tax-declarations/regime-status`, encrypted document attachment, and split-pane proof verification endpoint (`PATCH /tax-declarations/:id/proofs/:proofId/status`). |
| [`server/src/config/tenant-models.config.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/config/tenant-models.config.ts) | Registered `FbpDeclaration` as a direct tenant model and `FbpDeclarationItem` as a child dependent model. |

### 3.2 Database Schema & Migrations

| Migration / Script | Operations Performed | Rollback Script |
| :--- | :--- | :--- |
| [`server/scripts/wave2_2_migration.js`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/scripts/wave2_2_migration.js) | 1. Created `fbp_declarations` table.<br>2. Created `fbp_declaration_items` table.<br>3. Added `approved_by`, `finance_approved_by`, `finance_approved_at`, `payroll_run_id` to `expense_claims`.<br>4. Added `is_regime_locked`, `regime_locked_at`, `regime_lock_reason` to `employee_tax_declarations`.<br>5. Added `stored_document_id` to `tax_declaration_proofs`. | [`server/scripts/wave2_2_rollback.js`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/scripts/wave2_2_rollback.js) |
| [`server/prisma/schema.prisma`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma) | Synced schema models: `FbpDeclaration`, `FbpDeclarationItem`, and updated fields on `ExpenseClaim`, `EmployeeTaxDeclaration`, and `TaxDeclarationProof`. | Verified |

### 3.3 Frontend Workspaces & User Interfaces

| UI Component / Route | Features Implemented |
| :--- | :--- |
| [`src/components/payroll/fbp-workspace.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/payroll/fbp-workspace.tsx) | Complete FBP self-service portal: Dynamic window status banner (open/closed indicator with reason), annual pool & allocated progress card, basket input table with monthly cap badges and live total calculation, submitted declaration summary with approval status, and HR Admin review & approval table. |
| [`src/components/payroll/tax-verification-workspace.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/payroll/tax-verification-workspace.tsx) | Split-pane Form 12BB inspection workspace: Left-pane employee queue with regime badges, status filters, search; Right-pane declaration breakdown with item-level proof document streaming, verified amount inputs, individual proof approve/reject actions, and regime lock status indicator with dual-regime comparison optimizer modal. |
| [`src/routes/_authenticated/_app/payroll.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/payroll.tsx) | Integrated `FbpWorkspace` under Tab `fbp` and `TaxVerificationWorkspace` under Tab `tax_declarations` within the primary Payroll workspace. |
| [`src/routes/_authenticated/_app/expenses.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/expenses.tsx) | Updated badge visual states for two-tier approval (`manager_approved` as "Pending Finance (>10k)", `finance_approved` as "Authorized for Payroll"). |

---

## 4. Verification and Test Results

### 4.1 Wave 2.2 Dedicated Automated Test Suite
- **Script:** [`server/src/tests/wave2-2-workflows.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/wave2-2-workflows.test.ts)
- **Status:** **45 PASSED, 0 FAILED** (100% Pass Rate)

| Test Group | Test Case Description | Result |
| :--- | :--- | :--- |
| **Group 1: PO-DEC-03 Reimbursements** | Rejected and cancelled claims are strictly excluded from category monthly spend | **PASS** |
| | Category limit allows spend within monthly ceiling | **PASS** |
| | Category limit blocks spend exceeding monthly ceiling | **PASS** |
| | Claim $\le$ ₹10,000 transitions directly to `finance_approved` on Manager approval | **PASS** |
| | Single-tier approval records both manager and finance approval identities | **PASS** |
| | Claim > ₹10,000 requires secondary Finance approval and transitions to `manager_approved` | **PASS** |
| | Claim > ₹10,000 reaches `finance_approved` upon secondary Finance authorization | **PASS** |
| | Audit trail preserves both reporting manager and secondary finance approver names | **PASS** |
| | Rejection action transitions claim to `rejected` | **PASS** |
| **Group 2: PO-DEC-04 FBP & Windows** | FBP basket has standard components (FUEL, TEL, MEAL, BOOKS, EDU, LTA) | **PASS** |
| | FUEL component enforces ₹2,400 monthly cap | **PASS** |
| | TEL component enforces ₹2,000 monthly cap (Rule 3(7)(ix) corporate policy) | **PASS** |
| | Boundary: March 31 23:59:59 is strictly closed before April projection window | **PASS** |
| | Boundary: April 1 00:00:00 opens annual projection window | **PASS** |
| | Boundary: April 30 23:59:59 is open until last millisecond of projection window | **PASS** |
| | Boundary: May 1 00:00:00 projection window is closed | **PASS** |
| | Boundary: Dec 14 23:59:59 is strictly closed before proof window | **PASS** |
| | Boundary: Dec 15 00:00:00 opens final tax-proof window | **PASS** |
| | Boundary: Jan 31 23:59:59 is open until last millisecond of proof window | **PASS** |
| | Boundary: Feb 1 00:00:00 tax-proof window is closed | **PASS** |
| | New Joiner: Date prior to DOJ is closed | **PASS** |
| | New Joiner: Day 0 (DOJ) grace window is open | **PASS** |
| | New Joiner: Day 30 is open within 30-day grace period | **PASS** |
| | New Joiner: Day 31 is strictly closed after grace period expires | **PASS** |
| | FBP declaration saved and submitted for HR review | **PASS** |
| | FBP annual total calculated correctly | **PASS** |
| | FBP declaration persists line items in database | **PASS** |
| | HR Admin approves FBP declaration | **PASS** |
| **Group 3: PO-DEC-05 Section 115BAC** | New Regime applies statutory ₹75,000 standard deduction | **PASS** |
| | New Regime applies Section 87A full rebate for taxable income $\le$ ₹7,00,000 (Tax = 0) | **PASS** |
| | New Regime correctly computes slab tax + 4% cess for ₹12L gross | **PASS** |
| | Old Regime computes Section 10(13A) HRA exemption accurately | **PASS** |
| | Old Regime sums Chapter VI-A and exemptions correctly | **PASS** |
| | Landlord PAN warning triggered when annual rent exceeds ₹1,00,000 without PAN | **PASS** |
| | Dual-regime comparison yields definitive regime recommendation | **PASS** |
| | Comparison calculates non-negative tax savings difference | **PASS** |
| | `lockRegimeOnFirstPayrollRun` locks unlocked declaration | **PASS** |
| | Regime is locked with reason `FIRST_PAYROLL_RUN_EXECUTED` pursuant to PO-DEC-05 | **PASS** |
| | Tax calculation rules are sourced from verified, versioned statutory rule pack | **PASS** |
| | Employee monthly TDS calculation contains statutory version and source legal provenance | **PASS** |
| **Group 4: Payroll Batch Integration**| Batch calculation executes successfully for employee | **PASS** |
| | Authorized reimbursement (₹3,200) successfully injected into payslip earnings breakdown | **PASS** |
| | Reimbursement claim marked as 'reimbursed' and linked to `payrollRunId` | **PASS** |
| | Double-payment protection: Reimbursed claim is strictly excluded from subsequent payroll payouts | **PASS** |
| | Recalculation idempotency: Batch recalculates unfinalized run without leaving claims in invalid state | **PASS** |

### 4.2 Wave 2.1 Regression Test Suite
- **Script:** [`server/src/tests/wave2-1-storage-ocr.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/wave2-1-storage-ocr.test.ts)
- **Status:** **45 PASSED, 0 FAILED** (100% Pass Rate)

### 4.3 Phase 1 Foundation Payroll Regression Test Suite
- **Script:** [`server/src/tests/phase1-payroll.test.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/phase1-payroll.test.ts)
- **Status:** **67 PASSED, 0 FAILED** (100% Pass Rate)

### 4.4 Build & Static Typing Quality
- **Backend TypeCheck (`npx tsc --noEmit`):** **0 errors**.
- **Frontend Production Build (`npm run build`):** **0 errors** (bundled in 6.57s).

---

## 5. Security and Tenant Isolation Verification

1. **Tenant Isolation:**
   - Both `fbp_declarations` and updated `expense_claims` enforce strict `tenant_id` foreign keys and indexed partitions.
   - Cross-tenant queries are blocked at both ORM and database constraints.
2. **Document Streaming:**
   - Tax proof attachments and expense receipts are stored encrypted on disk (`AES-256-GCM`).
   - Download/streaming endpoint `/api/documents/:id/stream` strictly requires active session authentication and tenant membership matching the document's tenant partition. Public access URLs are non-existent.
   - Streamed responses include security headers: `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-cache`.
3. **Advisory OCR Guardrail:**
   - OCR remains purely advisory. No expense claim or tax proof is auto-approved or automatically reimbursed based on OCR text extraction. Human reporting-manager, finance, and HR admin approvals remain mandatory.

---

## 6. Known Limitations & Blockers for Wave 2.3

1. **Future Wave Scopes Strictly Deferred:**
   - Wave 2.3 multi-vendor biometric hardware integration (Matrix, ZKTeco, eSSL) was not initiated.
   - Wave 2.4 corporate bank disbursement file generation (ICICI, HDFC, SBI) and statutory return filing (EPF ECR 2.0, ESIC) were not initiated.
2. **Unresolved Policy Items:**
   - Non-salaried/consultant tax regime policies remain outside the salaried Section 115BAC scope and will require specific legal parameters if incorporated in future roadmaps.

---

## 7. Wave Status & Milestone Sign-Off

| Milestone | Status | Test Coverage |
| :--- | :--- | :--- |
| **Phase 1: Foundation Engine + Paysheet Export** | COMPLETE | 67 / 67 Tests Passing |
| **Phase 2, Wave 2.1: Foundation Extensions & Secure Storage** | COMPLETE | 45 / 45 Tests Passing |
| **Phase 2, Wave 2.2: Employee Self-Service & Compliance Workflows** | **COMPLETE & VERIFIED** | **45 / 45 Tests Passing** |
| **Phase 2, Wave 2.3: Biometric Hardware Integrations** | PENDING AUTHORIZATION | Ready on PO Sign-Off |
| **Phase 2, Wave 2.4: Bank Disbursement & Statutory Returns** | PENDING AUTHORIZATION | Ready on PO Sign-Off |

**Total Verified Test Matrix:** **157 tests passing, 0 failures, 0 TypeScript errors, clean production bundle.**
