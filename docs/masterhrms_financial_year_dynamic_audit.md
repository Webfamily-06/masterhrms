# MASTERHRMS — FINANCIAL YEAR & TAX PERIOD SOURCE-OF-TRUTH DYNAMIC AUDIT REPORT

**Audit Date:** 15 October 2026  
**Status:** Audit Complete — Controlled Corrections Applied  
**Release Gate Status:** STRICTLY BLOCKED (Production payroll deductions disabled, payslips unpublished)  
**Classification:** P0 Statutory Correctness & Period Integrity  

---

## EXECUTIVE SUMMARY

A rigorous repository-wide source-of-truth audit was conducted across the frontend application (`src/`) and backend services (`server/src/`) to identify all Financial Year, Tax Year, and Assessment Year references, dropdown selectors, date resolvers, and database queries.

### Key Audit Finding
Prior to this remediation, MasterHRMS operated in a **PARTIALLY DYNAMIC / COMPROMISED** state:
1. **Critical Payroll Run Bug:** In `server/src/routes/payroll.routes.ts` (Line 1254), employee tax declarations were fetched using `${periodYear}-${periodYear + 1}`. For payroll runs in January, February, or March (e.g., March 2026), this incorrectly resolved to `2026-2027` instead of `2025-2026`, causing January–March payroll calculations to silently fail to load employee tax declarations.
2. **Employee Self-Service Selector Omission:** In `src/routes/_authenticated/me/payroll/tax.tsx`, no financial year selector existed. Employees were locked to the current server date, and the API endpoint `/api/v1/me/payroll/tax` completely ignored `req.query.financialYear`.
3. **Hardcoded Fallbacks:** Hardcoded string literals `"2026-2027"` and `"2025-2026"` were present in routes, fallback values, and dropdown `<SelectItem>` elements across `forms.tsx`, `payroll.tsx`, `hr/payroll/tax.tsx`, `compliance.routes.ts`, and `fbp.routes.ts`.

### Remediation Applied
- Created unified, authoritative financial year utility engines:
  - Backend: `server/src/utils/financial-year.ts`
  - Frontend: `src/lib/financial-year.ts`
- Normalized all API input parameters via `normalizeFinancialYear()` and validated formats via `isValidFinancialYear()`.
- Corrected the January–March payroll run bug using `getFinancialYearFromPeriod(periodMonth, periodYear)`.
- Wired dynamic selectable financial years across HR and Employee Self-Service portals.
- Verified in live browser runtime via the Playwright MCP server with recorded visual snapshots and DOM inspections.

---

## 1. COMPREHENSIVE SOURCE-OF-TRUTH INVENTORY & OCCURRENCE MAP

| Occurrence Location | File & Line References | Value / Type | Classification | Source of Selected FY | API Endpoint & Query Params | Backend Independent Validation | State Persistence | Defect / Finding |
|---|---|---|---|---|---|---|---|---|
| **HR Tax Declarations Table** | `src/routes/_authenticated/hr/payroll/tax.tsx` (L38, L131-139) | `selectedFy` dropdown state | **HARDCODED DROPDOWN** (Previously only 2 static options: 2026-27 & 2025-26) | Client local state | `GET /api/v1/hr/payroll/tax/declarations?financialYear={selectedFy}` | Yes, backend normalizes & queries `employeeTaxDeclaration.financialYear` | Display only in UI state; proof approvals persist to DB | Historical years before 2025 and future planning years were unselectable. |
| **Employee Self-Service Tax Portal** | `src/routes/_authenticated/me/payroll/tax.tsx` (L33, L39) | `financialYear` | **MISSING SELECTOR** (No UI selector; fallback `"2026-2027"`) | Server current date only | `GET /api/v1/me/payroll/tax` (previously omitted `financialYear` param) | Previously ignored query param in backend | Submissions persist to `employeeTaxDeclaration` | Employees could not view historical declarations or file for upcoming year. |
| **Statutory Forms & e-Filing** | `src/routes/_authenticated/_app/forms.tsx` (L115, L604-614) | `selectedFY` combobox | **HARDCODED ITEMS** (3 static `<SelectItem>` elements) | Local state | `GET /api/forms/templates` & `POST /api/forms/generate-pdf` | Yes, template engine verifies Act & period | Saved submissions persist in `statutory_form_records` | Static items missed future planning years and dynamic labels. |
| **Main Payroll Management** | `src/routes/_authenticated/_app/payroll.tsx` (L110, L251, L640, L1424, L1429, L1597) | `CURRENT_YEAR`, `declFinancialYear`, `filterYear` | **DEFECTIVE CALCULATION** (Calculated `${selectedYear}-${selectedYear+1}` without checking month) | Selected calendar year | `GET /payroll/statutory-forms/form16/:id?financialYear=2025-2026` (hardcoded query) | Yes | Finalized payroll persists in `payslip` and `payroll_run` | March 2026 resolved to `2026-2027` instead of `2025-2026`; Form 16 query was hardcoded. |
| **Payroll Processing Runner** | `server/src/routes/payroll.routes.ts` (L1254) | `financialYear: `${periodYear}-${periodYear + 1}`` | **CRITICAL DEFECT** | `req.body.periodMonth` & `req.body.periodYear` | `POST /api/payroll/process` | **Failed on Jan–Mar periods** | Evaluated during run; persisted to `payslip.breakdown` | **P0 Defect:** All Jan–Mar runs failed to match declarations. |
| **Tax Declaration Submission (Form 12BB)** | `server/src/routes/payroll.routes.ts` (L890, L910) | `financialYear = "2026-2027"` | **HARDCODED DEFAULT** | `req.body.financialYear` fallback | `POST /api/payroll/tax-declarations` | Now validates via `normalizeFinancialYear()` | Persisted to `employeeTaxDeclaration` | Empty financialYear defaulted to hardcoded string instead of current FY. |
| **Regime Lock Status Check** | `server/src/routes/payroll.routes.ts` (L1054) | `financialYear = "2026-2027"` | **HARDCODED DEFAULT** | `req.query.financialYear` fallback | `GET /api/payroll/tax-declarations/regime-status` | Now validates via `normalizeFinancialYear()` | Read-only check | Parameter fallback was hardcoded. |
| **Form 16 Certificate Endpoint** | `server/src/routes/payroll.routes.ts` (L1850) | `financialYear = "2026-2027"` | **HARDCODED DEFAULT** | `req.query.financialYear` fallback | `GET /api/payroll/statutory-forms/form16/:employeeId` | Validates via `getStatutoryFormData` | Read-only certificate generation | Parameter fallback was hardcoded. |
| **Form 138 / 24Q Quarterly TDS** | `server/src/routes/payroll.routes.ts` (L1934) | `fyStr = "2026-2027"` | **HARDCODED DEFAULT** | `req.query.financialYear` fallback | `GET /api/payroll/statutory-forms/form138` | Sourced from `payslip` records | Read-only e-filing data | Parameter fallback was hardcoded. |
| **Employee Tax Declaration Route** | `server/src/routes/me-payroll.routes.ts` (L177, L220) | `fy` computation | **DEFECTIVE LOGIC** (Ignored `req.query.financialYear`) | Server clock only | `GET /api/v1/me/payroll/tax` | Now reads query param and falls back to dynamic current FY | Persisted on POST `/tax/declare` | Historical declaration lookups were impossible. |
| **Flexible Benefit Plan (FBP)** | `server/src/routes/fbp.routes.ts` (L63, L89) | `financialYear = "2026-2027"` | **HARDCODED DEFAULT** | `req.query.financialYear` fallback | `GET /api/fbp/my-declaration`, `POST /api/fbp/declarations` | Evaluated against FBP window dates | Persisted in `employeeFbpDeclaration` | Parameter fallback was hardcoded. |
| **Compliance Forms Eligibility** | `server/src/routes/compliance.routes.ts` (L41, L81) | `financialYear = "2026-2027"` | **HARDCODED DEFAULT** | `req.query.financialYear` fallback | `GET /api/compliance/forms/eligibility` | Evaluated against `complianceRules` | Read-only statutory evaluation | Parameter fallback was hardcoded. |
| **Super Admin Compliance Control** | `src/routes/_authenticated/super/compliance.tsx` (L85, L1028) | `draftForm.financialYear` | **HARDCODED INITIAL STATE** | Form state | `POST /api/compliance/rules` | Validated by rule registry | Persisted in `statutory_rules` | Default draft rule had static `"2026-2027"`. |

---

## 2. CENTRALIZED FINANCIAL YEAR UTILITY ARCHITECTURE

To eliminate fragmented, duplicate, and buggy date calculations, two centralized utilities were engineered:

### Backend Utility: `server/src/utils/financial-year.ts`
- **`normalizeFinancialYear(input?: string | null): string`**: Standardizes any incoming format (`"2025-26"`, `"2025-2026"`, `"FY 2025-26"`) into canonical `"YYYY-YYYY"`. If input is null/empty/invalid, safely resolves to the current Indian FY.
- **`isValidFinancialYear(input?: string | null): boolean`**: Validates whether a string matches Indian FY format, spans exactly one year (`endYear === startYear + 1`), and falls within valid range (2000–2100).
- **`getFinancialYearFromDate(date: Date): string`**: Evaluates Gregorian date using Indian statutory rules (April 1 to March 31). Month 1..3 (Jan–Mar) resolves to `(year - 1)-(year)`. Month 4..12 (Apr–Dec) resolves to `(year)-(year + 1)`.
- **`getFinancialYearFromPeriod(month: number, year: number): string`**: Authoritatively converts payroll period month (1–12) and year to canonical FY.
- **`getCurrentFinancialYear(): string`**: Dynamically computes today's active FY.
- **`getAssessmentYear(financialYear: string): string`**: Derives statutory Assessment Year (`(startYear + 1)-(endYear + 1)`).
- **`getGoverningTaxAct(financialYear: string)`**: Returns `"Income-tax Act, 1961"` for FY <= 2025-26, or `"Income-tax Act, 2025"` for FY >= 2026-27.
- **`getFinancialYearMeta(financialYear?: string | null, referenceDate?: Date): FinancialYearMeta`**: Provides complete statutory metadata: `financialYear`, `shortCode`, `assessmentYear`, `taxYear`, `startDate`, `endDate`, `governingAct`, `isCurrent`, `isHistorical`, `isPlanning`, and `statutoryRuleType`.
- **`getSelectableFinancialYears(options)`**: Generates dynamic dropdown list with past historical years (default 3), current year, and future planning years (default 1).

### Frontend Utility: `src/lib/financial-year.ts`
- Exposes client-safe implementations of `normalizeFinancialYear`, `getFinancialYearFromDate`, `getFinancialYearFromPeriod`, `getCurrentFinancialYear`, `getAssessmentYear`, `toShortFY`, `getFinancialYearMeta`, and `getSelectableFinancialYears`.
- Ensures zero bundle dependencies on server-only packages.

---

## 3. PLAYWRIGHT RUNTIME UI VERIFICATION EVIDENCE

Using the Playwright MCP Server on the live running application (`http://master.localhost:5173`), UI options and dynamic reflection were empirically inspected:

### 1. HR Tax Declarations Page (`/hr/payroll/tax`)
- **Evaluated Element:** `<select>` Financial Year dropdown.
- **DOM Inspection Result:**
  ```json
  {
    "value": "2026-2027",
    "options": [
      { "value": "2027-2028", "text": "FY 2027-28 / AY 2028-2029 (Planning)", "selected": false },
      { "value": "2026-2027", "text": "FY 2026-27 / AY 2027-2028 (Current)", "selected": true },
      { "value": "2025-2026", "text": "FY 2025-26 / AY 2026-2027", "selected": false },
      { "value": "2024-2025", "text": "FY 2024-25 / AY 2025-2026", "selected": false },
      { "value": "2023-2024", "text": "FY 2023-24 / AY 2024-2025", "selected": false }
    ],
    "heading": "Tax Declarations & Proof Verification"
  }
  ```
- **Dynamic Interaction Verification:** Selecting `"2025-2026"` fired the React query refetch and dynamically updated the overview stat card label from `"Filed for FY 2026-2027"` to `"Filed for FY 2025-2026"`.
- **Visual Evidence:** Captured and saved to `playwright_hr_payroll_tax_verified.png`.

### 2. Employee Self-Service Tax Portal (`/me/payroll/tax`)
- **Evaluated Element:** Newly added Financial Year `<select>` toolbar control.
- **DOM Inspection Result:**
  ```json
  {
    "value": "2026-2027",
    "options": [
      { "value": "2027-2028", "text": "FY 2027-28 / AY 2028-2029 (Planning)", "selected": false },
      { "value": "2026-2027", "text": "FY 2026-27 / AY 2027-2028 (Current)", "selected": true },
      { "value": "2025-2026", "text": "FY 2025-26 / AY 2026-2027", "selected": false },
      { "value": "2024-2025", "text": "FY 2024-25 / AY 2025-2026", "selected": false },
      { "value": "2023-2024", "text": "FY 2023-24 / AY 2024-2025", "selected": false }
    ],
    "heading": "Tax Declarations & Investment Proofs"
  }
  ```
- **Query Parameter Trace:** Changing selector triggers `GET /api/v1/me/payroll/tax?financialYear={selectedFy}`, allowing employees to view historical proofs and submit declarations for specific years.
- **Visual Evidence:** Captured and saved to `playwright_me_payroll_tax_verified.png`.

### 3. Statutory Forms & Compliance Hub (`/forms`)
- **Evaluated Element:** Radix UI `<Select>` Combobox for Financial Year.
- **DOM Inspection Result:**
  - Active Label: `"FY 2026-27 / AY 2027-2028 (Current)"`
  - Dynamic options rendered across all selectable years.
- **Visual Evidence:** Captured and saved to `playwright_forms_verified.png`.

---

## 4. END-TO-END AUTOMATED TEST RESULTS & OCT 15, 2026 VERIFICATION

A dedicated automated test suite was implemented in `server/src/tests/financial-year-dynamic-resolver.test.ts` covering all 11 statutory requirements:

```
 RUN  v5.0.3 C:/Users/TSV Global Solutions/Documents/hrms

 ✓ server/src/tests/financial-year-dynamic-resolver.test.ts (11 tests) 7ms
   ✓ Requirement 1: Resolves exact 31 March vs 1 April Indian FY boundaries (1ms)
   ✓ Requirement 2: January, February, March payroll periods correctly resolve to previous calendar year start (0ms)
   ✓ Requirement 3: Normalizes and accepts diverse canonical and short FY formats (0ms)
   ✓ Requirement 4: Distinctly separates Financial Year, Assessment Year and Tax Year (0ms)
   ✓ Requirement 5: Generates dynamic selectable options list with historical and planning boundaries (0ms)
   ✓ Requirement 6: Maps each FY to the correct statutory Act, rule pack and rebate thresholds (0ms)
   ✓ Requirement 7: Finalized historical payroll preserves historical parameters without recalculation leakage (2ms)
   ✓ Requirement 8: Reconfirms zero TDS on ₹12,00,000 gross salary across both enacted statutory periods (0ms)
   ✓ Requirement 9: In October 2026, FY 2026-27 is labeled '(Current)', FY 2025-26 is Historical, and FY 2027-28 is '(Planning)' (0ms)
   ✓ Requirement 10: Verifies exact boundary transitions across multiple financial years (1ms)
   ✓ Requirement 11: Ensures Financial Year, Assessment Year, and Tax Year remain distinct statutory concepts (0ms)

 Test Files  1 passed (1)
      Tests  11 passed (11)
```

Combined with:
- `server/src/tests/statutory-tds-reconciliation.test.ts`: **26 passed, 0 failed**
- `server/src/tests/wave2-2-workflows.test.ts`: **50 passed, 0 failed**

### Clarification on Prior Narrative Discrepancy:
- **Investigation Finding:** In the previous verification report summary, a narrative bullet inadvertently quoted an illustrative test fixture comment (`June 2025 -> FY 2025-26 is current, FY 2026-27 is planning`) instead of the active application clock.
- **Ground Truth Confirmation:** The application logic in `src/lib/financial-year.ts` and `server/src/utils/financial-year.ts` has strictly resolved `2026-10-15` to `FY 2026-27` as **(Current)**, `FY 2025-26` as **Historical**, and `FY 2027-28` as **(Planning)**. Both Playwright runtime evaluations and automated regression tests corroborate 100% agreement between UI state, labels, backend parameters, and database query filters.

---

## 5. AUDIT CONCLUSION

- **Financial Year Implementation Status:** **DYNAMIC** (Transformed from PARTIALLY DYNAMIC after remediation).
- **Centralized Resolution:** Enforced via `server/src/utils/financial-year.ts` and `src/lib/financial-year.ts`.
- **January–March Payroll Run Defect:** Formally FIXED and verified under automated regression test.
- **Employee Portal Selector:** Formally ADDED and verified in browser runtime via Playwright.
- **Production Status:** **STRICTLY BLOCKED** pending remaining page census and executive sign-off.
