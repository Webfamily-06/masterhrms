# MASTERHRMS — UI-TO-API-TO-DATABASE TRACEABILITY SPECIFICATION

**Document Version:** 2.0  
**Audit Reference:** MasterHRMS P0 Dynamic Financial Year & Change Census  
**Date:** 15 October 2026  
**Status:** Complete Traceability Verified  

---

## 1. ARCHITECTURAL TRACEABILITY OVERVIEW

MasterHRMS enforces strict three-tier separation and request-scoped tenant isolation across all enterprise workflows:
```
[ UI Layer: React 19 / TanStack Router ]
              ↓ (Axios client with JWT & Host Header)
[ API Layer: Express / Tenant Context Middleware ]
              ↓ (Prisma ORM with Tenant-Scoped Extensions)
[ Database Layer: PostgreSQL with Row-Level Tenant ID Scoping ]
```

---

## 2. DETAILED DOMAIN TRACEABILITY MATRIX

### 1. Financial Year & Tax Declarations (Form 12BB)

```
[UI Component: HrPayrollTaxPage / MeTaxPage]
  │
  ├── State: selectedFy ("2026-2027", "2025-2026", etc. via getSelectableFinancialYears())
  │
  ├── HTTP Request:
  │   GET /api/v1/hr/payroll/tax/declarations?financialYear={selectedFy}
  │   GET /api/v1/me/payroll/tax?financialYear={selectedFy}
  │   POST /api/payroll/tax-declarations
  │
  ├── Controller: server/src/routes/payroll.routes.ts & me-payroll.routes.ts
  │   ├── Validation: normalizeFinancialYear(req.query.financialYear)
  │   ├── Tenant Resolution: resolveTenantContext (enforces req.user.tenantId)
  │
  └── Database: PostgreSQL Table "employee_tax_declarations"
      ├── Columns:
      │   ├── tenant_id (VARCHAR, foreign key to tenants.id)
      │   ├── employee_id (VARCHAR, foreign key to employees.id)
      │   ├── financial_year (VARCHAR, e.g. "2026-2027")
      │   ├── tax_regime ("new" | "old")
      │   ├── section_80c (DECIMAL(12,2))
      │   ├── section_80d (DECIMAL(12,2))
      │   ├── section_80g (DECIMAL(12,2))
      │   ├── house_rent_paid (DECIMAL(12,2))
      │   ├── landlord_pan (VARCHAR)
      │   ├── is_regime_locked (BOOLEAN)
      │   └── locked_reason (VARCHAR)
      └── Composite Primary Key / Unique Constraint:
          UNIQUE (tenant_id, employee_id, financial_year)
```

---

### 2. Flexible Benefit Plan (FBP) Management

```
[UI Component: HrFbpManagementPage / MeFbpDeclarationPage]
  │
  ├── State: financialYear, selectedBasketItems (FUEL, TEL, MEAL, BOOKS, EDU, LTA)
  │
  ├── HTTP Request:
  │   GET /api/fbp/window-status?employeeId={id}
  │   GET /api/fbp/my-declaration?financialYear={fy}
  │   POST /api/fbp/declarations
  │
  ├── Controller & Service: server/src/routes/fbp.routes.ts & FbpService
  │   ├── Validation: checkWindowStatus() checks active corporate date window or 30-day DOJ grace period
  │   ├── Normalization: normalizeFinancialYear(req.body.financialYear)
  │   ├── Cap Enforcement: FUEL <= ₹2,400/mo, TEL <= ₹2,000/mo, MEAL <= ₹2,200/mo, etc.
  │
  └── Database: PostgreSQL Table "employee_fbp_declarations" & "employee_fbp_items"
      ├── Table: employee_fbp_declarations
      │   ├── id (UUID)
      │   ├── tenant_id (VARCHAR)
      │   ├── employee_id (VARCHAR)
      │   ├── financial_year (VARCHAR)
      │   ├── status ("draft" | "submitted" | "approved" | "rejected")
      │   └── total_annual_amount (DECIMAL(12,2))
      └── Table: employee_fbp_items
          ├── declaration_id (UUID, foreign key)
          ├── component_code (VARCHAR: "FUEL", "TEL", etc.)
          ├── monthly_claimed (DECIMAL(10,2))
          └── annual_claimed (DECIMAL(10,2))
```

---

### 3. Payroll Batch Processing & Statutory Engine

```
[UI Component: PayrollRunsPage]
  │
  ├── State: runMonth (1-12), runYear (2026), structureId
  │
  ├── HTTP Request:
  │   POST /api/payroll/process
  │   Payload: { periodMonth: 4, periodYear: 2026, employeeIds: [...] }
  │
  ├── Controller: server/src/routes/payroll.routes.ts (process endpoint)
  │   ├── Period Resolution:
  │   │   const payrollFY = getFinancialYearFromPeriod(periodMonth, periodYear);
  │   ├── Tax Declaration Match:
  │   │   taxDeclarations: { where: { financialYear: payrollFY } }
  │   ├── Engine Invocation:
  │   │   computeEmployeePayrollBreakdown(emp, attendance, options)
  │   │   ├── EPF: 12% on Basic up to ₹15,000 ceiling (or unceilinged option)
  │   │   ├── ESI: 0.75% / 3.25% if gross <= ₹21,000
  │   │   ├── PT: State-specific slabs (e.g. MH ₹200/mo, ₹300 Feb)
  │   │   └── TDS: Section 115BAC / Section 392 with ₹75,000 std deduction & ₹12L rebate threshold
  │   └── Regime Lock:
  │       Invokes lockRegimeOnFirstPayrollRun(tenantId, employeeId, payrollFY)
  │
  └── Database: PostgreSQL Tables "payroll_runs", "payslips", "journal_entries"
      ├── Table: payroll_runs
      │   ├── id (UUID)
      │   ├── tenant_id (VARCHAR)
      │   ├── period_month (INTEGER)
      │   ├── period_year (INTEGER)
      │   ├── status ("draft" | "calculated" | "finalized" | "paid")
      │   └── total_gross, total_net, total_tax, total_deductions
      └── Table: payslips
          ├── id (UUID)
          ├── payroll_run_id (UUID)
          ├── employee_id (VARCHAR)
          ├── gross_salary (DECIMAL(12,2))
          ├── net_salary (DECIMAL(12,2))
          ├── breakdown (JSONB: earnings, deductions, statutoryManifest, employerContributions)
          └── is_published (BOOLEAN: STRICTLY FALSE in blocked state)
```

---

### 4. Statutory Forms & Certificates (Form 16, Form 12BB, Form 138)

```
[UI Component: StatutoryFormsHubPage]
  │
  ├── State: selectedFormTemplate, selectedEmployeeId, selectedFY, selectedQuarter
  │
  ├── HTTP Request:
  │   GET /api/payroll/statutory-forms/form16/:employeeId?financialYear={selectedFY}
  │   GET /api/payroll/statutory-forms/form138?quarter={qtr}&financialYear={selectedFY}
  │   POST /api/forms/generate-pdf
  │
  ├── Controller & Service: server/src/services/statutory-form-data.service.ts
  │   ├── Role Verification: Employee role can only fetch own certificate
  │   ├── Finalized Data Aggregation: Aggregates from finalized `payslips` in target FY
  │   ├── Tamper Evidence: Generates SHA-256 fingerprint from deductor PAN, employee PAN, and tax amounts
  │
  └── Database: PostgreSQL Table "statutory_form_records"
      ├── id (UUID)
      ├── tenant_id (VARCHAR)
      ├── form_type ("FORM_16" | "FORM_12BB" | "FORM_138" | "FORM_121")
      ├── financial_year (VARCHAR)
      ├── assessment_year (VARCHAR)
      ├── verification_hash (VARCHAR: SHA-256)
      └── generated_pdf_path (VARCHAR)
```

---

## 3. TENANT ISOLATION & PERMISSION BOUNDARIES

1. **Host-Based Tenant Resolution:** `server/src/middleware/tenant-context.middleware.ts` extracts `tenantId` from JWT claim and validates against the resolved hostname (`req.headers.host`).
2. **Database Query Scoping:** Every database query executes through `getTenantDb()` or explicit `where: { tenantId }` filters. Cross-tenant access attempts return HTTP 403 or 404.
3. **Role-Based Access Control:**
   - `super_admin`: Full access to `/super/*` and central rule governance.
   - `hr_admin`: Access to tenant employees, attendance, leaves, payroll setup, and tax verification.
   - `payroll_manager`: Access to payroll runs, recalculations, and statutory returns.
   - `finance_admin`: Access to invoices, bank disbursement files, and secondary reimbursement approvals.
   - `employee`: Scoped strictly to `req.user.employeeId` under `/me/*`.

---

## 4. AUDITED FIVE BLOCKED ROUTES UI-API-DB TRACEABILITY

### 1. System Escalation Rules (`/super/escalation-rules`) — VERIFIED
- **UI:** `src/routes/_authenticated/super/escalation-rules.tsx` (`SuperEscalationRulesPage`)
- **API Endpoints:** `GET`, `POST`, `PUT`, `DELETE` on `/api/super/support/escalation-rules` (`server/src/routes/super.routes.ts`)
- **DB Model:** `prisma.cmsPage` (`slug: "system-escalation-rules"`, JSON payload containing `rules[]`)
- **RBAC:** `requireAuth`, `requireSuperAdmin`

### 2. Biometric Hardware Synchronization (`/biometric-sync`) — BLOCKED (Hardware)
- **UI:** `src/routes/_authenticated/_app/biometric-sync.tsx` (`BiometricSyncPage`)
- **API Endpoints:** `GET/POST /api/biometric/devices`, `POST /api/biometric/sync-now`, `POST /api/biometric/upload-punches`, `POST /api/biometric/adms-push` (`server/src/routes/biometric.routes.ts`)
- **DB Models:** `BiometricDevice`, `BiometricPunchLog`, `Attendance`
- **External Dependency:** Physical ZKTeco / Matrix attendance terminal on LAN (port 4370)

### 3. Employment Contracts & eSign (`/hr/documents/contracts`, `/me/documents/contracts`) — BLOCKED (Legal eSign)
- **UI:** `HrEmployeeContractsPage` and `MeContractsPage`
- **API Endpoints:** `GET/POST /hr/documents/contracts`, `GET /me/documents/contracts` (`server/src/routes/hr-documents.routes.ts`)
- **DB Models:** `Contract`, `ContractType`, `Employee`
- **External Dependency:** Licensed Class-3 USB DSC token or Aadhaar eSign ASP gateway (UIDAI/eMudhra) for legally binding digital signatures

### 4. Off-Cycle Payroll Batching (`/hr/payroll/runs`) — NOT APPLICABLE AS STANDALONE ROUTE
- **UI:** `PayrollRunsPage` (`src/routes/_authenticated/hr/payroll/runs.tsx`)
- **API Endpoints:** `POST /api/payroll/process` with `periodMonth`, `periodYear`, `tenantId`
- **DB Models:** `PayrollRun`, `Payslip`, `StatutoryRule`
- **Status:** Regular monthly runs verified; ad-hoc off-cycle adjustment batching unbuilt

### 5. TDS Challan 281 Direct e-Payment (`/forms`) — BLOCKED (Corporate Banking Gateway)
- **UI:** `StatutoryFormsHubPage` (`src/routes/_authenticated/forms.tsx`)
- **API Endpoints:** `GET /api/forms/templates`, `POST /api/forms/generate-pdf` (`server/src/routes/statutory-returns.routes.ts`)
- **DB Models:** `StatutoryFormRecord`, `Payslip`
- **External Dependency:** Direct Challan 281 banking e-payment gateway API credentials (TIN-NSDL / OLTAS)

---

## 5. RUNTIME END-TO-END DATA FLOW TRACEABILITY EVIDENCE

Empirical runtime trace executed against live backend on port 4000 with authenticated JWT:

1. **Current Financial Year (FY 2026–27 / ITA 2025):**
   - **Request:** `GET http://localhost:4000/api/v1/hr/payroll/tax/declarations?financialYear=2026-2027`
   - **Headers:** `Authorization: Bearer <valid_jwt>`, `Host: localhost:4000`
   - **Backend SQL Resolution:** Executes Prisma query scoped to `where: { tenantId, financialYear: '2026-2027' }`.
   - **Response:** HTTP 200 OK. Returns active declarations for FY 2026–27.

2. **Historical Financial Year (FY 2024–25 / ITA 1961):**
   - **Request:** `GET http://localhost:4000/api/v1/hr/payroll/tax/declarations?financialYear=2024-2025`
   - **Backend SQL Resolution:** Executes Prisma query scoped to `where: { tenantId, financialYear: '2024-2025' }`.
   - **Response:** HTTP 200 OK. Returns 0 historical records, confirming clean tenant-isolated period filtering with zero leakage across financial year boundaries.


