# MASTERHRMS — PAYROLL AUTOMATION IMPLEMENTATION ROADMAP
## Strategic Transition Plan: From Spreadsheet Reference to 100% Automated Monthly Payroll

> **Document Type**: Master Implementation Roadmap & Phased Execution Strategy  
> **Reference File**: `Paysheet_ENABL_OCT_2026 -Final.xlsx`  
> **Associated Audit Reports**:  
> 1. `PAYROLL_AUTOMATION_MASTER_GAP_ANALYSIS.md`  
> 2. `EXCEL_TO_HRMS_FIELD_MAPPING_MATRIX.md`  
> 3. `PAYROLL_DYNAMIC_CALCULATION_AUDIT.md`  
> 4. `STATUTORY_FORMS_RECONCILIATION.md`  
> 5. `MONTHLY_PAYROLL_AUTOMATION_WORKFLOW_AUDIT.md`  
> 6. `PAYROLL_HARDCODED_VALUE_AUDIT.md`  
> **Status**: Read-Only Pre-Implementation Strategy (Zero code changes made; awaiting explicit authorization)

---

## 1. Executive Summary & Audit Scorecard

The comprehensive audit of the uploaded reference workbook (`Paysheet_ENABL_OCT_2026 -Final.xlsx`) against the MASTERHRMS codebase evaluated **235 distinct data points, calculations, statutory fields, and commercial outputs**.

### Complete Audit Field Breakdown
```
Total Fields Evaluated        : 235
├── Fully Populated in HRMS   : 112 (47.7%)
├── Partially Mapped / Derived:  68 (28.9%)
└── Missing in Current HRMS   :  55 (23.4%)
```

### Critical Findings Summary
1. **Core Engine Strength**: Standard employee payroll calculation, proration, temporal salary versioning, attendance integration, and tax withholding (Section 192) are mature, production-grade, and mathematically compliant.
2. **Statutory Superiority over Reference Excel**: The existing HRMS engine implements post-2019 statutory amendments (ESI 3.25% / 0.75%, ₹21k wage ceiling, EPF ₹15k wage ceiling, Tamil Nadu municipal PT slabs). The reference Excel workbook contained legally outdated rates (ESI 4.75% / 1.75% repealed in July 2019) and calculated EPF uncapped on gross wages.
3. **Primary Structural Gaps**:
   - **Contract Staffing Billing Disconnect**: Invoicing (`Invoice` table) is decoupled from payroll cycles; contractor markup (`MMU 10%`), billable CTC, and GST (`18%`) are missing from monthly payroll snapshots.
   - **Statutory Forms Aggregation**: Forms U, V, W, X, and S currently collapse into a single 18-column generic fallback (`WAGES_REGISTER_FORM_A`) rather than generating 5 dedicated statutory registers.
   - **Static Assumptions**: Several hardcoded fallbacks exist in export and calculation services (e.g. ₹1600 conveyance, ₹1250 medical, ₹200 PT, 50-20-15-5-5-5 salary splits).

---

## 2. Phased Implementation Roadmap (Phases A through D)

```mermaid
flowchart LR
    subgraph Phase A: Data & Schema
        A1[Migrate P0/P1 Schema Columns] --> A2[Wire StaffingClient to Snapshot]
        A2 --> A3[Configurable SalaryTemplates]
    end

    subgraph Phase B: Calculation Engine
        B1[Contract Gross PF Toggle] --> B2[Dynamic MMU & GST Engine]
        B2 --> B3[Next-Rupee ESI Rounding]
    end

    subgraph Phase C: Statutory Forms
        C1[Form U Exporter 27 cols] --> C2[Form V Muster Roll 46 cols]
        C2 --> C3[Form W Wage Register 34 cols]
        C3 --> C4[Form X Leave Register 21 cols]
        C4 --> C5[Form S Shift Notice 38 cols]
    end

    subgraph Phase D: Workflow & UI
        D1[Automated Monthly Orchestrator] --> D2[One-Click Client Invoicing]
        D2 --> D3[Payroll Hub UI & Bank Export]
    end

    Phase A --> Phase B
    Phase B --> Phase C
    Phase C --> Phase D
```

---

### Phase A: Data Models & Schema Enhancements
**Goal**: Ensure all required database fields exist, migrations are validated, and contract configurations are persisted.

- **Task A.1 — Production Database Migration Execution**:
  - Apply the accepted P0/P1 migrations containing native employee columns:
    - `father_or_spouse_name`
    - `permanent_address` & `present_address`
    - `completion_480_days_date`
    - `permanent_employment_date`
    - `maternity_nomination_date`
  - *Risk*: Data loss on production database.  
  - *Mitigation*: Run backup dry-run before executing `prisma migrate deploy`.

- **Task A.2 — Staffing Client & Payroll Snapshot Schema Extension**:
  - Extend `PayrollSnapshot` model to capture commercial staffing metrics:
    - `mmuAmount Decimal(12,2) DEFAULT 0`
    - `mmuPercentage Decimal(5,2) DEFAULT 10.00`
    - `billableCtc Decimal(12,2) DEFAULT 0`
    - `gstAmount Decimal(12,2) DEFAULT 0`
    - `totalBillingAmount Decimal(12,2) DEFAULT 0`
    - `staffingClientId String?` (Foreign key to `StaffingClient`)
  - Add `staffingClientId` to `Employee` model to bind employees directly to client contracts.

- **Task A.3 — Configurable Salary Template Models**:
  - Introduce `SalaryTemplate` and `SalaryTemplateComponent` tables to replace hardcoded 50-20-15-5-5-5 splits.
  - Support user-defined earnings formulas:
    - `BASIC = CTC * 0.50`
    - `SPECIAL = CTC * 0.30`
    - `STATUTORY_BONUS = BASIC * 0.0833`

---

### Phase B: Dynamic Calculation Engine & Contract Staffing Billing
**Goal**: Eliminate hardcoded fallbacks and provide dual-mode statutory/commercial computation.

- **Task B.1 — Dual-Mode PF & ESI Computation**:
  - In `server/src/services/payroll-engine.service.ts`:
    - Add `pfWageBasis` parameter: `STATUTORY_CAPPED` (Basic+DA capped at ₹15,000) vs `CONTRACT_GROSS` (12% of Gross Wages without cap).
    - Add legacy contract override toggle for ESI (allowing 4.75% / 1.75% where commercial client contracts legally require historical billing).
    - Implement legal rounding for ESI: `Math.ceil(employeeEsi)` (round up to next whole rupee per ESI Regulation 52).

- **Task B.2 — Contract Staffing Margin (MMU) & GST Calculation Engine**:
  - When calculating payroll for a `StaffingClient`:
    - `Billable CTC = Gross Wages + EPF Employer + EDLI + PF Admin + ESI Employer + Insurance + LWF Employer`
    - `MMU = (Gross Wages + EPF Employer) * (client.markupPercentage / 100)`
    - `Taxable Value = Billable CTC + MMU`
    - `GST = Taxable Value * 0.18`
    - `Total Client Bill = Taxable Value + GST`
  - Store calculations on each employee's `PayrollSnapshot`.

- **Task B.3 — Hardcoded Value Cleanup**:
  - Remove `fixConveyance = 1600` and `fixMedical = 1250` from `payroll-export.service.ts:222`. Read active components from `SalaryAssignment`.
  - Remove static establishment addresses from `invoices.routes.ts:1696`. Query legal entity profile from `Tenant`.
  - Remove `empPt = 200` and `empTds = Math.round(gross * 0.05)` from `statutory-form-data.service.ts`.

---

### Phase C: Statutory Forms Disaggregation (Forms U, V, W, X, S)
**Goal**: Replace the single generic fallback with 5 dedicated, legally authentic statutory registers.

- **Task C.1 — Form U Builder (Employee Register - 27 Columns)**:
  - Generate multi-column register including Father/Spouse name, DOB, DOJ, Addresses, Identifiers (PAN, Aadhaar, UAN, PF, ESI), and 480-day permanency date.
  - Implement export to formatted Excel and PDF.

- **Task C.2 — Form V Builder (Muster Roll - 46 Columns)**:
  - Generate 31-day attendance matrix with daily statuses (`P`, `A`, `WO`, `HL`, `OD`, `HD`), shift hours, and rest intervals.

- **Task C.3 — FORM W Builder (Register of Wages - 34 Columns)**:
  - Generate comprehensive wage register itemizing Basic, DA, HRA, Special Allowance, Statutory Bonus, Overtime, Gross, Deductions (EPF, ESI, PT, LWF, TDS), and Bank UTR payment references.

- **Task C.4 — Form X Builder (Leave & Social Security - 21 Columns)**:
  - Generate leave ledgers with opening, accrued, availed, and closing balances for Earned Leave, Sick Leave, and Casual Leave, plus maternity benefit entries.

- **Task C.5 — FORM S Builder (Shift Notice & Hours of Work - 38 Columns)**:
  - Generate notice of daily hours of work, rest intervals, weekly holidays, and shift schedules. Fix the `#NAME?` formula error found in cell `AL3` of the reference sheet.

---

### Phase D: End-to-End Monthly Workflow Orchestration, UI Dashboards & Bank Exports
**Goal**: One-click monthly payroll execution with automated client billing and bank payout exports.

- **Task D.1 — Unified Monthly Payroll Orchestrator**:
  - Implement a single automated pipeline:
    `Trigger Payroll Run -> Lock Attendance -> Version Salary -> Compute Gross & Deductions -> Generate Staffing Invoices -> Create Statutory Forms -> Export Bank File -> Publish Payslips`.

- **Task D.2 — Automated Contract Staffing Client Invoicing**:
  - Upon payroll approval, automatically create draft invoices in `Invoice` table:
    - Line item 1: Billable Employee CTC (Count of staff, total CTC)
    - Line item 2: Contractor Management Margin (MMU 10%)
    - Line item 3: Employer Admin Charges (EPF & EDLI Admin)
    - Tax line: CGST 9% + SGST 9% (or IGST 18%)
    - Attachment: Automated `OCT 2026 - Final` multi-tab Excel manifest.

- **Task D.3 — Payroll Command Center UI**:
  - Modern Next.js dashboard in CMS:
    - Real-time pre-run variance analyzer.
    - Two-tier approval modal (HR Manager -> Finance Director).
    - One-click statutory form bundle download (`.zip` containing Forms U, V, W, X, S).
    - One-click client invoice generation and dispatch.

---

## 3. Risk Assessment & Mitigation Matrix

| Risk ID | Description | Severity | Likelihood | Mitigation Strategy |
| :---: | :--- | :---: | :---: | :--- |
| **R-01** | Production database migration locks tables during business hours | High | Low | Schedule migration during scheduled maintenance window; use Prisma `--create-only` and manual review. |
| **R-02** | Contract gross PF calculation triggers EPFO audit inquiry | High | Medium | Provide explicit joint declaration flag (Para 26(6)) and keep statutory standard as recommended default. |
| **R-03** | Rounding differences of ±₹1 between Excel and HRMS | Low | High | Standardize round-half-up on all line items and round-up on ESI employee share to match government portals. |
| **R-04** | Client invoice discrepancies due to manual adjustments | Medium | Medium | Lock all adjustments before payroll approval; adjustments must be approved by HR admin. |

---

## 4. Verification & Acceptance Criteria

To declare 100% automated monthly payroll complete, the implementation must satisfy the following empirical verification gate:

1. **Parity Benchmark Test**:
   - Ingest all 11 employee inputs from `OCT 2026 - Final` into a staging tenant.
   - Run the automated payroll engine.
   - Assert **0.00% variance** across Net Pay, Total Deductions, Gross Wages, and Client Invoicing totals.
2. **Statutory Forms Validation**:
   - Generate Forms U, V, W, X, and S.
   - Verify every column matches Tamil Nadu Shops and Establishments Act statutory formats.
3. **Automated Client Invoice Generation**:
   - Verify that completing the payroll run automatically generates the commercial invoice matching the `Summary` sheet (`Billable CTC + MMU 10% + GST 18%`).
4. **Zero Hardcoded Values**:
   - Codebase static analysis confirms zero hardcoded allowance constants, static percentage splits, or hardcoded tenant emails.

---

## 5. Audit Conclusion & Next Steps

This concludes the comprehensive **Payroll Automation Gap Analysis** comparing `Paysheet_ENABL_OCT_2026 -Final.xlsx` against the MASTERHRMS architecture.

### Audit Deliverables Delivered to `docs/hrms-audit/`:
1. `PAYROLL_AUTOMATION_MASTER_GAP_ANALYSIS.md` (Executive gap analysis & architectural overview)
2. `EXCEL_TO_HRMS_FIELD_MAPPING_MATRIX.md` (Exhaustive 235-field reconciliation table)
3. `PAYROLL_DYNAMIC_CALCULATION_AUDIT.md` (Audit of all 21 payroll, statutory, and billing formulas)
4. `STATUTORY_FORMS_RECONCILIATION.md` (Forms U, V, W, X, S disaggregation analysis)
5. `MONTHLY_PAYROLL_AUTOMATION_WORKFLOW_AUDIT.md` (16-step monthly lifecycle audit)
6. `PAYROLL_HARDCODED_VALUE_AUDIT.md` (14 hardcoded constants & static assumptions catalog)
7. `PAYROLL_AUTOMATION_IMPLEMENTATION_ROADMAP.md` (Phased implementation strategy & verification gate)

> [!IMPORTANT]
> **Strict Read-Only Audit Adherence**:  
> No source code has been edited. No database migrations have been executed. No database records have been modified. No payroll has been triggered.  
> The system remains in a clean, stable state. Awaiting explicit authorization before commencing any implementation phase.

