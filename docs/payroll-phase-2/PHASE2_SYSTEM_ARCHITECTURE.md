# Phase 2 System Architecture & Integration Topology
## Advanced Payroll Module: Multi-Channel Compliance & Operational Architecture

**Document ID**: `DOC-P2-004`  
**Classification**: Enterprise Architecture Specification  
**Status**: PROPOSED DESIGN (PLANNING ONLY)  
**Date**: October 1, 2026  
**Architect**: Principal Software Architect  

---

## 1. High-Level Architecture Overview

Phase 2 expands the existing ERP architecture by introducing four specialized service adapters that interface seamlessly with the core Phase 1 Foundation Engine:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND CLIENT (REACT 19)                             │
│  ┌───────────────────────┬────────────────────────┬─────────────────────────────────┐  │
│  │ Employee Self-Service │  Manager Approvals     │  HR & Payroll Admin Workspace   │  │
│  │  - Expense Claims     │   - Claims Review      │   - Tax Proof Split Audit       │  │
│  │  - FBP Declarations   │   - Attendance Review  │   - Bank Disbursement Console   │  │
│  │  - Receipt OCR Assist │                        │   - Statutory Filing Center     │  │
│  └───────────────────────┴────────────────────────┴─────────────────────────────────┘  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTPS / REST / WebSockets
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                               EXPRESS BACKEND SERVER (NODE.JS)                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         REST CONTROLLERS & ROUTERS                               │  │
│  │  /api/expenses/claims   /api/tax-declarations   /api/biometric   /api/payroll    │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │                                              │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │                       PHASE 2 SERVICE LAYER (BUSINESS LOGIC)                     │  │
│  │                                                                                  │  │
│  │  ┌───────────────────────────────┐     ┌──────────────────────────────────────┐  │  │
│  │  │ P2.1 Reimbursement & OCR      │     │ P2.2 FBP & Dual-Regime TDS Engine    │  │  │
│  │  │  - Advisory Receipt Parser    │     │  - FBP Component Basket Validator    │  │  │
│  │  │  - Secure Storage Service     │     │  - Section 115BAC Slabs & Sec 87A    │  │  │
│  │  │  - Duplicate Claim Detector   │     │  - Chapter VI-A Deduction Verifier   │  │  │
│  │  └──────────────┬────────────────┘     └──────────────────┬───────────────────┘  │  │
│  │                 │                                         │                      │  │
│  │                 └───────────────────┐ ┌───────────────────┘                      │  │
│  │                                     ▼ ▼                                          │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │              PHASE 1 CORE FOUNDATION ENGINE (UNMODIFIED)                   │  │  │
│  │  │   Safe Formula AST DAG    •   Decimal.js Arithmetic   •   Cutoff Windows   │  │  │
│  │  │   Batch Worker Pipeline   •   Pre-Flight Diagnostics  •   Snapshot Lock    │  │  │
│  │  └──────────────────────────────────┬─────────────────────────────────────────┘  │  │
│  │                                     │                                            │  │
│  │                 ┌───────────────────┴─────────────────────┐                      │  │
│  │                 ▼                                         ▼                      │  │
│  │  ┌───────────────────────────────┐     ┌──────────────────────────────────────┐  │  │
│  │  │ P2.4 Bank Disbursement Engine │     │ P2.5 Statutory Filing Engine         │  │  │
│  │  │  - ICICI CIB Pipe Formatter   │     │  - EPF ECR v2.0 (#~# Delimited)      │  │  │
│  │  │  - HDFC Enet CSV Formatter    │     │  - ESIC Monthly Contribution Portal  │  │  │
│  │  │  - SBI CMP File Formatter     │     │  - Establishment Wage Partitioning   │  │  │
│  │  │  - PKCS#7 / DSC Signing Bridge│     │  - Challan TRRN & Filing Tracker     │  │  │
│  │  └───────────────────────────────┘     └──────────────────────────────────────┘  │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ P2.3 Biometric Multi-Vendor Ingestion Layer                                │  │  │
│  │  │  - ZKTeco ADMS & TCP/IP Socket Adapter   - Matrix COSEC Web API Adapter    │  │  │
│  │  │  - eSSL Device Family Push Adapter       - Overnight Reconciliation Worker │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │ PRISMA ORM (ROW-LEVEL TENANT SCOPING)        │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │                         MYSQL DATABASE (RELATIONAL STORE)                        │  │
│  │  ExpenseClaims   TaxDeclarations   BiometricPunchLogs   BankDisbursements        │  │
│  │  PayrollRuns     Payslips          PayrollSnapshots     StatutoryReturnFilings   │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Boundaries & Data Flow

### 2.1 Reimbursement to Payroll Pipeline (P2.1)
1. **Filing**: Employee uploads receipt via `POST /api/expenses/claims`.
2. **Advisory OCR**: Receipt image is parsed by OCR service; suggested values (merchant, date, amount, tax) populate the UI for employee confirmation.
3. **Storage & Hash**: Document is stored in tenant-isolated secure storage (`/uploads/tenants/:tenantId/expenses/:claimId/`), generating an integrity SHA-256 hash.
4. **Approval**: Workflow transitions: `pending` -> `manager_approved` -> `finance_approved`.
5. **Batch Ingestion**: During payroll run execution (`runPayrollBatchChunk`), the pipeline queries all `finance_approved` claims where `reimbursementMethod = 'payroll_addition'` and `payrollMonth = run.month`.
6. **Earning Addition**: The total approved reimbursement is added to the employee's gross earned as a non-taxable (or policy-taxable) line item, traced in `PayrollExecutionTrace`.
7. **Settlement**: Upon payroll run completion, claims are marked `status = 'reimbursed'` and auto-posted to the General Ledger.

### 2.2 FBP & Dual-Regime TDS Pipeline (P2.2)
1. **Declaration**: Employee submits annual tax regime choice (`new` vs `old`) and declared deductions under Section 80C, 80D, 24(b), and HRA rent.
2. **Proof Verification**: During the proof submission window, employee attaches rent agreements, LIC receipts, and medical insurance proofs.
3. **HR Audit Workspace**: HR Admin validates proofs, adjusting `declaredAmount` to `approvedAmount`.
4. **TDS Withholding**: The payroll calculation engine runs `calculateAnnualTDS()` with verified values, computing the net annual tax liability, subtracting previously deducted TDS in prior FY months, and dividing the remainder across the remaining months of the fiscal year.

### 2.3 Biometric Ingestion & Attendance Pipeline (P2.3)
1. **Hardware Ingestion**:
   - ZKTeco devices push raw punch records to `/iclock/cdata`.
   - Matrix devices push JSON/XML payloads to `/api/biometric/matrix/push`.
   - Standalone devices are polled via direct TCP/IP socket (`pullAttendanceLogsFromZkDevice`).
2. **Deduplication**: Ingested punches are written to `BiometricPunchLog` with a deduplication check on `(tenantId, employeeCode, punchTime)`.
3. **Reconciliation Worker**: A scheduled background job runs at midnight:
   - Aggregates daily punch logs per employee.
   - Evaluates First-In and Last-Out against the employee's assigned `ShiftDefinition`.
   - Upserts into the `Attendance` table with `status` (`present`, `half_day`, `late`, `absent`).
4. **Cutoff Integration**: When payroll is executed, `payroll-attendance.service.ts` reads the reconciled `Attendance` records to calculate payable days and LOP proration without needing direct hardware access.

### 2.4 Bank Disbursement Pipeline (P2.4)
1. **Run Finalization**: Payroll Run transitions to `completed` or `approved`.
2. **Pre-Disbursement Audit**: Diagnostic validator verifies all payees have valid bank account numbers, 11-character RBI IFSC codes, and match KYC names.
3. **Format Engine**: User selects bank format (ICICI CIB, HDFC Enet, SBI CMP). The service constructs the bank-compliant string payload and generates a SHA-256 batch hash.
4. **Digital Signature (DSC)**: If corporate policy requires, the file hash is passed to the client-side signing bridge or HSM service to attach a detached PKCS#7 signature (`.sig`).
5. **Batch Record**: A `BankDisbursementBatch` record is created, locking the payment batch and providing an audit trail for download and bank reconciliation.

### 2.5 Statutory Filing Pipeline (P2.5)
1. **Payroll Data Extraction**: Finalized `PayrollSnapshot` records are loaded for the target month and establishment.
2. **EPF ECR Generation**:
   - Formats the 11-column `#~#` delimited file.
   - Evaluates EPF/EPS wage caps (₹15,000 ceiling), age 58 pension exemption, and NCP days.
   - Computes Account 1, 2, 10, 21, and 22 challan aggregates.
3. **ESIC Return Generation**:
   - Formats the official ESIC portal upload file with IP numbers, payable days, and zero-wage reason codes.
4. **Filing Audit Record**: Creates a `StatutoryReturnFiling` record with the generated file hash, generation timestamp, and filing status tracker.

---

## 3. External Integration Architecture

| Integration Domain | Protocol / Standard | Network Topology | Security & Credentials |
| :--- | :--- | :--- | :--- |
| **ZKTeco Biometric** | HTTP ADMS / Push SDK; TCP Port 4370 | Inbound webhook / outbound LAN socket | Device API Key, IP whitelisting |
| **Matrix COSEC** | REST Webhook / SOAP HTTP Push | Inbound HTTPS webhook | Basic Auth / HMAC signature header |
| **eSSL Hardware** | Push SDK / TCP Port 4370 | Inbound HTTP / outbound LAN socket | Device Serial & API Secret |
| **ICICI CIB** | Pipe-delimited flat file (H^ / D^) | Outbound portal batch upload | Bank corporate client code & DSC |
| **HDFC Enet** | Comma-delimited CSV format | Outbound portal batch upload | Corporate user ID & PKCS#7 DSC |
| **SBI CMP** | Fixed-width / CSV layout | Outbound portal batch upload | Corporate account ID & DSC |
| **EPFO Unified Portal** | `#~#` delimited ASCII text file | Outbound portal batch upload | Employer Establishment Code & DSC |
| **ESIC Insurance Portal** | `.xlsx` / `.csv` spreadsheet upload | Outbound portal batch upload | Employer ESIC Registration Code |
