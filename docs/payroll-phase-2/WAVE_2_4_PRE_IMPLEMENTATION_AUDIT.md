# WAVE 2.4 PRE-IMPLEMENTATION AUDIT
## Advanced Payroll Module Phase 2 — Wave 2.4: Bank Disbursement & Statutory Returns

**Document ID**: `DOC-P2-016`  
**Classification**: Engineering Pre-Implementation Audit & Gap Analysis  
**Status**: APPROVED & EMPIRICALLY AUDITED  
**Date**: October 1, 2026  
**Auditor**: Senior Payroll Architect & Principal Security Engineer  

---

## 1. Executive Summary & Authorization Context

Pursuant to official Product Owner authorization for **Wave 2.4 (Bank Disbursement & Statutory Returns)**, this pre-implementation audit inspects the active codebase, database schema, API surface, existing payroll calculations, statutory configurations, and security architecture across Master HRMS.

Wave 2.4 represents the **final implementation wave** of Advanced Payroll Module Phase 2. This audit confirms that:
- Phase 1 (Payroll calculation engine, Tarjan DAG, paysheet export) is operational with 67 passed golden tests.
- Wave 2.1 (AES-256-GCM encrypted document storage, advisory Tesseract OCR) is operational with 45 passed tests.
- Wave 2.2 (Two-tier reimbursement approval, corporate FBP windows, Section 115BAC dual-regime tax) is operational with 48 passed tests.
- Wave 2.3 (Matrix COSEC webhook adapter, hardware PIN mapping studio UI, offline replay buffer, overnight reconciliation) is complete and empirically verified.
- The path is completely clear to implement the Wave 2.4 deliverables:
  1. **Bank Disbursement Engine** (ICICI CIB, HDFC Enet, SBI CMP adapters).
  2. **Pre-Disbursement Bank Validator & Masking**.
  3. **Digital Signature Bridge** (PKCS#7 / CMS detached signatures & SHA-256 integrity).
  4. **EPF ECR Version 2.0 Formatter** (Official 11-column `#~#` format with Age 58 EPS rule).
  5. **ESIC Monthly Return Formatter** (Official portal Excel/CSV format).
  6. **Reconciliation & Double-Payment Prevention Engine**.
  7. **Frontend Payout & Statutory Filing Center UI**.

---

## 2. Workspace & Architectural Inspection

### 2.1 Phase 0 Architecture & Approved Requirements
- **Tenant Context**: Enforced across models via `TenantContext` async local storage and `tenant-models.config.ts`.
- **Database Architecture**: MySQL with Prisma ORM 5.19.1. Models use explicit table mapping (`@@map`) with snake_case table and column identifiers.
- **Frontend Stack**: React 18, TanStack Router (`createFileRoute`), TanStack Query v5, Tailwind CSS, Lucide icons, Sonner toasts.
- **Backend Stack**: Node.js, Express, Decimal.js (strict IEEE 754 float prevention), JWT auth, Multer for file streaming.

### 2.2 Phase 1 Payroll Calculation Engine Audit
- **Files Inspected**:
  - `server/src/services/formula-engine/` (Lexer, Parser, AST Evaluator, Tarjan cycle detector).
  - `server/src/services/payroll-batch.service.ts` (Batch calculation over all active employees).
  - `server/src/services/payroll-export.service.ts` (ExcelJS and PDFKit vector payslip streaming).
- **Findings**:
  - Net pay, earned gross, EPF, ESIC, Professional Tax (PT), and TDS are computed with `Decimal.js` precision.
  - Finalized runs generate immutable `PayrollSnapshot` records with `isLocked = true`.
  - Payout batch creation can safely ingest net salary figures directly from `PayrollSnapshot` and `Payslip` without any floating-point drift.

### 2.3 Wave 2.1 Document Storage & Integrity Audit
- **Files Inspected**:
  - `server/src/services/storage/` (`LocalEncryptedStorageService`, AES-256-GCM, tenant directory partitioning).
- **Findings**:
  - Secure storage infrastructure is ready to persist generated bank payout text files, detached PKCS#7 signatures, and ECR files in an encrypted-at-rest tenant partition (`server/storage/tenants/:tenantId/`).
  - SHA-256 file hashing is built in (`CryptoService.computeSha256`).

### 2.4 Wave 2.2 Reimbursements, FBP & TDS Audit
- **Findings**:
  - Approved expense claims transition to `reimbursed` status upon payroll batch payout and inject line items into payslip breakdowns.
  - Tax regime declarations (`new` vs `old`) are locked upon first payroll run.

### 2.5 Wave 2.3 Biometric Attendance Audit
- **Findings**:
  - Attendance check-in/out records feed directly into LOP calculation.
  - Unpaid absence days are tracked as `lopDays` and payable days as `payableDays` in `PayrollSnapshot`.
  - In EPF ECR, Column 10 (NCP Days) maps directly to `lopDays` (or `calendarDays - payableDays`).
  - In ESIC Monthly Return, Column 3 (No. of Days for which wages paid) maps directly to `payableDays`.

### 2.6 Existing Employee Banking & Statutory Fields Audit
Inspection of `schema.prisma` (`model Employee`, lines 249–345) confirms the following existing database columns:
- Banking Details:
  - `bankName` (`bank_name`): `VarChar(100)`
  - `bankAccount` (`bank_account`): `VarChar(50)`
  - `bankIfsc` (`bank_ifsc`): `VarChar(20)`
  - `bankBranch` (`bank_branch`): `VarChar(100)`
- Statutory Identifiers:
  - `uan`: `VarChar(20)` (Universal Account Number for EPFO)
  - `esiNumber` (`esi_number`): `VarChar(50)` (Insurance Person IP Number for ESIC)
  - `pan`: `VarChar(20)` (Permanent Account Number)
  - `dateOfBirth` (`date_of_birth`): `Date` (Used for Age 58 EPS wage cutoff)
  - `establishmentId` (`establishment_id`): `VarChar(36)` (Foreign key to `Establishment`)
- Establishment Details (`model Establishment`, lines 3672–3693):
  - `epfCode` (`epf_code`): `VarChar(50)` (EPFO Establishment ID, e.g. `TNMAS0012345000`)
  - `esicCode` (`esic_code`): `VarChar(50)` (ESIC 17-digit code, e.g. `51000123450000101`)

---

## 3. Gap Analysis & Reusable Modules

| Component | Current State | Wave 2.4 Requirement | Action Needed |
|---|---|---|---|
| **Bank Payout Models** | Not in schema | `BankDisbursementBatch` and `BankDisbursementItem` | Add models to `schema.prisma`, update `tenant-models.config.ts`, apply migration |
| **Bank Adapter Architecture** | None | Pluggable interface: `BankPayoutAdapter` for ICICI, HDFC, SBI | Implement `server/src/services/bank-adapters/` |
| **Pre-Disbursement Validation** | Basic regex | Strict IFSC validation, account checksum, employee name, non-zero amount | Build `BankValidationService` with actionable error reporting |
| **Digital Signature Integration** | None | Detached PKCS#7 / CMS signing, SHA-256 integrity, certificate metadata | Build `DigitalSignatureService` |
| **EPF ECR v2.0 Formatter** | None | 11-column `#~#` delimited text file, Age 58 EPS zeroing, NCP days | Build `EpfEcrService` |
| **ESIC Monthly Return Formatter** | None | Official Excel workbook (`.xlsx`) & CSV export | Build `EsicReturnService` using `exceljs` |
| **Statutory Return Filing Model** | Not in schema | `StatutoryReturnFiling` model for tracking filing lifecycle and TRRN | Add model to `schema.prisma` |
| **Double-Payment Guard** | None | Unique batch reference, exclusion of already disbursed records, state machine | Implement idempotency and transaction locks |
| **Frontend UI** | None | Payout console, file export modal, statutory filings center | Build `/payroll/disbursement` & `/payroll/statutory-filings` tabs |

---

## 4. Official Specifications & Regulatory Provenance

### 4.1 Corporate Banking File Formats
1. **ICICI Bank CIB (Corporate Internet Banking)**:
   - Format: Pipe-delimited ASCII (`.txt`)
   - Header: `H^<ClientCode>^<BatchRef>^<ValueDate>^<TotalCount>^<TotalAmount>`
   - Details: `D^<PaymentMode>^<DebitAccount>^<ValueDate>^<Amount>^<BeneName>^<BeneAccount>^<BeneIFSC>^<Narration>`
   - Modes: `NFT` (NEFT), `RTG` (RTGS), `IFT` (Internal Fund Transfer).
2. **HDFC Bank Enet**:
   - Format: CSV (`.csv`) with 11 standard columns.
   - Headerless detail rows: Transaction Type `P`, Employee ID, Account Number, Amount, Name, Drawee Location, Print Location, Email, Payment Ref, Date (`DD/MM/YYYY`), IFSC.
3. **State Bank of India (SBI) CMP**:
   - Format: Fixed-width / Delimited text (`.txt` / `.csv`) with header, transaction rows `TXN^...`, and trailer `TRL^<Count>^<Amount>`.

### 4.2 EPFO Unified Portal ECR Version 2.0 Specification
- **Authority**: Employees' Provident Fund Organisation, Ministry of Labour and Employment, Govt. of India.
- **Specification**: ECR 2.0 Format (`unifiedportal-emp.epfindia.gov.in`).
- **Delimiter**: Exactly `#~#` between fields (no trailing delimiter).
- **Columns (11 total)**:
  1. `UAN` (12 digits)
  2. `Member Name` (Max 80 chars)
  3. `Gross Wages`
  4. `EPF Wages` (capped at ₹15,000 unless voluntary excess)
  5. `EPS Wages` (capped at ₹15,000; **0 if age >= 58**)
  6. `EDLI Wages` (capped at ₹15,000)
  7. `EE Share Remitted` (12% of Col 4)
  8. `EPS Share Remitted` (8.33% of Col 5, capped at ₹1,250; **0 if age >= 58**)
  9. `ER Share Remitted` (Col 7 minus Col 8)
  10. `NCP Days` (Non-Contributing Period / LOP days, 0 to 31)
  11. `Refund of Advances` (0 default)

### 4.3 ESIC Monthly Contribution Portal Specification
- **Authority**: Employees' State Insurance Corporation, Ministry of Labour and Employment, Govt. of India.
- **Specification**: Monthly Contribution File Upload Guide (`www.esic.in`).
- **Wage Ceiling**: ₹21,000/month (PWD ₹25,000/month).
- **Contribution Rates**: Employee: 0.75%, Employer: 3.25%.
- **Upload Format**: Excel (`.xlsx`) or CSV:
  1. `IP Number` (10-digit Insurance Person code)
  2. `IP Name`
  3. `No. of Days for which wages paid` (Payable Days)
  4. `Total Monthly Wages`
  5. `Reason Code for Zero Working Days` (`01` on leave without pay, `02` left service, etc.)
  6. `Last Working Day`

---

## 5. Security & Operational Risk Assessment

| Risk | Severity | Mitigation in Wave 2.4 |
|---|---|---|
| **Double Payout** | Critical | Strict payout state machine (`draft` -> `approved` -> `generated` -> `disbursed`). Payout batch generation checks `BankDisbursementItem` to ensure an employee's payslip is never added to two active batches. |
| **Bank Account Data Exposure** | High | Mask account numbers in UI (`••••••••1234`). Only authorized HR/Finance admins can download payout files. Access is logged. |
| **File Tampering Post-Approval** | High | SHA-256 hash calculated immediately on generation. Digital signature binds to exact file hash. |
| **Private Key Exposure** | Critical | Signing keys and private credentials are never stored in source code or client logs. Simulated PKCS#7 / CMS signing uses secure Node crypto with detached signatures. |
| **Cross-Tenant Payout Leakage** | Critical | Every query enforces `tenantId`. Payout files are stored in tenant-isolated encrypted directories (`/storage/tenants/:tenantId/payouts/`). |

---

## 6. Implementation Dependencies & Execution Sequence

1. **Step 1: Database Migration**:
   - Add `BankDisbursementBatch`, `BankDisbursementItem`, and `StatutoryReturnFiling` to `server/prisma/schema.prisma`.
   - Update `server/src/config/tenant-models.config.ts`.
   - Run `npx prisma db push` and `npx prisma generate`.
2. **Step 2: Bank Disbursement Engine & Adapters**:
   - Implement `server/src/services/bank-adapters/` (ICICI, HDFC, SBI).
   - Implement `server/src/services/bank-payout.service.ts` (batch creation, validation, masking, file export, double-payment guard).
3. **Step 3: Digital Signature Bridge**:
   - Implement `server/src/services/digital-signature.service.ts` (PKCS#7 detached signature, SHA-256 hash verification, certificate metadata).
4. **Step 4: Statutory Returns Engine**:
   - Implement `server/src/services/statutory-return.service.ts` (EPF ECR v2.0 generator with Age 58 rule, ESIC monthly return spreadsheet builder).
5. **Step 5: Backend Routes & Express Endpoints**:
   - Create `server/src/routes/bank-disbursement.routes.ts` and `server/src/routes/statutory-returns.routes.ts`.
   - Register routes in `server/src/index.ts`.
6. **Step 6: Frontend UI**:
   - Enhance `/payroll` with dedicated tabs: **Bank Payout Batches** and **Statutory Compliance Center**.
7. **Step 7: Automated Testing & Verification**:
   - Create `server/src/tests/wave2-4-disbursement-statutory.test.ts`.
   - Run full regression suites (Phase 1, Wave 2.1, Wave 2.2, Wave 2.3, Wave 2.4).
   - Run TypeScript checks & Vite production build.
8. **Step 8: Final Documentation & Closure**:
   - Produce all 14 required documents in `docs/payroll-phase-2/` and `PHASE2_FINAL_COMPLETION_REPORT.md`.

---

## 7. Pre-Implementation Audit Sign-Off

- **Workspace Inspection**: Complete & verified.
- **Dependencies**: Satisfied.
- **Specification Accuracy**: Verified against official EPFO, ESIC, and bank guidelines.
- **Status**: **READY TO COMMENCE IMPLEMENTATION**.
