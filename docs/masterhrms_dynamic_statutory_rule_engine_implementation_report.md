# MASTERHRMS — ENTERPRISE DYNAMIC STATUTORY RULE ENGINE & COMPLIANCE CONTROL CENTER

**Document Version:** 1.0.0-PROD-AUDIT  
**Date:** October 15, 2026  
**Classification:** Enterprise Payroll Architecture & Compliance Audit Report  
**Priority:** P1 — Architecture Audit & Controlled Implementation  
**Release Gate Status:** **BLOCKED** *(Enforced: Live payroll deductions remain disabled, live payslips unpublished)*

---

## 1. Executive Summary

This deliverable provides the complete architecture audit, implementation, and empirical verification of the **Enterprise Dynamic Statutory Rule Engine & Compliance Control Center** across MasterHRMS.

Prior to this implementation, while standard rule packs existed in database seeders, payroll calculations across multiple modules relied on hardcoded fallbacks and constants scattered across services. Statutory amendments required code changes and deployments rather than dynamic configuration through administrative governance.

With this implementation:
1. **Dynamic Versioned Rule Registry:** The Prisma schema and database have been extended with versioning, jurisdiction levels (Central / National, State, Establishment/Tenant Override), financial year scoping, publication statuses (`draft`, `under_review`, `approved`, `published`, `superseded`, `archived`), and immutable audit logging.
2. **Deterministic Precedence Engine:** Statutory rule resolution strictly follows a 3-tier hierarchy:
   $$\text{Tenant Specific Override} \succ \text{State Specific Rule} \succ \text{Central / National Global Rule}$$
3. **Dynamic Calculation Engine Integration:** EPF, ESI, Professional Tax (PT), Labour Welfare Fund (LWF), Gratuity, and Income Tax (TDS Section 392 / ITA 2025) now resolve dynamic parameters and slabs directly from active statutory records.
4. **Historical Immutability & Reproducibility:** Every calculated payroll run and employee snapshot now records a comprehensive `statutoryManifest` capturing the exact rule IDs, versions, statutory ceilings, rates, and effective dates applied at that point in time. Historical payslips remain permanently reproducible even after future amendments are published.
5. **Super Admin Compliance Control Center:** Built both full backend APIs and an enterprise-grade Frontend Console supporting searchable rule exploration, draft creation, maker-checker approval workflows, publication/scheduled activation, rollback mechanisms, and multi-tier employee scenario impact simulations.
6. **Empirical Verification:** 100% of automated tests pass across all 10 statutory amendment and regression requirements.
7. **Release Gate:** Explicitly preserved as **BLOCKED**.

---

## 2. Phase 1 — Comprehensive Hardcoding & Dynamic Coverage Audit

The initial repository audit covered database schemas, Prisma models, seeders, calculation services, and routes.

| Statutory Domain | Jurisdiction | Pre-Implementation State | Post-Implementation State | Dynamic Source of Truth |
| :--- | :--- | :--- | :--- | :--- |
| **Provident Fund (EPF)** | Central / National | Partially Dynamic (DB seed exists; engine used hardcoded 15,000 ceiling fallback) | **Fully Dynamic** | `StatutoryRule` (`ruleType = "EPF"`) |
| **State Insurance (ESI)** | Central / National | Partially Dynamic (hardcoded 21k/25k ceilings & 0.75%/3.25% rates in engine) | **Fully Dynamic** | `StatutoryRule` (`ruleType = "ESI"`) |
| **Professional Tax (PT)** | State-Specific (TN, MH, KA, TS, etc.) | Partially Dynamic (Hardcoded switch matrix with partial DB override) | **Fully Dynamic** | `StatutoryRule` (`ruleType = "PT"`, `stateCode`) |
| **Labour Welfare Fund (LWF)** | State-Specific (TN, KA, MH) | **Hardcoded / Missing** (not tracked as separate statutory deduction) | **Fully Dynamic** | `StatutoryRule` (`ruleType = "LWF"`, `stateCode`) |
| **Gratuity Accrual** | Central / National | **Hardcoded** (computed ad-hoc without versioned rule linkage) | **Fully Dynamic** | `StatutoryRule` (`ruleType = "GRATUITY"`) |
| **TDS (ITA 2025 / AY 2026-27)** | Central / National | Fully Dynamic (Sec 392, Sec 156 rebate, Marginal Relief, New & Old Regimes) | **Fully Dynamic + Audited** | `StatutoryRule` (`ruleType = "TDS_ITA2025"`) |
| **Statutory Forms** | Central & State | Partially Dynamic (Form schemas in DB; eligibility hardcoded in service) | **Versioned & Governed** | `StatutoryRule` (`ruleType = "STATUTORY_FORM"`) |

---

## 3. Phase 2 — Versioned Statutory Rule Registry & Database Architecture

### 3.1 Extended Prisma Schema (`server/prisma/schema.prisma`)

```prisma
model StatutoryRule {
  id                  String    @id @default(uuid()) @db.VarChar(36)
  tenantId            String?   @map("tenant_id") @db.VarChar(36)
  ruleIdentifier      String    @default("") @map("rule_identifier") @db.VarChar(100)
  ruleType            String    @map("rule_type") @db.VarChar(50) // EPF, ESI, PT, GRATUITY, TDS_ITA2025, LWF, BONUS, STATUTORY_BENEFIT
  category            String    @default("CENTRAL_STATUTORY") @map("category") @db.VarChar(50)
  jurisdictionLevel   String    @default("CENTRAL") @map("jurisdiction_level") @db.VarChar(20) // CENTRAL, STATE, ESTABLISHMENT
  stateCode           String?   @map("state_code") @db.VarChar(50) // ALL, MH, KA, TN, TS, WB, DL, GJ, etc.
  applicableCategory  String    @default("ALL") @map("applicable_category") @db.VarChar(100)
  configJson          Json      @map("config_json")
  version             Int       @default(1)
  effectiveFrom       DateTime  @default(now()) @map("effective_from")
  effectiveTo         DateTime? @map("effective_to") @db.Date
  financialYear       String?   @map("financial_year") @db.VarChar(20)
  sourceAuthority     String?   @map("source_authority") @db.VarChar(255)
  notificationRef     String?   @map("notification_ref") @db.VarChar(255)
  sourceUrl           String?   @map("source_url") @db.VarChar(500)
  publicationStatus   String    @default("published") @map("publication_status") @db.VarChar(30) // draft, under_review, approved, published, superseded, archived
  isVerified          Boolean   @default(true) @map("is_verified")
  verifiedBy          String?   @map("verified_by") @db.VarChar(100)
  createdBy           String?   @map("created_by") @db.VarChar(100)
  reviewedBy          String?   @map("reviewed_by") @db.VarChar(100)
  approvedBy          String?   @map("approved_by") @db.VarChar(100)
  publishedBy         String?   @map("published_by") @db.VarChar(100)
  publishedAt         DateTime? @map("published_at")
  signoffDate         DateTime? @map("signoff_date")
  status              String    @default("active") @db.VarChar(20)
  isActive            Boolean   @default(true) @map("is_active")
  isGlobal            Boolean   @default(false) @map("is_global")
  previousVersionId   String?   @map("previous_version_id") @db.VarChar(36)
  changeLog           String?   @map("change_log") @db.Text
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  tenant              Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  auditLogs           StatutoryRuleAuditLog[]

  @@index([tenantId, ruleType, isActive])
  @@index([ruleType, stateCode, effectiveFrom])
  @@index([publicationStatus, isActive])
  @@map("statutory_rules")
}

model StatutoryRuleAuditLog {
  id          String   @id @default(uuid()) @db.VarChar(36)
  ruleId      String   @map("rule_id") @db.VarChar(36)
  action      String   @db.VarChar(50) // DRAFT_CREATED, SUBMITTED_FOR_REVIEW, APPROVED, PUBLISHED, SUPERSEDED, ROLLBACK
  actorId     String?  @map("actor_id") @db.VarChar(100)
  actorEmail  String?  @map("actor_email") @db.VarChar(255)
  actorRole   String?  @map("actor_role") @db.VarChar(50)
  beforeState Json?    @map("before_state")
  afterState  Json?    @map("after_state")
  notes       String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  rule StatutoryRule   @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([ruleId, createdAt])
  @@map("statutory_rule_audit_logs")
}
```

### 3.2 Registry Service (`server/src/services/statutory-rule-registry.service.ts`)
The registry service enforces:
1. **Deterministic Rule Resolution:**
   - Filters by active date window: `effectiveFrom <= queryDate <= effectiveTo`.
   - Resolves Tenant Override first; if absent, State-specific rule; if absent, Central National rule.
   - Ambiguity Detection: If two active rules share identical version and effective dates for the same scope, the resolver fails closed and throws an error requiring administrative intervention.
2. **Maker-Checker Lifecycle:**
   - `createDraft(input)`: Generates rule in `draft` status, logs `DRAFT_CREATED`.
   - `submitForReview(ruleId, actor)`: Transitions to `under_review`, logs `SUBMITTED_FOR_REVIEW`.
   - `approveRule(ruleId, approver, role, enforceMakerChecker)`: Asserts `approver !== createdBy` to prevent self-approval. Transitions to `approved`, logs `APPROVED`.
   - `publishRule(ruleId, publisher, role)`: Automatically supersedes prior active rule for the same type/jurisdiction, sets `publishedAt`, activates rule, logs `PUBLISHED`.
   - `rollbackRule(ruleId, targetVersionId, actor, role)`: Deactivates current rule, reactivates previous approved version, logs `ROLLED_BACK`.

---

## 4. Phase 3 — Dynamic Calculation Engine Integration

The payroll calculation engine in [`server/src/services/payroll-engine.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/payroll-engine.service.ts) has been refactored to consume dynamic rule records:

1. **Provident Fund (`calculateStatutoryEPF`):**
   - Resolves `statutoryCeiling`, `employeeRate`, `employerEpfRate`, `employerEpsRate`, `epsMaxMonthly`, `edliRate`, `pfAdminRate` from the dynamic rule config.
   - Supports uncapped wages, statutory ceiling capping, and company-specific ceiling overrides.
2. **State Insurance (`calculateStatutoryESI`):**
   - Resolves `wageCeiling` (standard vs persons with disabilities), `employeeRate` (0.75%), `employerRate` (3.25%).
   - Capped at eligibility threshold without code modification.
3. **Professional Tax (`calculateProfessionalTax`):**
   - Resolves dynamic state slabs from database (`configJson.slabs`).
   - Supports state-specific periodic schedules (e.g., February special deduction in Maharashtra).
4. **Labour Welfare Fund (`calculateLabourWelfareFund`):**
   - Resolves state contribution schedules (e.g. TN half-yearly/annual in Dec, KA in Dec, MH in June & Dec).
   - Dynamically computes employee contribution, employer contribution, and total LWF liability.
5. **Gratuity Accrual (`calculateGratuityAccrual`):**
   - Computes monthly statutory accrual using dynamic days factor (15/26) and statutory maximum cap (₹20,00,000).
6. **Income Tax Withholding (`calculateAnnualTDS`):**
   - Dynamic standard deduction, slab rates, 87A / Section 156 rebate, and marginal relief algorithms for both New and Old tax regimes.

---

## 5. Phase 4 — Super Admin Compliance Control Center

### 5.1 Backend REST API Endpoints (`server/src/routes/compliance-control.routes.ts`)

| HTTP Method | Route | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/super/compliance/rules` | Searchable, filterable rule registry | Super Admin |
| `GET` | `/api/super/compliance/rules/:id` | Detailed rule inspection with audit trail | Super Admin |
| `POST` | `/api/super/compliance/rules/draft` | Create new versioned draft rule | Super Admin |
| `PUT` | `/api/super/compliance/rules/:id` | Update draft rule parameters | Super Admin |
| `POST` | `/api/super/compliance/rules/:id/submit` | Submit draft for compliance review | Super Admin |
| `POST` | `/api/super/compliance/rules/:id/approve` | Maker-checker compliance sign-off | Super Admin / Compliance Officer |
| `POST` | `/api/super/compliance/rules/:id/publish` | Publish & activate (supersedes prior) | Super Admin |
| `POST` | `/api/super/compliance/rules/:id/rollback` | Roll back to prior approved version | Super Admin |
| `POST` | `/api/super/compliance/simulate` | Multi-tier employee scenario simulation | Super Admin |
| `GET` | `/api/super/compliance/audit-trail` | Immutable audit trail query | Super Admin |
| `GET` | `/api/super/compliance/affected-tenants` | Identify tenants affected by amendment | Super Admin |

### 5.2 Super Admin UI Console (`src/routes/_authenticated/super/compliance.tsx`)
- **Rule Registry & Precedence View:** Filter by Rule Type (EPF, ESI, PT, LWF, Gratuity, TDS), Jurisdiction (Central or State: TN, MH, KA, TS, DL), and Publication Status (`published`, `approved`, `under_review`, `draft`, `superseded`).
- **Interactive Draft Creator:** Modal interface to schedule effective dates, specify gazette notification references, set source authority, and configure JSON rules with live validation.
- **Side-by-Side Impact Simulator:** Runs simulations across 5 representative salary tiers (₹15,000, ₹25,000, ₹65,000, ₹1,25,000, ₹2,50,000) comparing active baseline vs proposed amendment across EPF, ESI, PT, LWF, Net Pay, and total employer cost.
- **Audit Trail Viewer:** Non-repudiable timeline displaying every action, actor email, role, and before/after state diff.
- **Rollback Confirmation Modal:** Safeguarded rollback dialog preventing accidental deactivations.

---

## 6. Phase 5 — Historical Reproducibility & Statutory Manifest

To ensure historical finalized payrolls can never be altered by future statutory publications:
- The `PayrollRun` model stores `statutoryManifest Json? @map("statutory_manifest")`.
- The `PayrollSnapshot` model stores `statutoryManifest Json? @map("statutory_manifest")`.
- During payroll batch execution (`PayrollBatchService`), every employee's breakdown records the exact rule IDs, versions, statutory ceilings, rates, and effective dates into the snapshot.
- Historical payslip generation reads from `PayrollSnapshot.statutoryManifest`, guaranteeing 100% deterministic reproducibility.

---

## 7. Phase 6 — Automated Regression & Configuration-Change Verification Report

All 10 required assertions were executed via Vitest with independent expected values:

```
 RUN  v5.0.3 C:/Users/TSV Global Solutions/Documents/hrms/server

 ✓ src/tests/statutory-tds-reconciliation.test.ts (26 tests) 11ms
 ✓ src/tests/statutory-rule-engine-and-control-center.test.ts (10 tests) 6686ms
   ✓ MASTERHRMS — Enterprise Dynamic Statutory Rule Engine & Compliance Control Center (Phase 6 Test Suite) (10)
     ✓ Requirement 1: Changing an approved parameter changes calculation dynamically without code deployment (2ms)
     ✓ Requirement 2: Future-dated rule does not affect earlier payroll periods (1866ms)
     ✓ Requirement 3: Expired or missing mandatory rules fail safely without silent corruption (124ms)
     ✓ Requirement 4: Jurisdiction and employee eligibility determine the exact statutory rule (1ms)
     ✓ Requirement 5: Previous payroll calculations retain their original rule-version manifest (0ms)
     ✓ Requirement 6: Draft or unapproved rules never affect production calculations (496ms)
     ✓ Requirement 7: Inverted effective-date ranges (effectiveTo < effectiveFrom) are strictly rejected (2ms)
     ✓ Requirement 8: Tenant A cannot read or modify Tenant B's statutory configurations (1968ms)
     ✓ Requirement 9: Maker-Checker prevents rule creator from approving their own rule; logs full audit trail (1375ms)
     ✓ Requirement 10: Multi-tier statutory amendment simulation evaluates representative scenarios with exact variances (1ms)

 Test Files  2 passed (2)
      Tests  36 passed (36)
   Start at  11:38:46
   Duration  6.94s (tests 97%, transform 2%, import 1%)
```

In addition, the full advanced payroll Phase 1 golden test suite was executed:
```
ADVANCED PAYROLL PHASE 1 — VERIFICATION & GOLDEN TEST SUITE
TEST SUMMARY: 64 PASSED, 0 FAILED
```

---

## 8. Sample Amendment Simulation: EPF Wage Ceiling Revision

To demonstrate how a statutory amendment is introduced without modifying source code:
1. **Scenario:** Government gazette increases statutory EPF ceiling from ₹15,000 to ₹21,000 effective April 1, 2027.
2. **Draft Rule Created:** `ruleIdentifier: "EPF_CENTRAL_AMENDMENT_2027"`, `effectiveFrom: "2027-04-01"`, `configJson: { statutoryCeiling: 21000, employeeRate: 0.12 }`.
3. **Simulation Impact Evaluation:**
   - **Junior Staff (Gross ₹15,000 / Basic ₹7,500):** Both ceilings exceed basic salary. EPF Employee: ₹900.00 → ₹900.00 (Variance: ₹0.00).
   - **Senior Staff (Gross ₹65,000 / Basic ₹32,500):**
     - Baseline (₹15,000 cap): Employee EPF = ₹1,800.00, Employer EPF/EPS = ₹1,800.00.
     - Proposed (₹21,000 cap): Employee EPF = ₹2,520.00, Employer EPF/EPS = ₹2,520.00.
     - Net Variance: Employee takes home ₹720.00 less, Employer contribution increases by ₹720.00.
4. **Approval & Activation:** Compliance Officer approves the rule. On April 1, 2027, the engine resolves the new version automatically. Prior payroll runs (FY 2026-27) remain locked with their v1 `statutoryManifest`.

---

## 9. Security, Tenant Isolation, and Migration Assessment

1. **Role-Based Authorization:** All compliance endpoints are guarded by `requireAuth` and `requireSuperAdmin`. Regular tenant users and unauthorized roles are blocked with HTTP 403.
2. **Maker-Checker Enforcement:** Enforced in `StatutoryRuleRegistryService.approveRule`. If the creator attempts to approve their own draft, an explicit `Maker-Checker violation` exception is thrown.
3. **Multi-Tenancy Isolation:** Global rules have `tenantId = null` and are read-only to tenants. Tenant overrides must match the authenticated tenant's ID; cross-tenant queries return zero records and cross-tenant mutations are blocked.
4. **Zero-Downtime Migration:** Schema changes were pushed cleanly to Supabase PostgreSQL without dropping any tables or columns. Backward compatibility was maintained for all existing payroll breakdown signatures.

---

## 10. Release Gate Statement

> [!CAUTION]
> **RELEASE GATE STATUS: BLOCKED**  
> In accordance with project instructions and regulatory protocols, live payroll deductions remain disabled and live payslips remain unpublished. This system is operating in hardened audit and validation mode. Production activation is strictly prohibited until formal written authorization is granted by the designated compliance reviewer and executive approver.
