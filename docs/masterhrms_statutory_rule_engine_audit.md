# MASTERHRMS — ENTERPRISE DYNAMIC STATUTORY RULE ENGINE & COMPLIANCE CONTROL CENTER
## PHASE 1: COMPREHENSIVE READ-ONLY STATUTORY CONFIGURATION & HARDCODING AUDIT

**Audit Date:** October 15, 2026  
**Application:** MasterHRMS Multi-Tenant HRMS & Payroll SaaS  
**Release Gate Status:** **BLOCKED** (Live payroll deductions disabled, live payslips unpublished)  
**Audit Scope:** Full codebase audit covering Database Schema (Prisma), Seeders, Payroll Calculation Engine, TDS Calculator, EPF, ESI, Professional Tax, Labour Welfare Fund, Gratuity, Statutory Forms, PDF & Export Generators, API Routes, and Super Admin / HR UI.  
**Constraint Enforced:** Read-only audit. Zero application calculation code modified during Phase 1.

---

## 1. Executive Summary & Key Findings

A thorough, repository-wide empirical audit reveals that while MasterHRMS introduced a `StatutoryRule` database model and seeded 13 official rule packs (`statutory-rules.seed.ts`), the actual calculation and compliance pipeline remains **heavily hardcoded or disconnected**:

1. **EPF Engine Disconnect (Hardcoded):**  
   `calculateStatutoryEPF()` in [`server/src/services/payroll-engine.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/payroll-engine.service.ts#L247-L266) does **not** accept or query statutory rules. It hardcodes the ₹15,000 statutory wage ceiling, 12% employee rate, 8.33% EPS rate (capped at ₹1,250), 3.67% employer EPF, 0.5% EDLI, and 0.5% admin charges, completely ignoring the seeded `EPF` rule pack.
2. **ESI Engine Disconnect (Hardcoded):**  
   `calculateStatutoryESI()` in [`server/src/services/payroll-engine.service.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/payroll-engine.service.ts#L268-L288) hardcodes the ₹21,000 wage ceiling, 0.75% employee rate, and 3.25% employer rate, ignoring the seeded `ESI` rule pack.
3. **Labour Welfare Fund (LWF) Disconnect (Missing from Engine):**  
   While state-specific LWF rules for Tamil Nadu, Karnataka, and Maharashtra are seeded in `statutory-rules.seed.ts`, LWF calculations are **completely absent** from `computeEmployeePayrollBreakdown()`. No LWF deductions are calculated or contributed during payroll runs.
4. **Professional Tax (Partially Dynamic with Hardcoded Engine Fallback):**  
   `calculateProfessionalTax()` accepts `customRules` and applies dynamic slabs if present, but the batch runner (`payroll-batch.service.ts`) does not load or pass statutory rules. When rules are not provided, it falls back to a hardcoded `switch-case` limited to 10 states.
5. **Income Tax TDS (New Regime Partially Dynamic; Old Regime Hardcoded):**  
   In `calculateAnnualTDS()`, the New Regime can read custom slabs from `statutoryRules`. However, the Old Regime hardcodes standard deduction (₹50,000), 80C cap (₹1,50,000), 80D cap (₹50,000), 24b cap (₹2,00,000), HRA limits, and old tax slabs, ignoring the seeded `oldRegime` configuration. Furthermore, `TdsCalculatorService` maintains duplicate static functions (`computeNewRegime`, `computeOldRegime`) that completely ignore database rules.
6. **Gratuity (Hardcoded):**  
   Gratuity accrual is hardcoded as `((15 * basicSalary) / 26 / 12)` in `payroll-engine.service.ts:720`, with no database model or configurable parameter registry.
7. **Phantom UI Configuration (Configured in UI, Ignored by Engine):**  
   In [`src/routes/_authenticated/hr/payroll/setup.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/payroll/setup.tsx#L33-L46), the HR UI provides inputs for EPF Wage Ceiling, EPF Employee Rate, ESI Wage Ceiling, ESI Employee Rate, and ESI Employer Rate. However, `saveSettingsMutation` only displays a toast notification and does not save the values anywhere, and the backend engine ignores them.
8. **Super Admin Compliance Control Center (Missing):**  
   There is no Super Admin interface to manage, audit, draft, simulate, approve, or publish versioned statutory rules across central or state jurisdictions.
9. **Payroll Snapshot Provenance Gap (Partially Dynamic):**  
   `PayrollSnapshot` stores employee breakdown numbers but fails to record the explicit statutory rule IDs, pack versions, and effective dates that produced those numbers.
10. **Tenant Isolation vs. Central Governance Deficiency:**  
    `StatutoryRule` requires a foreign key to `tenantId`. Central statutory rules (EPF, ESI, ITA 2025 TDS) are duplicated across tenant rows rather than inherited from a centralized, immutable national registry with state overrides.

---

## 2. Complete Statutory Parameter Inventory & Audit Matrix

| # | Statutory Parameter / Rule | Current Source of Truth | DB Field / Config Key | Fallback / Default | Calculation Consumer | Jurisdiction & Applicability | Effective Date Support | Versioning & Audit History | Relevant Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **EPF Employee Rate (12%)** | Hardcoded code literal | `statutory_rules.configJson.employeeRate` | `0.12` | `payroll-engine.service.ts:250` (`calculateStatutoryEPF`) | Central; All employees with PF eligibility | None in engine; Seed has `2014-09-01` | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` (checks seed exists) | **HARDCODED** |
| **2** | **EPF Statutory Ceiling (₹15,000)** | Hardcoded code literal | `statutory_rules.configJson.statutoryCeiling` | `15000` | `payroll-engine.service.ts:249` (`calculateStatutoryEPF`) | Central; Mandatory for base wages <= ₹15,000 | None in engine; Seed has `2014-09-01` | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts`, UI setup dummy | **HARDCODED** |
| **3** | **EPF Employer EPS Rate (8.33%) & Cap (₹1,250)** | Hardcoded code literal | `statutory_rules.configJson.employerEpsRate` | `8.33333333%`, cap ₹1,250 | `payroll-engine.service.ts:253` (`calculateStatutoryEPF`) | Central; Members < 58 yrs | None in engine | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **4** | **EPF Employer EPF Residual (3.67%)** | Hardcoded code literal | `statutory_rules.configJson.employerEpfRate` | `employeePf - eps` | `payroll-engine.service.ts:254` (`calculateStatutoryEPF`) | Central; PF eligible | None in engine | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **5** | **EPF EDLI & Admin Rates (0.5% each)** | Hardcoded code literal | `statutory_rules.configJson.edliRate`, `pfAdminRate` | `0.005`, `0.005` | `payroll-engine.service.ts:255-256` (`calculateStatutoryEPF`) | Central; Employer statutory cost | None in engine | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **6** | **ESI Wage Ceiling (₹21,000 / ₹25,000 PwD)** | Hardcoded code literal | `statutory_rules.configJson.wageCeiling` | `21000` | `payroll-engine.service.ts:269` (`calculateStatutoryESI`), `compliance-rules.service.ts:53` | Central; Employees earning <= ceiling | None in engine; Seed has `2019-07-01` | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **7** | **ESI Employee Rate (0.75%)** | Hardcoded code literal | `statutory_rules.configJson.employeeRate` | `0.0075` | `payroll-engine.service.ts:279` (`calculateStatutoryESI`) | Central; ESI eligible | None in engine | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **8** | **ESI Employer Rate (3.25%)** | Hardcoded code literal | `statutory_rules.configJson.employerRate` | `0.0325` | `payroll-engine.service.ts:280` (`calculateStatutoryESI`) | Central; ESI eligible | None in engine | Seed has `version: 1`; Engine doesn't track | `phase1-payroll.test.ts` | **HARDCODED** |
| **9** | **Professional Tax Slabs & Rates (TN, KA, MH, TS, WB, GJ, DL)** | Partially dynamic DB rules with hardcoded engine switch | `statutory_rules.configJson.slabs` | Hardcoded switch (lines 183-241) for 10 states | `payroll-engine.service.ts:150` (`calculateProfessionalTax`) | State specific; Employees based on workplace state | Supported if rule loaded; fallback has no date check | `StatutoryRule.version`; batch runner ignores | `phase1-payroll.test.ts` | **PARTIALLY DYNAMIC** |
| **10** | **Maharashtra PT February Surcharge (₹300)** | Hardcoded switch & DB config | `statutory_rules.configJson.februarySpecialTax` | `300` in month 2, `200` otherwise | `payroll-engine.service.ts:173, 189` | State (MH); All liable employees | None in fallback | Tracked in seed | `phase1-payroll.test.ts` | **PARTIALLY DYNAMIC** |
| **11** | **Tamil Nadu Half-Yearly PT Averaging** | Hardcoded fallback `1095 / 6` & dynamic slab | `statutory_rules.configJson.slabs` | `1095 / 6` (~182.50) | `payroll-engine.service.ts:212` | State (TN); All liable employees | None in fallback | Tracked in seed | `phase1-payroll.test.ts` | **PARTIALLY DYNAMIC** |
| **12** | **Labour Welfare Fund (TN, KA, MH)** | Seeded in DB pack; completely missing in engine | `statutory_rules.configJson.employeeContribution`, `employerContribution`, `deductionMonths` | TN: ₹10/₹20; KA: ₹20/₹40; MH: ₹12/₹36 | None. Never invoked in `computeEmployeePayrollBreakdown` | State (TN, KA, MH, etc.); Establishment based | Seeded with dates; unexecuted in engine | Seeded `version: 1` | None | **MISSING / NOT INTEGRATED** |
| **13** | **Gratuity Accrual Formula & Ceiling** | Hardcoded code literal | None (No DB model) | `(15 * basicSalary) / 26 / 12`, Max ₹20,00,000 | `payroll-engine.service.ts:720`, `compliance-rules.service.ts:57` | Central; All permanent employees | None | None | None | **HARDCODED** |
| **14** | **Income Tax New Regime Slabs (ITA 2025 Sec 392)** | Dynamic via `statutoryRules` with hardcoded fallback | `statutory_rules.configJson.newRegime.slabs` | 7 slabs (0%, 5%, 10%, 15%, 20%, 25%, 30%) | `payroll-engine.service.ts:345` (`calculateAnnualTDS`) | Central; All employees selecting New Regime | Supported via rule pack date | `StatutoryRule.version` recorded in TDS result | `statutory-tds-reconciliation.test.ts` | **PARTIALLY DYNAMIC** |
| **15** | **Income Tax New Regime Standard Deduction (₹75,000)** | Dynamic via `newRuleConfig` with hardcoded fallback | `statutory_rules.configJson.newRegime.standardDeduction` | `75000` | `payroll-engine.service.ts:330` (`calculateAnnualTDS`), `tds-calculator.service.ts:49` | Central; New Regime taxpayers | Supported via rule pack date | Tracked in TDS result | `statutory-tds-reconciliation.test.ts` | **PARTIALLY DYNAMIC** |
| **16** | **Section 156(2) Rebate (₹60,000 up to ₹12L)** | Dynamic via `newRuleConfig` with hardcoded fallback | `statutory_rules.configJson.newRegime.section156RebateThreshold` | `1200000` | `payroll-engine.service.ts:400` (`calculateAnnualTDS`), `tds-calculator.service.ts:50` | Central; Resident individual taxpayers | Supported via rule pack date | Tracked in TDS result | `statutory-tds-reconciliation.test.ts` | **PARTIALLY DYNAMIC** |
| **17** | **Health & Education Cess (4%)** | Dynamic via `tdsRule.configJson.cessRate` | `statutory_rules.configJson.cessRate` | `0.04` | `payroll-engine.service.ts:430`, `tds-calculator.service.ts:221` | Central; All income tax liabilities | Supported via rule pack date | Tracked in TDS result | `statutory-tds-reconciliation.test.ts` | **PARTIALLY DYNAMIC** |
| **18** | **Old Tax Regime Standard Deduction (₹50,000)** | Hardcoded code literal (ignores rule pack config) | `statutory_rules.configJson.oldRegime.standardDeduction` (ignored) | `50000` | `payroll-engine.service.ts:483`, `tds-calculator.service.ts:53` | Central; Old Regime taxpayers | None in calculation | Ignored | `phase1-payroll.test.ts` | **HARDCODED** |
| **19** | **Old Tax Regime 80C, 80D, 24b Limits** | Hardcoded code literals (ignores rule pack config) | `statutory_rules.configJson.oldRegime.section80CLimit` etc. (ignored) | 80C: ₹1.5L; 80D: ₹50K; 24b: ₹2L | `payroll-engine.service.ts:484-486`, `tds-calculator.service.ts:55-57` | Central; Old Regime taxpayers | None in calculation | Ignored | `phase1-payroll.test.ts` | **HARDCODED** |
| **20** | **Old Tax Regime Slabs & Section 87A Rebate** | Hardcoded code literals (ignores rule pack config) | `statutory_rules.configJson.oldRegime.slabs` (ignored) | 0–2.5L 0%, 2.5–5L 5%, 5–10L 20%, >10L 30%; Rebate ₹12,500 | `payroll-engine.service.ts:507-534`, `tds-calculator.service.ts:280-305` | Central; Old Regime taxpayers | None in calculation | Ignored | `phase1-payroll.test.ts` | **HARDCODED** |
| **21** | **HRA Exemption Formula (Section 10(13A))** | Hardcoded calculation percentages | None | Min(Actual HRA, Rent - 10% Basic, 40%/50% Basic) | `payroll-engine.service.ts:494`, `tds-calculator.service.ts:127` | Central; Taxpayers paying rent | None | None | None | **HARDCODED** |
| **22** | **Statutory Form Compliance Eligibility Rules** | Hardcoded constants & switch cases | None (No DB model) | `STATUTORY_RULES_CONFIG` in `compliance-rules.service.ts:51-62` | `compliance-rules.service.ts:67` (`evaluateComplianceRules`) | Central & State; 13 statutory forms | None | `VERSION: "2026-27-v1.4"` hardcoded | None | **HARDCODED** |
| **23** | **Export & PDF Vector Paysheet Headers / Slabs** | Hardcoded template strings | `payroll_export_templates.structureJson` | "EPF (12%)", "ESIC (0.75%)", "EPS (8.33%)", "GST (18%)" | `payroll-export.service.ts:97-130, 504` | Visual report generation | None | Hardcoded template | `phase1-payroll.test.ts` | **HARDCODED** |
| **24** | **HR Payroll Setup UI Statutory Fields** | Isolated UI React state | None (mutation does not call API) | EPF: ₹15K/12%; ESI: ₹21K/0.75%/3.25% | `src/routes/_authenticated/hr/payroll/setup.tsx:33-46` | Tenant HR configuration | None | None | None | **DUMMY / DISCONNECTED** |
| **25** | **Super Admin Compliance Control Center** | Missing | None | None | Does not exist | Central & Multi-tenant Super Admin | None | None | None | **MISSING** |
| **26** | **Payroll Snapshot Statutory Provenance** | Partially dynamic JSON | `payroll_snapshots.snapshot_data` | Only captures calculated values; no rule IDs or dates | `payroll-batch.service.ts:598`, `payroll.routes.ts:1609` | Historical audit trail | Run period month/year | Stored as locked JSON but lacks rule IDs | `statutory-tds-reconciliation.test.ts` | **PARTIALLY DYNAMIC** |

---

## 3. Detailed Component Analysis & Hardcoding Evidence

### 3.1 EPF Calculation (`server/src/services/payroll-engine.service.ts:247-266`)
```typescript
// EMPIRICAL EVIDENCE: Hardcoded EPF Calculation Function
export function calculateStatutoryEPF(basicSalary: number, capAtCeiling: boolean = false) {
  // Statutory wage ceiling is ₹15,000 / month
  const pfWage = capAtCeiling ? Math.min(15000, basicSalary) : basicSalary;
  const employeePf = Math.round(pfWage * 0.12 * 100) / 100;
  
  // Employer portion: 3.67% EPF + 8.33% EPS (capped at ₹1,250) + 0.5% EDLI + 0.5% Admin
  const eps = Math.min(1250, Math.round(pfWage * (8.33333333 / 100)));
  const epfEmployer = Math.max(0, employeePf - eps);
  const edli = Math.round(pfWage * 0.005 * 100) / 100;
  const adminCharges = Math.round(pfWage * 0.005 * 100) / 100;
  ...
}
```
**Defect:** No argument exists to pass `StatutoryRuleRecord` or dynamic parameters. Changing the wage ceiling (e.g. proposed hike to ₹21,000) or employee contribution rate requires an application code change and deployment.

### 3.2 ESI Calculation (`server/src/services/payroll-engine.service.ts:268-288`)
```typescript
// EMPIRICAL EVIDENCE: Hardcoded ESI Calculation Function
export function calculateStatutoryESI(monthlyEarnedGross: number) {
  const ESI_WAGE_CEILING = 21000;
  if (monthlyEarnedGross > ESI_WAGE_CEILING) {
    return { isEligible: false, employeeEsi: 0, employerEsi: 0, totalCost: 0 };
  }
  const employeeEsi = Math.round(monthlyEarnedGross * 0.0075 * 100) / 100; // 0.75%
  const employerEsi = Math.round(monthlyEarnedGross * 0.0325 * 100) / 100; // 3.25%
  ...
}
```
**Defect:** Ignores the database rule pack `ESI` which already has `wageCeiling: 21000`, `wageCeilingPwd: 25000`, `employeeRate: 0.0075`, and `employerRate: 0.0325`. Any wage ceiling or rate amendment requires a code redeployment.

### 3.3 Labour Welfare Fund Disconnect
In `computeEmployeePayrollBreakdown()` (`payroll-engine.service.ts:646-659`), statutory calculations are performed:
```typescript
const pfCalc = employee.pfEligible !== false ? calculateStatutoryEPF(basicSalary, false) : ...;
const esiCalc = employee.esiEligible !== false ? calculateStatutoryESI(totalEarnedGross) : ...;
const ptAmount = employee.ptEligible !== false && attendance.payableDays > 0
  ? calculateProfessionalTax(totalEarnedGross, employee.state || "MH", periodMonth, options?.statutoryRules) : 0;
// LWF IS COMPLETELY MISSING HERE!
```
**Defect:** LWF rules are seeded in `statutory-rules.seed.ts` for TN, KA, and MH, but are completely omitted from the payroll breakdown execution.

### 3.4 Old Tax Regime Hardcoding (`payroll-engine.service.ts:483-538`)
```typescript
// EMPIRICAL EVIDENCE: Hardcoded Old Tax Regime Parameters
standardDeduction = 50000;
section80C = Math.min(150000, Number(declarations?.section80C || 0));
section80D = Math.min(50000, Number(declarations?.section80D || 0));
section24b = Math.min(200000, Number(declarations?.homeLoanInterest || 0));
...
if (totalTaxableDec.greaterThan(1000000)) {
  rawTaxDec = rawTaxDec.plus(totalTaxableDec.minus(1000000).times(0.30)) ...
```
**Defect:** Although `tdsRule?.configJson?.oldRegime` exists in `statutory-rules.seed.ts`, the engine explicitly ignores it and hardcodes numbers.

### 3.5 Duplicate Disconnected Service (`server/src/services/tds-calculator.service.ts`)
`TdsCalculatorService` has a method `getEffectiveStatutoryRule()` that queries `prisma.statutoryRule`, but its actual calculation methods:
- `static computeNewRegime(input: TaxCalculationInput)`
- `static computeOldRegime(input: TaxCalculationInput)`  
are `static` and consume `TdsCalculatorService.NEW_STANDARD_DEDUCTION` and hardcoded static arrays. The dynamic database rule returned by `getEffectiveStatutoryRule()` is completely bypassed.

### 3.6 Phantom HR Setup UI (`src/routes/_authenticated/hr/payroll/setup.tsx:33-46`)
```typescript
// EMPIRICAL EVIDENCE: Phantom UI Configuration
const [epfCeiling, setEpfCeiling] = useState(15000);
const [epfEmployeeRate, setEpfEmployeeRate] = useState(12);
const [esiWageCeiling, setEsiWageCeiling] = useState(21000);
const [esiEmployeeRate, setEsiEmployeeRate] = useState(0.75);
const [esiEmployerRate, setEsiEmployerRate] = useState(3.25);

const saveSettingsMutation = useMutation({
  mutationFn: async () => {
    // Save setup settings
    toast.success("Payroll configuration parameters saved successfully");
  },
});
```
**Defect:** A classic "placebo UI". The user modifies statutory settings and receives a success toast, but the values are neither persisted in the database nor read by the payroll engine.

### 3.7 Missing Super Admin Compliance Control Center
In `src/routes/_authenticated/super/`:
- `settings.tsx`: Manages system parameters, SMTP, payment gateways, branding, and maintenance mode. Contains zero statutory rule management controls.
- No compliance cockpit exists for Super Admins to view central or state statutory rules, draft amendments, compare versions, run employee impact simulations, or trigger audited publications.

---

## 4. Missing-Coverage Matrix & Architecture Gap Analysis

| Architectural Domain | Current Implementation | Critical Gaps | Target Dynamic Architecture |
|---|---|---|---|
| **Statutory Rule Registry** | Table `statutory_rules` tied exclusively to `tenantId`. | 1. No Central / National rule registry.<br>2. Central rules duplicated per tenant.<br>3. No multi-stage approval lifecycle (Draft -> Review -> Approved -> Published).<br>4. No legal source URL or official gazette attachment. | Versioned Global Statutory Rule Registry with tenant inheritance and state precedence hierarchy. |
| **Engine Rule Consumption** | Engine only passes rules to `calculateProfessionalTax` and New Regime TDS. | 1. EPF is hardcoded.<br>2. ESI is hardcoded.<br>3. Old Regime TDS is hardcoded.<br>4. LWF is omitted completely.<br>5. Gratuity is hardcoded.<br>6. Batch processor does not inject rules into worker calculations. | All calculations consume resolved statutory rules from the approved registry with fail-closed safeguards. |
| **Safe Fallbacks & Validation** | Hardcoded code values used as silent fallbacks. | Stale or invalid rules fall back to hardcoded code, which may violate amended government laws without notifying administrators. | Fail-closed validation: If a mandatory rule is missing, expired, or ambiguous for a payroll period, block the run and alert compliance officer. |
| **Historical Immutability** | `PayrollSnapshot` stores gross/net breakdown JSON. | Does not snapshot rule IDs, version numbers, or effective dates used during the calculation. Recalculation after a rule update cannot verify if historical rules changed. | `PayrollSnapshot` and `PayrollRun` capture immutable statutory rule manifest (`statutoryManifest`) containing exact rule IDs, versions, and effective dates. |
| **Super Admin UI** | Missing completely. | Super Admins cannot configure, test, simulate, approve, or schedule statutory rule updates. | Dedicated Super Admin Compliance Control Center with registry search, diff viewer, impact simulation, and multi-user publication workflow. |
| **HR Tenant UI** | Disconnected inputs with placebo toast. | Tenancy configuration does not persist and does not affect calculation. | Verified tenant settings integrated with central rule resolution, showing active statutory versions and legal authorities. |

---

## 5. Phase 1 Audit Conclusion & Recommendations for Phase 2

1. **Audit Completion:**  
   Phase 1 audit is 100% complete with full empirical evidence collected across the database schema, services, routes, export generators, tests, and UI components.
2. **Phase Boundary Stop:**  
   In compliance with the mandate: *"Complete the audit before implementation, preserve existing verified behavior, and stop at each defined phase boundary for review"*, no calculation code has been modified.
3. **Proposed Phase 2 Blueprint:**
   - **Schema Migration:** Extend `StatutoryRule` to support `isGlobal: Boolean` (nullable `tenantId`), `lifecycleStatus` (`DRAFT`, `UNDER_REVIEW`, `APPROVED`, `PUBLISHED`, `SUPERSEDED`, `ARCHIVED`), `sourceUrl`, `jurisdictionLevel` (`CENTRAL`, `STATE`), and audit fields (`createdBy`, `reviewedBy`, `approvedBy`, `publishedBy`).
   - **Precedence Hierarchy:** Resolve rules deterministically: `Tenant Specific Override` > `State Specific Rule` > `Central / National Rule`.
   - **Formula & Dynamic Engine:** Refactor `calculateStatutoryEPF`, `calculateStatutoryESI`, `calculateAnnualTDS` (Old Regime), `calculateGratuity`, and integrate `calculateLWF` to dynamically read from the resolved rule registry.
   - **Snapshot Manifest:** Record the statutory manifest on every `PayrollRun` and `PayrollSnapshot`.
   - **Super Admin Cockpit:** Build the Super Admin Statutory Compliance Control Center (`src/routes/_authenticated/super/compliance.tsx` or settings tab) with impact simulation and audited activation.

---

**Release Gate Assertion:**  
The release gate remains **BLOCKED**. Live payroll deductions are disabled, live payslips remain unpublished, and production activation is withheld pending formal compliance review.
