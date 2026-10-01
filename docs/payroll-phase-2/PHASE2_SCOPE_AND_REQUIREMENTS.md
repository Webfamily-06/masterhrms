# Phase 2 — Scope and Requirements Specification
## Advanced Payroll Module: Compliance, Reimbursements & Multi-Channel Integrations

**Document ID**: `DOC-P2-001`  
**Classification**: Architecture & Planning Specification  
**Status**: DRAFT FOR PRODUCT OWNER REVIEW  
**Date**: October 1, 2026  
**Auditor/Architect**: Principal Software Architect & Senior Payroll Domain Engineer  

---

## 1. Executive Overview

Phase 2 builds upon the **Phase 1 Foundation Engine + Paysheet Export MVP** to transition the Advanced Payroll Module from a foundational calculation engine to an automated, multi-channel compliance and operational system.

This document defines the strict functional boundaries of Phase 2 across five core capability tracks:
1. **P2.1: Employee Reimbursement Workflow with Attachments and OCR**
2. **P2.2: Flexible Benefit Plan (FBP) Declarations & Investment Proofs (Old vs New Tax Regimes under Section 115BAC)**
3. **P2.3: Biometric Attendance Integrations (ZKTeco, Matrix, eSSL)**
4. **P2.4: Bank Disbursement File Engine (ICICI, HDFC, SBI) with Digital Signatures**
5. **P2.5: Statutory Returns & Portals (EPF ECR v2.0 & ESIC Monthly Return)**

---

## 2. Requirement Classification Framework

To uphold architectural integrity and eliminate undocumented assumptions, all requirements in this specification are partitioned into four explicit categories:
- **[VERIFIED EXISTENCE]**: Features, models, or APIs that have been physically inspected in the workspace and validated.
- **[CONFIRMED SCOPE]**: Approved Phase 2 deliverables established in Phase 0 architecture baseline.
- **[PROPOSED DESIGN]**: Enterprise architecture extensions proposed to bridge verified gaps without breaking Phase 1.
- **[UNRESOLVED / REQUIRES PO APPROVAL]**: Business rules, thresholds, vendor formats, or compliance policies requiring Product Owner sign-off before implementation.

---

## 3. Scope Decomposition by Feature Group

### 3.1 P2.1 — Employee Reimbursement Workflow with Attachments & OCR

#### Functional Scope
- **Self-Service Claim Filing**: Employees submit claims under defined categories (Travel, Food, Medical, Equipment, Software, Office Supplies).
- **Receipt Attachment Pipeline**: Secure upload and validation of receipt documents (PDF, PNG, JPG).
- **OCR Receipt Assistance**: Automated extraction of merchant, date, invoice number, line items, tax amount, and total amount to pre-populate claim forms.
  - *Guardrail*: OCR is strictly **advisory**. It never auto-approves claims. Low-confidence extractions (< 90%) must be flagged for manual review.
- **Multi-Level Approval Hierarchy**: Configurable approval routing:
  - Level 1: Reporting Manager (attendance and business relevance validation).
  - Level 2: Finance / HR Admin (financial audit, tax proof verification, and policy limit checks).
- **Duplicate Claim Detection**: Automated warning if a claim matches an existing employee receipt by identical `(merchant, date, amount)` within a 60-day window.
- **Phase 1 Payroll Batch Integration**: Approved claims designated for `payroll_addition` must automatically inject into the payroll batch worker (`payroll-batch.service.ts`), reflecting as non-taxable or taxable reimbursements on payslips and paysheets.

#### Verified Current State in Workspace
- [schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma): `ExpenseCategory` and `ExpenseClaim` models exist.
- [expenses.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/expenses.routes.ts): Basic CRUD and single-stage approval exist (`status`: "pending", "manager_approved", "finance_approved", "reimbursed", "rejected").
- [ai-ocr.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/ai-ocr.tsx) & [ai.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/ai.routes.ts): OCR engine exists for procurement bills (`/api/ai/ocr/extract`), but is not wired into the employee expense claim modal.
- Document storage currently accepts raw `receiptUrl` strings without validation, hashing, or virus scanning hooks.

#### Out-of-Scope for P2.1
- Corporate credit card automated transaction feeds (Plaid/Yodlee) — deferred to Phase 3.
- Automated per-diem GPS route tracking — deferred to Phase 3.

---

### 3.2 P2.2 — Flexible Benefit Plan (FBP) & Tax Proofs (Sec 115BAC)

#### Functional Scope
- **Annual FBP Component Allocation**: Employees declare annual allocations across allowed flexible components within their CTC basket:
  - Fuel & Driver Allowance (Rule 3)
  - Telephone & Broadband Reimbursement
  - Books, Periodicals & Research Journals
  - Children Education & Hostel Allowance
  - Meal Coupons / Food Allowance
- **Tax Regime Selection Engine**:
  - Selection of **New Tax Regime** (default under Section 115BAC / Finance Act 2024 / Income-tax Act 2025) vs **Old Tax Regime**.
  - Annual declaration window with administrative lock/freeze date.
  - Mid-year switching restrictions enforced as per Income Tax guidelines.
- **Chapter VI-A & Section 24(b) Investment Declarations**:
  - House Rent Paid (HRA exemption under Section 10(13A) in Old Regime).
  - Mandatory Landlord PAN capture if annual rent exceeds ₹1,00,000 (CBDT Circular 08/2013).
  - Deductions under Section 80C (up to ₹1,50,000), 80D (Health Insurance), 80CCD(1B) (NPS up to ₹50,000), 80G, and Home Loan Interest under Section 24(b) (up to ₹2,00,000 for self-occupied).
- **Proof Verification & Lockout Windows**:
  - Projected declaration window (April - October) vs Proof Verification window (December - February).
  - Proof document upload with side-by-side audit viewer for HR Admin.
  - Differential tax adjustment in Q4 payroll runs (January, February, March) based on verified vs declared proofs.

#### Verified Current State in Workspace
- [schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma): `EmployeeTaxDeclaration` and `TaxDeclarationProof` exist.
- [payroll-engine.service.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/payroll-engine.service.ts): `calculateAnnualTDS()` has hardcoded progressive slabs for New Tax Regime (Standard deduction ₹75,000, Sec 87A rebate ₹7,00,000).
- *Gap*: FBP component allocation basket is completely missing from database schema and payroll batch engine. Proof verification window cutoff is not enforced.

#### Out-of-Scope for P2.2
- Direct integration with Income Tax TRACES portal for 26AS cross-verification — deferred to Phase 3.
- Stock Option / ESOP perquisite tax valuation workflows — deferred to Phase 3.

---

### 3.3 P2.3 — Biometric Attendance Integrations (ZKTeco, Matrix, eSSL)

#### Functional Scope
- **Multi-Vendor Hardware Abstraction Layer**:
  - Unified device adapter interface supporting push, pull, and webhook protocols.
- **Vendor Support Matrix**:
  1. **ZKTeco**: ADMS HTTP Push protocol (`/iclock/cdata`) and direct TCP/IP socket polling via port 4370.
  2. **eSSL**: eTimeTrack push protocol and standalone ZK-compatible socket protocol.
  3. **Matrix**: Matrix COSEC Web API / SOAP / REST push webhook receiver.
- **Idempotent Punch Log Ingestion**:
  - De-duplication of punches within a configurable minimum interval (e.g. 60 seconds).
  - Offline punch backlog buffer and recovery mechanism for device network disconnections.
- **Scheduled Attendance Reconciliation Worker**:
  - Converts raw biometric punch logs into daily `Attendance` records.
  - Evaluates First-In / Last-Out timestamps against employee shift rosters (`ShiftDefinition`, `ShiftRoster`).
  - Automatically calculates late arrival, early departure, half-day, and full-day loss of pay (LOP).

#### Verified Current State in Workspace
- [schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma): `BiometricDevice` and `BiometricPunchLog` models exist.
- [zk-protocol.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/zk-protocol.ts): Real TCP/IP socket driver via `node-zklib` exists.
- [biometric.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/biometric.routes.ts): Full ZKTeco ADMS push routes (`/iclock/cdata`, `/iclock/getrequest`) implemented.
- *Gap*: Matrix COSEC push protocol is completely absent. eSSL device models with HTTP push payload variants are unmapped. Background reconciliation worker from raw logs to Shift attendance is unautomated.

#### Out-of-Scope for P2.3
- Facial recognition enrollment via browser webcam — deferred to Phase 3.
- Geofenced mobile GPS punch with mock-location prevention (handled in Mobile App scope).

---

### 3.4 P2.4 — Bank Disbursement File Formats (ICICI, HDFC, SBI) & Digital Signatures

#### Functional Scope
- **Corporate Banking Payment File Generators**:
  - **ICICI Bank CIB**: Pipe-delimited (`|`) or encrypted fixed-width format with transaction header, debit line, and itemized beneficiary lines.
  - **HDFC Bank Enet**: Comma-separated (`CSV`) bulk payment layout adhering to HDFC Corporate Banking format.
  - **SBI Corporate Multi-Payment System (CMP)**: Fixed-column text layout or CSV with bank-specific payment transaction codes (`NEFT`, `RTGS`, `IFT`).
- **Pre-Disbursement Validation Engine**:
  - Validates bank account number formatting (numeric check, length check 9–18 digits).
  - Validates RBI IFSC format (`^[A-Z]{4}0[A-Z0-9]{6}$`).
  - Verifies beneficiary name matching threshold against Employee Master.
  - Prevents duplicate batch generation for an already disbursed `PayrollRun`.
- **Digital Signature Integration (DSC)**:
  - Architecture supporting detached PKCS#7 / CMS signing (`.sig`) or XML-DSig as required by bank corporate upload portals.
  - Client-side USB token signing bridge or secure HSM service interface.
- **Audit & Payment Batch Tracking**:
  - Immutable record of generated payment batches, batch hash (SHA-256), author, download timestamp, and bank confirmation status (UTR reconciliation).

#### Verified Current State in Workspace
- `Employee` model contains `bankName`, `bankAccount`, `bankIfsc`, `bankBranch`.
- Phase 1 batch engine generates verified `netSalaryPayable`.
- *Gap*: Zero bank disbursement file formats exist. Zero digital signing architecture exists. No `BankDisbursementBatch` tracking model exists.

#### Out-of-Scope for P2.4
- Direct Host-to-Host (H2H) sFTP / Corporate Open Banking API direct execution (requires enterprise banking MoU and static corporate IP lease) — deferred to Phase 3.

---

### 3.5 P2.5 — Statutory Returns & Portals (EPF ECR & ESIC Monthly Return)

#### Functional Scope
- **EPF ECR (Electronic Challan cum Return) Version 2.0**:
  - Generates EPFO Unified Portal compliant text file delimited by `#~#`.
  - 11 canonical fields strictly mapped:
    1. UAN (12 digits)
    2. Member Name (as registered with EPFO)
    3. Gross Wages (Rupees)
    4. EPF Wages (capped at ₹15,000 or actual as per structure)
    5. EPS Wages (capped at ₹15,000; 0 if age >= 58 or non-member)
    6. EDLI Wages (capped at ₹15,000)
    7. EPF Contribution Remitted (Employee share 12%)
    8. EPS Contribution Remitted (Employer share 8.33%)
    9. EPF & EPS Difference (Employer share 3.67%)
    10. NCP Days (Non-Contributing Period / LOP days)
    11. Refund of Advances
  - Calculates Challan Statement totals across Account 1 (EPF), Account 2 (Admin 0.5%), Account 10 (EPS), Account 21 (EDLI 0.5%), Account 22 (EDLI Admin 0%).
- **ESIC Monthly Return Portal File**:
  - Generates ESIC Monthly Contribution file (`.xlsx` or `.csv`) for ESIC Insurance Portal upload.
  - Maps IP Number (10 digits), IP Name, Payable Days, Total Wages, Reason for Zero Working Days (if applicable), and Last Working Date.
- **Multi-Establishment Statutory Partitioning**:
  - Files generated strictly partitioned by `Establishment` (`epfCode`, `esicCode`) for multi-branch organizations.

#### Verified Current State in Workspace
- [schema.prisma](file:///c:/Users/TSV Global Solutions/Documents/hrms/server/prisma/schema.prisma): `Establishment` model with `epfCode`, `esicCode` active.
- Phase 1 batch pipeline computes exact EPF, EPS, EDLI, and ESIC components.
- [statutory-form-data.service.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/statutory-form-data.service.ts) models Form 16 and Form 12BB.
- *Gap*: ECR text file formatter and ESIC monthly portal file export pipelines do not exist.

#### Out-of-Scope for P2.5
- Automated browser RPA submission to EPFO / ESIC portals (requires solving CAPTCHAs and OTPs) — manual portal upload is standard enterprise workflow.

---

## 4. Requirements Summary Matrix

| ID | Capability Track | Current Status in Workspace | Phase 2 Scope Status | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-201** | Employee Reimbursement Filing UI | Implemented (Expenses page) | Needs Self-Service & OCR linking | High |
| **REQ-202** | Secure Document Upload & Hashing | Missing (URL-only) | Full Architecture Required | Blocker |
| **REQ-203** | Advisory OCR Parsing for Receipts | Implemented for Invoices | Port to Expense Claims | High |
| **REQ-204** | Reimbursement Batch Payroll Injector | Missing in Batch Worker | Integrate with `payroll-batch.service.ts` | High |
| **REQ-205** | Flexible Benefit Plan (FBP) Model | Missing in Schema | Full Schema & UI Required | High |
| **REQ-206** | Income Tax Proof Verification UI | Partial (Schema exists, UI basic) | Enterprise Split-Pane Audit Screen | High |
| **REQ-207** | ZKTeco Push / Socket Ingestion | Implemented & Verified | Hardening & Buffer Replay | Medium |
| **REQ-208** | Matrix COSEC Push Adapter | Not Implemented | Full Adapter Required | High |
| **REQ-209** | eSSL Hardware Family Support | Partial (ZK protocol models) | Model Mapping & Testing Matrix | Medium |
| **REQ-210** | Raw Punch to Shift Attendance Worker | Partial (Manual trigger) | Cron / Scheduled Worker | High |
| **REQ-211** | ICICI Bank CIB Payment Generator | Not Implemented | Format Engine Required | High |
| **REQ-212** | HDFC Bank Enet Payment Generator | Not Implemented | Format Engine Required | High |
| **REQ-213** | SBI CMP Payment Generator | Not Implemented | Format Engine Required | High |
| **REQ-214** | Digital Signature (DSC) Packaging | Not Implemented | Spec & Signing Bridge Plan | High |
| **REQ-215** | EPF ECR v2.0 Text Formatter (`#~#`)| Not Implemented | Generator & Validation Engine | Blocker |
| **REQ-216** | ESIC Monthly Return Formatter | Not Implemented | Generator & Validation Engine | Blocker |
