# Phase 2 Feature-by-Feature Gap Analysis
## Advanced Payroll Module: Existing vs Required Technical Capabilities

**Document ID**: `DOC-P2-003`  
**Classification**: Technical Discovery & Gap Analysis  
**Status**: APPROVED BASELINE  
**Date**: October 1, 2026  
**Auditor**: Senior Payroll Domain Engineer & Enterprise HRMS Consultant  

---

## 1. Feature P2.1 — Employee Reimbursement Workflow with Attachments and OCR

### 1.1 Existing Capabilities
- **Database Schema**: `ExpenseCategory` and `ExpenseClaim` exist in `schema.prisma`.
- **API Routes**: `expenses.routes.ts` provides endpoints for listing categories, filing claims, updating approval status, and reimbursing via payroll or direct bank transfer.
- **Ledger Posting**: `autoPostExpenseToLedger` automatically creates double-entry journal items upon reimbursement.
- **Procurement OCR**: `ai.routes.ts` has `/api/ai/ocr/extract` which extracts invoice numbers, vendor names, line items, and totals from uploaded documents using simulated/regex parsing.

### 1.2 Exact Technical Gaps
1. **Self-Service Claim Filing UI**: The current UI in [expenses.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/expenses.tsx) is an admin-centric screen. An employee self-service claim submission wizard with live receipt drag-and-drop is required.
2. **Receipt OCR Linking**: OCR extraction is currently bound to vendor bills/purchases. It must be adapted for employee expense receipts (cabs, restaurants, fuel, retail invoices) to auto-fill Merchant, Date, Amount, and GSTIN.
3. **Receipt Binary Storage & Hashing**: The current schema accepts a raw string `receiptUrl`. There is no backend service that validates MIME types, scans for malicious payloads, generates a SHA-256 integrity hash, and securely serves files via authenticated endpoints.
4. **Payroll Batch Integration**: In `payroll-batch.service.ts`, the batch calculation loop processes fixed CTC items. It has no query logic to sum approved `ExpenseClaim` records for the period and inject them as `earnings.reimbursements`.
5. **Duplicate Receipt Detection**: No mechanism checks if an employee has already submitted the same receipt (matching merchant + date + amount).

---

## 2. Feature P2.2 — Flexible Benefit Plan (FBP) Declarations & Investment Proofs

### 2.1 Existing Capabilities
- **Database Schema**: `EmployeeTaxDeclaration` and `TaxDeclarationProof` exist in `schema.prisma`.
- **TDS Calculation**: `calculateAnnualTDS()` in `payroll-engine.service.ts` supports New Tax Regime (Section 115BAC / Finance Act 2024 / Income-tax Act 2025) with standard deduction ₹75,000 and Section 87A rebate up to ₹7,00,000.
- **Compliance Rules**: `compliance-rules.service.ts` includes versioned statutory thresholds (`STATUTORY_RULES_CONFIG`).

### 2.2 Exact Technical Gaps
1. **FBP Component Allocation Basket**: There is no database model or UI for employees to select and allocate portions of their CTC across flexible allowance components (Fuel, Telephone, Meal, Education).
2. **Old vs New Regime Dual Engine**: While New Regime slabs exist, the Old Tax Regime calculation (with 80C, 80D, 24(b), and Section 10(13A) HRA exemption formula) is not fully implemented in the formula DAG.
3. **Landlord PAN Validation**: Section 10(13A) requires landlord PAN verification if annual rent exceeds ₹1,00,000. This is not validated programmatically.
4. **Declaration & Proof Verification Windows**: No model defines the fiscal year submission window (e.g. open from April 1 to April 30 for projections, and open from December 15 to January 31 for actual proof submission).
5. **Split-Pane Verification Workspace**: HR Admins have no UI to view the uploaded proof PDF side-by-side with declared amounts to approve, reject, or enter verified amounts.

---

## 3. Feature P2.3 — Biometric Attendance Integrations (ZKTeco, Matrix, eSSL)

### 3.1 Existing Capabilities
- **Database Schema**: `BiometricDevice` and `BiometricPunchLog` models exist with status, IP, port, API key, and verification mode.
- **Hardware Socket Driver**: `zk-protocol.ts` provides direct TCP/IP socket connection using `node-zklib` on port 4370.
- **ZKTeco ADMS Protocol**: `biometric.routes.ts` implements the ZKTeco iClock/ADMS HTTP push protocol (`/iclock/cdata`, `/iclock/getrequest`, `/adms`).
- **First-In / Last-Out Deduplication**: `processBiometricPunch()` handles punch recording and initial daily attendance binding.

### 3.2 Exact Technical Gaps
1. **Matrix (COSEC) Protocol Absence**: Matrix biometric devices do not support ZK protocol; they push data via Matrix COSEC Web API (SOAP/REST). This endpoint is completely absent.
2. **eSSL Cloud Push Protocol Adapter**: While eSSL standalone devices use ZK protocols, newer cloud models use customized push payloads. A device-family adapter abstraction is missing.
3. **Automated Reconciliation Cron**: Ingestion of raw punch logs into daily Attendance is performed synchronously per punch. High-volume devices require an asynchronous queue and an overnight reconciliation job to map punches against shifts (`ShiftDefinition`), grace periods, and late marks.
4. **Device Heartbeat & Health Monitoring**: Device status is static. A ping/polling daemon is needed to mark devices offline if they miss sync intervals.

---

## 4. Feature P2.4 — Bank Disbursement Formats (ICICI, HDFC, SBI) & Digital Signatures

### 4.1 Existing Capabilities
- **Employee Bank Details**: `Employee` model stores `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`.
- **Net Salary Calculation**: Phase 1 batch pipeline computes verified `netSalaryPayable`.
- **Double-Entry Ledger**: Chart of accounts has `JournalEntry` and `JournalItem` for salary disbursements.

### 4.2 Exact Technical Gaps
1. **Bank File Generators Missing**:
   - **ICICI CIB Format**: Pipe-delimited file layout with debit account, beneficiary details, payment mode (`NEFT`/`RTGS`/`FT`), and amount.
   - **HDFC Enet Format**: Comma-delimited layout with beneficiary code, transaction type, IFSC, and value date.
   - **SBI CMP Format**: Fixed-width or CSV layout with SBI transaction codes and trailer records.
2. **Pre-Disbursement Validation**: No pre-flight check validates that all employees in a completed payroll run have valid 11-digit IFSC codes (`^[A-Z]{4}0[A-Z0-9]{6}$`) and valid account numbers before generating the file.
3. **Disbursement Batch Tracking**: No model (`BankDisbursementBatch`) tracks generated payment files, payment reference numbers, payment execution dates, or bank response reconciliation (UTR numbers).
4. **Digital Signature Architecture**: No architecture exists to sign payment files using DSC Class 3 PKCS#7 / CMS format or XML-DSig as required by corporate banking portals.

---

## 5. Feature P2.5 — Statutory Returns & Portals (EPF ECR & ESIC Monthly Return)

### 5.1 Existing Capabilities
- **Establishment Credentials**: `Establishment` model stores `epfCode`, `esicCode`, `ptRegistrationNo`, `lwfRegistrationNo`.
- **Employee Identifiers**: `Employee` model stores `uan`, `esiNumber`, `pfNumber`, `pfEligible`, `esiEligible`.
- **Statutory Calculation**: Phase 1 batch worker computes exact EPF employee (12%), EPF employer (3.67%), EPS employer (8.33%), EDLI (0.5%), admin charges (0.5%), and ESIC (0.75% / 3.25%).
- **Form Models**: `statutory-form-data.service.ts` models Form 16, Form 12BB, and EPF Form 19/10C/31.

### 5.2 Exact Technical Gaps
1. **EPF ECR Version 2.0 Text Formatter**: No generator exists to construct the official 11-column `#~#` delimited text file mandated by the EPFO Unified Portal.
2. **NCP Days & Wage Cap Rules**: ECR requires exact calculation of Non-Contributing Period (NCP / LOP days) and wage capping at ₹15,000 for EPF/EPS/EDLI wages, adjusting EPS to 0 for members aged 58 and above.
3. **ESIC Monthly Return File Generator**: No generator exists to output the ESIC portal format (`.xlsx`/`.csv`) containing IP number, IP name, payable days, wages, and zero-day reason codes.
4. **Statutory Return Filing Record**: No database model tracks generated returns, challan TRRN numbers, filing status, submission dates, and generated file hashes.

---

## 6. Gap Summary & Remediation Priority

| Gap Area | Complexity | Dependency | Risk Level |
| :--- | :--- | :--- | :--- |
| **P2.1 Secure Receipt Storage & OCR** | Medium | Local storage / AWS S3 | Medium |
| **P2.1 Batch Reimbursement Injection**| Low | Phase 1 `payroll-batch.service.ts` | Low |
| **P2.2 FBP Allocation Basket Model** | Medium | `schema.prisma` migration | Medium |
| **P2.2 Split-Pane Tax Audit Screen** | Medium | React UI components | Low |
| **P2.3 Matrix COSEC Push Adapter** | Medium | Network / Webhook listener | Medium |
| **P2.3 Overnight Attendance Worker** | Medium | Attendance reconciliation | Low |
| **P2.4 Bank Formats (ICICI, HDFC, SBI)**| Medium | Bank specification layouts | High (Formatting strictness) |
| **P2.4 Digital Signing Architecture** | High | DSC / PKCS#7 standards | High (Bank acceptance) |
| **P2.5 EPF ECR v2.0 Formatter** | Medium | EPFO official 11-col spec | Blocker (Mandatory compliance) |
| **P2.5 ESIC Monthly Return Formatter**| Medium | ESIC official portal spec | Blocker (Mandatory compliance) |
