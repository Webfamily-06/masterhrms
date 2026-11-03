# MASTERHRMS — PAYROLL IMPLEMENTATION ACCEPTANCE TEST PLAN
## Comprehensive Verification Strategy, Parity Benchmarks & Empirical Acceptance Gates

> **Document Type**: Acceptance Test Plan & Quality Assurance Framework  
> **Status**: APPROVED FOR PLANNING ONLY (Strict Read-Only Mode — Zero Code/Schema Changes)  
> **Reference File**: `Paysheet_ENABL_OCT_2026 -Final.xlsx`  
> **Target Cohort**: 11 Reference Contract Employees (Client: *Enable Engineering Private Limited*)  
> **Target Denominator**: 235 Total Workbook & Statutory Output Fields

---

## 1. Executive Summary & Quality Strategy

To transition from manual spreadsheets to 100% automated payroll with zero regression risk, this Acceptance Test Plan establishes a **4-tier empirical testing hierarchy**:

```
        ┌─────────────────────────────────────────────────────────┐
        │       TIER 4: END-TO-END WORKFLOW E2E TESTS (10 Cases)   │
        │       Full 16-stage payroll run, approvals, invoice gen │
        ├─────────────────────────────────────────────────────────┤
        │       TIER 3: REFERENCE PARITY BENCHMARK (11 Employees) │
        │       Exact 0.00% variance comparison vs Excel sheet    │
        ├─────────────────────────────────────────────────────────┤
        │       TIER 2: INTEGRATION & SECURITY TESTS (25 Cases)   │
        │       Tenant isolation, RBAC, rollback, DB transactions │
        ├─────────────────────────────────────────────────────────┤
        │       TIER 1: MATHEMATICAL UNIT TESTS (40 Cases)        │
        │       Proration, EPF/ESI/PT/TDS formulas, decimal math  │
        └─────────────────────────────────────────────────────────┘
```

---

## 2. Tier 3: Reference Parity Benchmark (The Golden Cohort)

The ultimate proof of correctness is empirical mathematical parity against `Paysheet_ENABL_OCT_2026 -Final.xlsx`.

### 2.1 The 11 Reference Benchmark Personas (Synthetic Test Data)
To prevent PII exposure, synthetic identifiers represent the 11 benchmark profiles:

| Test Persona ID | Reference Role | Fixed Basic | Fixed Special | Fixed Bonus | Month Days | Payable Days | LOP Days | Expected Earned Gross | Expected Net Pay | Expected Billable CTC | Expected MMU (10%) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `TC-EMP-01` | GET | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-02` | GET | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-03` | GET | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-04` | Jr. Engineer | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-05` | Trainee | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-06` | Trainee | ₹21,100 | ₹2,100 | ₹0 | 31 | 31.0 | 0.0 | ₹23,200.00 | ₹17,998.00 | ₹26,590.00 | ₹2,598.40 |
| `TC-EMP-07` | Engineer | ₹22,500 | ₹2,500 | ₹0 | 31 | 31.0 | 0.0 | ₹25,000.00 | ₹19,394.00 | ₹28,653.00 | ₹2,800.00 |
| `TC-EMP-08` | Engineer | ₹22,500 | ₹2,500 | ₹0 | 31 | 31.0 | 0.0 | ₹25,000.00 | ₹19,394.00 | ₹28,653.00 | ₹2,800.00 |
| `TC-EMP-09` | Sr. Engineer | ₹25,000 | ₹3,000 | ₹0 | 31 | 31.0 | 0.0 | ₹28,000.00 | ₹21,721.00 | ₹32,091.00 | ₹3,136.00 |
| `TC-EMP-10` | Sr. Engineer | ₹25,000 | ₹3,000 | ₹0 | 31 | 31.0 | 0.0 | ₹28,000.00 | ₹21,721.00 | ₹32,091.00 | ₹3,136.00 |
| `TC-EMP-11` | Lead Engineer| ₹27,000 | ₹3,500 | ₹0 | 31 | 31.0 | 0.0 | ₹30,500.00 | ₹23,660.00 | ₹34,956.00 | ₹3,416.00 |

### 2.2 Mathematical Tolerance Criteria
* **Core Wages (Basic, Special, Gross)**: Must match with **0.00% variance** (exact rupee and paise match).
* **Statutory Contributions (EPF/ESI)**:
  - In Contract Gross mode: 0.00% variance.
  - In Statutory Capped mode: Must match statutory formula rules (Basic+DA capped at ₹15,000; ESI ceiling ₹21,000).
* **Client Billing Totals**:
  - Total Billable CTC: Must match $\sum(\text{CTC})$.
  - Contractor MMU: Exactly $10.00\%$ of $(\text{Gross} + \text{EPFER})$.
  - GST: Exactly $18.00\%$ of $(\text{CTC} + \text{MMU})$ with standard rounding.

---

## 3. Tier 1: Mathematical Unit Test Specifications (40 Cases)

```typescript
// server/src/tests/payroll-math-acceptance.test.ts (Test Case Template)
describe("Workstream A: Core Mathematical Engine Parity", () => {
  it("TC-MATH-01: Proration factor precision with decimal half-days", () => {
    const factor = calculateProrationFactor(30.5, 31);
    expect(factor).toBeCloseTo(0.9838709677, 8);
  });

  it("TC-MATH-02: Next-higher-rupee rounding for ESI employee contribution", () => {
    // Gross = 20,500 -> 20500 * 0.0075 = 153.75 -> must round UP to 154
    const esi = calculateStatutoryESI(20500);
    expect(esi.employeeEsi).toBe(154);
  });

  it("TC-MATH-03: ESI wage ceiling exemption threshold", () => {
    // Gross = 21,001 -> exceeds 21,000 -> must evaluate to 0
    const esi = calculateStatutoryESI(21001);
    expect(esi.isEligible).toBe(false);
    expect(esi.employeeEsi).toBe(0);
    expect(esi.employerEsi).toBe(0);
  });

  it("TC-MATH-04: Tamil Nadu Municipal PT half-yearly amortized slabs", () => {
    const pt = calculateProfessionalTax(25000, "TN", 10);
    // Half-yearly gross = 150,000 (> 75,000) -> 1250 / 6 = 208.33
    expect(pt).toBe(208.33);
  });
});
```

---

## 4. Tier 2: Integration & Security Test Specifications (25 Cases)

| Test ID | Test Category | Description | Verification Assertion |
| :---: | :--- | :--- | :--- |
| **`TC-SEC-01`** | Tenant Isolation | Tenant B attempts to view Tenant A's payroll run | `404 Not Found` or `403 Forbidden` (fail-closed) |
| **`TC-SEC-02`** | Role Privilege | `employee` role calls `/api/payroll/cycles/:id/calculate` | `403 Forbidden: Insufficient permissions` |
| **`TC-SEC-03`** | Dual Approval | HR Manager attempts to self-approve a cycle they submitted | `400 Bad Request: Submitter cannot approve cycle` |
| **`TC-SEC-04`** | Immutability | Update or re-run attempted on cycle with `status = COMPLETED` | `409 Conflict: Completed cycle is immutable` |
| **`TC-SEC-05`** | PII Masking | Standard HR user queries employee statutory details | Aadhaar masked (`XXXXXXXX1234`), bank account masked |
| **`TC-SEC-06`** | Transaction Rollback | Injected failure during General Ledger posting | 100% database mutations roll back; cycle stays in `APPROVED` |

---

## 5. Tier 4: End-to-End Workflow Acceptance Tests (10 Cases)

### Test Case E2E-01: Complete 16-Stage Contract Staffing Lifecycle
1. **Initialize Period**: Call `POST /api/payroll/cycles` for `OCT 2026`.
2. **Lock Attendance**: Call `POST /api/payroll/cycles/:id/lock-attendance`.
3. **Calculate Batch**: Call `POST /api/payroll/cycles/:id/calculate`.
4. **Assert Pre-Run Variance**: Verify variance report returns `isPassed: true`.
5. **HR Sign-Off**: Call `PATCH /api/payroll/cycles/:id/submit-review`.
6. **Finance Approval**: Call `PATCH /api/payroll/cycles/:id/approve` using Finance Director credentials.
7. **Finalize Cycle**: Call `POST /api/payroll/cycles/:id/finalize`.
8. **Verify Form U**: Call `GET /api/payroll/statutory-forms/form-u/:id` $\rightarrow$ assert 27 distinct columns.
9. **Verify Form V**: Call `GET /api/payroll/statutory-forms/form-v/:id` $\rightarrow$ assert 46 columns including 31 daily status columns.
10. **Verify Client Invoice**: Query `Invoice` table $\rightarrow$ assert invoice created for `ENABLE ENGINEERING PRIVATE LIMITED` matching `Summary` sheet total (`₹3,73,995.00`).
11. **Verify Bank Export**: Call `GET /api/payroll/cycles/:id/export-bank` $\rightarrow$ assert exact total matching net pay.

---

## 6. Execution Gates & Final Acceptance Sign-Off Criteria

Before any code is promoted to production, the test suite must satisfy the following **zero-tolerance gating criteria**:
* [ ] 100% of Tier 1 mathematical unit tests pass (40/40).
* [ ] 100% of Tier 2 integration & security tests pass (25/25).
* [ ] Reference Parity Benchmark achieves **0.00% variance** on earned gross and net pay across all 11 reference profiles.
* [ ] Forms U, V, W, X, and S generate authentic statutory files without generic fallbacks.
* [ ] Static code scanning confirms zero hardcoded allowance constants (₹1600 conveyance, ₹1250 medical removed).
* [ ] Zero regressions in existing HRMS modules (all 73 P0–P4 platform tests continue to pass 100%).

---

## 7. Quality Assurance Sign-Off

- **Audit Date**: 2026-11-03
- **Lead Quality Engineer**: MASTERHRMS Architecture QA
- **Document**: `docs/hrms-audit/PAYROLL_IMPLEMENTATION_ACCEPTANCE_TEST_PLAN.md`
- **Next Step**: Awaiting explicit user authorization before commencing implementation waves.

