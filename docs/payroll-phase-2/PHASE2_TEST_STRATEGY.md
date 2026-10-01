# Phase 2 Quality Assurance & Testing Strategy
## Advanced Payroll Module: Comprehensive Verification Framework

**Document ID**: `DOC-P2-013`  
**Classification**: QA Strategy & Verification Framework  
**Status**: APPROVED QA PLAN  
**Date**: October 1, 2026  
**Auditor**: QA Lead & Senior Payroll Domain Engineer  

---

## 1. Testing Philosophy & Non-Negotiable Guardrails

To prevent premature sign-offs and ensure enterprise reliability:
- **No Mock-Only Signoffs**: A feature is **not** verified simply because a UI component renders or an API endpoint returns HTTP 200.
- **Mathematical Exactness**: All financial calculations must match down to the exact paisa (zero IEEE 754 floating-point drift).
- **Zero Phase 1 Regression**: The 67 Phase 1 golden tests must continue to pass with 0 failures at all times.
- **Syntactic Conformance**: Bank files and statutory returns must conform to character-level specifications.

---

## 2. Test Levels & Coverage Breakdown

### 2.1 Unit Tests

#### P2.1 Reimbursements & OCR
- `UT-201`: Validate receipt MIME whitelist (reject `.exe`, `.sh`, accept `.pdf`, `.png`, `.jpg`).
- `UT-202`: Verify SHA-256 integrity hash generation across identical and distinct binary streams.
- `UT-203`: Test duplicate claim detection logic with identical `(merchant, date, amount)`.
- `UT-204`: Test advisory OCR response parser under missing fields and malformed payloads.

#### P2.2 FBP & Dual-Regime Tax Calculations
- `UT-205`: Test Section 115BAC (New Tax Regime) progressive tax brackets and ₹75,000 standard deduction.
- `UT-206`: Test Section 87A rebate (zero tax when net taxable income <= ₹7,00,000 in New Regime).
- `UT-207`: Test Old Tax Regime HRA exemption formula: `MIN(actual HRA, 50% Basic, Rent - 10% Basic)`.
- `UT-208`: Test Section 80C capping at ₹1,50,000 regardless of declared total.
- `UT-209`: Test Landlord PAN format validation (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).

#### P2.3 Biometric Adapters
- `UT-210`: Test Matrix COSEC JSON/XML event payload parser.
- `UT-211`: Test First-In / Last-Out deduplication when punch interval is < 60 seconds.
- `UT-212`: Test employee code stripping (e.g. `00104` maps to `EMP-104`).

#### P2.4 Bank File Formatting
- `UT-213`: Validate ICICI CIB pipe-delimited string builder (verify column count, header, and detail lines).
- `UT-214`: Validate HDFC Enet CSV format escaping and field lengths.
- `UT-215`: Validate SBI CMP text layout and trailer record calculation.
- `UT-216`: Validate 11-digit RBI IFSC regex format (`^[A-Z]{4}0[A-Z0-9]{6}$`).

#### P2.5 Statutory Returns Formatting
- `UT-217`: Validate EPF ECR v2.0 `#~#` 11-column string builder.
- `UT-218`: Test age 58 EPS wage zeroing rule (EPS Wages = 0, EPS Remitted = 0, difference diverted to EPF).
- `UT-219`: Test EPF/EPS ₹15,000 statutory wage ceiling cap.
- `UT-220`: Validate ESIC monthly return `.xlsx` column mapping and zero-wage reason codes.

---

### 2.2 Integration Tests

- `IT-201`: **Reimbursement to Payroll Batch**: Submit claim -> Approve -> Run batch -> Verify reimbursement line item in `Payslip` and `PayrollExecutionTrace`.
- `IT-202`: **Tax Proof Verification to Batch**: Declare HRA -> Approve rent proof -> Run payroll -> Verify adjusted TDS withholding matches annual projection.
- `IT-203`: **Biometric Ingestion to Cutoff Attendance**: Push punches via Matrix webhook -> Run overnight reconciliation -> Run payroll -> Verify payable days and LOP proration factor.
- `IT-204`: **Payroll Run to Bank Disbursement**: Calculate payroll -> Verify pre-disbursement check -> Generate HDFC batch -> Verify batch record created and batch locked.
- `IT-205`: **Payroll Run to Statutory ECR**: Finalize payroll -> Generate EPF ECR -> Verify total member count and challan remittance match `PayrollSnapshot`.

---

### 2.3 Security & Isolation Tests

- `SEC-201`: **Cross-Tenant Document Access**: User in Tenant A cannot view or download receipt from Tenant B even with direct URL knowledge.
- `SEC-202`: **RBAC Approval Bypass**: Employee attempting `PUT /api/expenses/claims/:id/status` returns HTTP 403 Forbidden.
- `SEC-203`: **Bank Payout Authorization**: Non-admin user cannot access `POST /api/payroll/runs/:id/disbursement/generate`.
- `SEC-204`: **PII Masking**: API responses mask PAN (`XXXXXX1234`) and bank accounts (`••••1234`) for unauthorized roles.

---

### 2.4 Reliability & Boundary Tests

- `REL-201`: Biometric network disconnect replay: Ingest 500 buffered punches in single batch without dropping records or locking database.
- `REL-202`: Idempotent bank batch generation: Repeated requests for identical payroll run do not create duplicate batch files.
- `REL-203`: High-volume ECR export: Generate ECR text file for 1,000 employees under 3 seconds.

---

### 2.5 Phase 1 Regression Suite

Before signing off any Phase 2 deliverable, the complete Phase 1 test suite must be executed:
- `npx ts-node src/tests/phase1-payroll.test.ts` -> **All 67 tests must pass (100%)**.
- `npx ts-node src/tests/e2e-api-verification.ts` -> **All 13 Phase 1 APIs must return HTTP 200/201**.
- `npx tsc --noEmit` -> **0 errors**.
- `npm run build` -> **Clean bundle with 0 errors**.
