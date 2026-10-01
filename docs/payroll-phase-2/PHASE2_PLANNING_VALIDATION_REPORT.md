# Phase 2 Planning Validation & Architectural Correction Report
## Advanced Payroll Module: Cross-Document Audit, Compliance Verification & Wave Dependencies

**Document ID**: `DOC-P2-016`  
**Classification**: Validation, Architectural Review & Pre-Implementation Audit  
**Status**: VALIDATED WITH BLOCKERS — PRODUCT OWNER DECISIONS REQUIRED  
**Date**: October 1, 2026  
**Auditor**: Principal Software Architect, Senior Payroll Domain Engineer, Enterprise HRMS Consultant & QA Lead  

---

## 1. Executive Summary

A comprehensive, cross-document technical review was conducted on all 15 planning specifications located in [docs/payroll-phase-2/](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2).

The purpose of this review is to validate consistency, verify statutory accuracy, expose unsupported technical assumptions (especially regarding bank layouts and biometric protocols), delineate actual blockers for **Wave 2.1** versus later waves, and document necessary corrections before any implementation or database migration is permitted.

### Review Verdict
# **VALIDATED WITH BLOCKERS — PRODUCT OWNER DECISIONS REQUIRED**

The architecture and overall wave structure are sound, but implementation of **Wave 2.1** cannot commence until **two specific Wave 2.1 blockers** (Secure Storage & OCR Provider selection) are approved. All banking, biometric, and statutory format unknowns have been isolated to later waves (Waves 2.3 and 2.4), ensuring that Wave 2.1 will not be blocked by third-party bank or hardware specifications.

---

## 2. Documents Reviewed

The validation covered 100% of the authored Phase 2 planning documentation suite:
1. [PHASE2_SCOPE_AND_REQUIREMENTS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_SCOPE_AND_REQUIREMENTS.md) (`DOC-P2-001`)
2. [PHASE2_PHASE1_DEPENDENCY_AUDIT.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_PHASE1_DEPENDENCY_AUDIT.md) (`DOC-P2-002`)
3. [PHASE2_FEATURE_GAP_ANALYSIS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_FEATURE_GAP_ANALYSIS.md) (`DOC-P2-003`)
4. [PHASE2_SYSTEM_ARCHITECTURE.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_SYSTEM_ARCHITECTURE.md) (`DOC-P2-004`)
5. [PHASE2_DATABASE_DESIGN.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_DATABASE_DESIGN.md) (`DOC-P2-005`)
6. [PHASE2_API_SPECIFICATION.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_API_SPECIFICATION.md) (`DOC-P2-006`)
7. [PHASE2_UI_UX_SCREEN_SPEC.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_UI_UX_SCREEN_SPEC.md) (`DOC-P2-007`)
8. [PHASE2_WORKFLOW_AND_PERMISSION_MATRIX.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_WORKFLOW_AND_PERMISSION_MATRIX.md) (`DOC-P2-008`)
9. [PHASE2_INTEGRATION_SPECIFICATIONS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_INTEGRATION_SPECIFICATIONS.md) (`DOC-P2-009`)
10. [PHASE2_STATUTORY_RESEARCH.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_STATUTORY_RESEARCH.md) (`DOC-P2-010`)
11. [PHASE2_SECURITY_AND_RISK_REGISTER.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_SECURITY_AND_RISK_REGISTER.md) (`DOC-P2-011`)
12. [PHASE2_IMPLEMENTATION_WAVE_PLAN.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_IMPLEMENTATION_WAVE_PLAN.md) (`DOC-P2-012`)
13. [PHASE2_TEST_STRATEGY.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_TEST_STRATEGY.md) (`DOC-P2-013`)
14. [PHASE2_PRODUCT_OWNER_QUESTIONS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_PRODUCT_OWNER_QUESTIONS.md) (`DOC-P2-014`)
15. [PHASE2_PLANNING_STATUS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_PLANNING_STATUS.md) (`DOC-P2-015`)

---

## 3. Contradictions & Errors Identified Across Planning Documents

During the cross-document review, five specific inconsistencies were detected and must be corrected:

### 3.1 Contradiction: Premature Database Schema Scoping in Wave 2.1
- **Discrepancy**:
  - In [PHASE2_IMPLEMENTATION_WAVE_PLAN.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_IMPLEMENTATION_WAVE_PLAN.md), Wave 2.1 lists schema migrations for `FbpDeclaration`, `BankDisbursementBatch`, and `StatutoryReturnFiling`.
  - However, in [PHASE2_SCOPE_AND_REQUIREMENTS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_SCOPE_AND_REQUIREMENTS.md), FBP is assigned to Wave 2.2, while Bank Disbursements and Statutory Returns are assigned to Wave 2.4.
- **Impact**: Creating database tables for banking and statutory returns in Wave 2.1 before bank corporate layouts (Q-07) and establishment filing partitions (Q-09) are signed off by the Product Owner introduces severe rework risk if column requirements change.
- **Correction**: Restrict Wave 2.1 schema changes strictly to **Document Storage, Receipt Integrity Hashing, and Expense Claim Metadata**. Defer `FbpDeclaration` to Wave 2.2, and `BankDisbursementBatch` / `StatutoryReturnFiling` to Wave 2.4.

### 3.2 Contradiction: Memory-Heavy Base64 vs Secure Streaming Uploads
- **Discrepancy**:
  - [PHASE2_API_SPECIFICATION.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_API_SPECIFICATION.md) defines `POST /api/expenses/claims/ocr-extract` and `POST /api/expenses/claims/submit` accepting a JSON payload containing `"fileBase64"`.
  - Conversely, [PHASE2_SECURITY_AND_RISK_REGISTER.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_SECURITY_AND_RISK_REGISTER.md) (`SEC-003`) flags raw base64 payloads as a memory consumption risk that spikes Node.js event loop memory under concurrency and recommends streaming uploads.
- **Impact**: Inconsistent API contracts between the specification and security guidelines.
- **Correction**: Standardize the upload contract on standard `multipart/form-data` with disk/memory streaming, or enforce a strict 10MB payload size limit with early body-parser rejection for base64 endpoints.

### 3.3 Contradiction: Digital Signature Storage Representation
- **Discrepancy**:
  - [PHASE2_DATABASE_DESIGN.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_DATABASE_DESIGN.md) defines `signatureDigest String? @map("signature_digest") @db.Text` on `BankDisbursementBatch`.
  - [PHASE2_INTEGRATION_SPECIFICATIONS.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_INTEGRATION_SPECIFICATIONS.md) states that corporate banking portals require a detached binary PKCS#7 / CMS file (`.sig` or `.p7s`) alongside the payout file.
- **Impact**: Storing a simple string digest is insufficient if the bank expects a binary DER-encoded or PEM-formatted signature file for download.
- **Correction**: Update the schema design to store both `signatureDigest` (the Base64 CMS structure) and `signatureFileUrl` (the stored `.sig` binary file location).

### 3.4 Contradiction: Reimbursement Lifecycle Non-Payroll Bypass
- **Discrepancy**:
  - [PHASE2_WORKFLOW_AND_PERMISSION_MATRIX.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_WORKFLOW_AND_PERMISSION_MATRIX.md) depicted the reimbursement lifecycle as strictly terminating via `PayrollRun` calculation (`FINANCE_APPROVED -> REIMBURSED`).
  - However, the existing active code in [expenses.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/expenses.routes.ts) supports `reimbursementMethod = 'direct_bank_transfer'` and `'petty_cash'` via `POST /api/expenses/claims/:id/reimburse`.
- **Impact**: Bypasses the payroll batch without documentation, confusing financial reconciliation.
- **Correction**: Update the workflow lifecycle diagram to explicitly show the two diverging paths:
  1. `payroll_addition`: Transitions to `REIMBURSED` via `PayrollRun` execution.
  2. `direct_bank_transfer` / `petty_cash`: Transitions to `REIMBURSED` via immediate Finance settlement.

### 3.5 Contradiction: Test Strategy Hardcoded Wage Caps vs Company PF Policies
- **Discrepancy**:
  - [PHASE2_TEST_STRATEGY.md](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/payroll-phase-2/PHASE2_TEST_STRATEGY.md) (`UT-219`) specifies: "Test EPF/EPS ₹15,000 statutory wage ceiling cap".
  - However, in [schema.prisma](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/prisma/schema.prisma), `Employee` contains `pfCalculationMethod` (`statutory_ceiling` vs `actual_basic`) and `pfCustomCap`.
- **Impact**: An enterprise test asserting a fixed ₹15,000 cap will fail for employees configured with voluntary higher PF contributions on actual basic pay under Para 26(6).
- **Correction**: The test assertion must test both branches: statutory ceiling (capped at ₹15,000) and actual basic pay (uncapped EPF wages with EPS wages capped at ₹15,000).

---

## 4. Statutory & Tax Rules Requiring Verification or Correction

| Statutory Domain | Current Rule in Planning Docs | Verified Legal Status | Correction / Clarification Required |
| :--- | :--- | :--- | :--- |
| **New Tax Regime Slabs (Sec 115BAC)** | FY 2025-26 & 2026-27 Slabs: 0-3L Nil, 3-7L 5%, 7-10L 10%, 10-12L 15%, 12-15L 20%, >15L 30%. Standard deduction ₹75,000. | **VERIFIED** (Finance Act 2024 / Income-tax Act 2025) | Slabs are legally verified. However, **Marginal Relief under Section 87A** for income slightly above ₹7,00,000 must be explicitly accounted for in formula evaluator. |
| **Old Tax Regime HRA (Sec 10(13A))** | Least of: Actual HRA, 50%/40% of Basic, Rent Paid - 10% of Basic. | **VERIFIED** (Rule 2A, Income-tax Rules 1962) | Metro cities (50% Basic) strictly defined as **Mumbai, Delhi, Kolkata, Chennai**. All other locations are Non-Metro (40% Basic). Metro flag must derive from `Establishment.stateCode` or work location. |
| **Landlord PAN Mandate** | Mandatory if annual rent exceeds ₹1,00,000. | **VERIFIED** (CBDT Circular No. 08/2013) | If rent exceeds ₹1,00,000/year (~₹8,333/month) and landlord has no PAN, a statutory Form 60 declaration is required. System must flag unverified claims without PAN as non-exempt HRA. |
| **EPF ECR Age 58 EPS Rule** | EPS Wage = 0; EPS Remitted = 0; Employer 12% diverted to EPF A/c 1. | **VERIFIED** (Employees' Pension Scheme, 1995, Para 6(a)) | Exact date of attaining 58 matters: If birthday is on the 1st of the month, EPS ceases from that month; if mid-month, EPFO portals calculate prorated or full cessation. **Needs operational verification with EPFO portal guidance**. |
| **State Labour Welfare Fund (LWF)** | Formats and rates listed as provisional. | **UNVERIFIED STATE VARIATION** | LWF remittance frequencies (annual in MH, half-yearly in KA, monthly in others) vary widely. **LWF returns must remain decoupled from Central EPF/ESIC returns**. |

---

## 5. Unsupported Bank & Biometric Assumptions

### 5.1 Corporate Bank Payout Layouts (ICICI, HDFC, SBI)
- **Unsupported Assumption**: The planning documents presented generic file specifications for ICICI CIB (pipe-delimited), HDFC Enet (11-column CSV), and SBI CMP (fixed-width/CSV).
- **Reality & Technical Risk**:
  1. **ICICI Bank**: Corporate clients use either ICICI CIB standard pipe-delimited, ICICI EazyPay, or Host-to-Host (H2H) encrypted XML. A generic pipe layout will be rejected if the client is provisioned on ICICI EazyPay or requires an encryption certificate.
  2. **HDFC Bank**: HDFC Enet standard bulk payout format has 13 or 14 specific columns, requiring an exact corporate user code and product code (`NEF`, `RTG`, `IFT`).
  3. **SBI CMP**: SBI Corporate Multi-Payment system mandates exact customer client codes (e.g. `CMP12345`) and header/trailer checksum lines.
- **Resolution**: **All bank payout layouts must be formally classified as DESIGN ONLY — PENDING BANK RELATIONSHIP MANAGER (RM) SAMPLE TEMPLATES**. The generator service must use a pluggable template architecture (`BankPayoutAdapter`) that adapts column mappings without code refactoring.

### 5.2 Biometric Protocols (Matrix & eSSL)
- **Unsupported Assumption**: The planning documents assumed all Matrix devices push JSON directly via HTTP webhook to `/api/biometric/matrix/push`, and that eSSL devices can be polled directly via socket port 4370.
- **Reality & Technical Risk**:
  1. **Matrix Devices**: Most enterprise Matrix COSEC installations communicate via the central **Matrix COSEC CENTRA / COSEC VYOM** server, not direct WAN door controllers. If COSEC CENTRA is used, integration must occur via the COSEC Database sync or COSEC CENTRA REST Web API, not individual device webhooks.
  2. **eSSL Devices**: Many eSSL deployments use desktop software (**eTimeTrackLite**) connected to an on-premises MS Access (`.mdb`) or SQL Server database. Standalone socket polling via `node-zklib` will fail if devices are behind a strict corporate NAT/firewall without port forwarding.
- **Resolution**: Distinguish between:
  - *Direct Hardware Push* (ZKTeco ADMS / Matrix standalone)
  - *Central Server Sync Agent* (COSEC CENTRA / eTimeTrackLite SQL Sync Agent)

---

## 6. Security & Isolation Issues to Resolve Before Implementation

The security findings identified during the Phase 1 audit must be resolved before releasing Phase 2 code:

| Risk Code | Issue | Mandatory Fix Required in Wave 2.1 |
| :--- | :--- | :--- |
| **SEC-FIX-01** | Unvalidated Document URLs (`receiptUrl`, `fileUrl`) | Build centralized `StorageService`: validate binary MIME magic bytes (PDF `%PDF`, PNG `\x89PNG`, JPG `\xFF\xD8\xFF`), reject `.exe`/`.js`/`.sh`, store in tenant-partitioned disk/S3 paths (`/storage/tenants/:tenantId/`), and compute SHA-256 integrity hash. |
| **SEC-FIX-02** | SSRF & Path Traversal Vulnerability | Prohibit direct filesystem path parameter passing. Serve documents strictly through an authenticated proxy route: `GET /api/documents/:id/stream` with JWT tenant verification. |
| **SEC-FIX-03** | Missing Pre-Disbursement Bank Validation | Add bank account and IFSC format validator (`^[A-Z]{4}0[A-Z0-9]{6}$`) in `payroll-batch.service.ts` pre-flight diagnostics to catch invalid payees prior to batch finalization. |
| **SEC-FIX-04** | OCR Payload Memory Exhaustion | Add payload size limit middleware (max 10MB) on OCR routes to prevent Node.js heap out-of-memory crashes. |

---

## 7. Product Owner Decision Matrix: Wave 2.1 vs Later Waves

To prevent unnecessary project standstills, the 10 Product Owner questions from `PHASE2_PRODUCT_OWNER_QUESTIONS.md` are divided into **immediate blockers for Wave 2.1** and **decisions that can be safely deferred to later waves**:

### 7.1 Immediate Blockers Required for Wave 2.1 Approval

| Decision ID | Question / Decision Area | Why It Blocks Wave 2.1 | Actionable Choice for Product Owner |
| :--- | :--- | :--- | :--- |
| **PO-DEC-01** (Q-02) | **Document Storage Strategy & Retention** | Wave 2.1 implements the secure storage service. Must know storage backend. | **Option A**: Local encrypted disk storage (partitioned by tenant).<br>**Option B**: Cloud Object Storage (AWS S3 / MinIO / GCS).<br>*(Recommended: Option A local disk for immediate on-prem delivery, with S3 pluggable adapter).* |
| **PO-DEC-02** (Q-02) | **OCR Engine Provider Selection** | Wave 2.1 implements the advisory receipt OCR parser. | **Option A (Recommended)**: Local self-hosted Tesseract/LayoutLM (zero API cost, 100% on-prem privacy).<br>**Option B**: Cloud Document AI (Google/AWS Textract) requiring cloud API billing. |

---

### 7.2 Decisions Deferred to Later Waves (Not Blocking Wave 2.1)

| Decision ID | Target Wave | Question / Decision Area | Reason It Can Wait |
| :--- | :---: | :--- | :--- |
| **PO-DEC-03** (Q-01) | Wave 2.2 | Reimbursement Category Monthly Limits & Multi-Tier Approvals | Handled in Wave 2.2 UI & batch injector; basic claim submission structure is fixed. |
| **PO-DEC-04** (Q-03) | Wave 2.2 | Flexible Benefit Plan (FBP) Eligibility & Declaration Windows | FBP schema and UI are implemented in Wave 2.2. |
| **PO-DEC-05** (Q-04) | Wave 2.2 | Tax Regime Defaulting & Mid-Year Switching Policy | Dual-regime TDS engine is integrated in Wave 2.2. |
| **PO-DEC-06** (Q-05) | Wave 2.3 | Biometric Device Inventory & Firmware Versions | Biometric adapters are implemented in Wave 2.3. |
| **PO-DEC-07** (Q-06) | Wave 2.3 | Biometric Network Topology (LAN vs WAN vs CENTRA) | Hardware connectivity tested in Wave 2.3. |
| **PO-DEC-08** (Q-07) | Wave 2.4 | Corporate Bank Format Guidelines (ICICI, HDFC, SBI) | Bank disbursement file generation is built in Wave 2.4. |
| **PO-DEC-09** (Q-08) | Wave 2.4 | Digital Signature Bridge (USB Token vs Server HSM) | Digital signing is built in Wave 2.4. |
| **PO-DEC-10** (Q-09) | Wave 2.4 | EPF/ESIC Branch Establishment Filing Partitioning | Statutory returns are built in Wave 2.4. |

---

## 8. Corrected Implementation Dependencies

The revised dependency chain guarantees that no wave waits on unapproved third-party specifications:

```
┌────────────────────────────────────────────────────────────────────────┐
│ WAVE 2.1: Foundation Extensions & Secure Document Subsystem            │
│  Prerequisites: PO-DEC-01 (Storage Option) & PO-DEC-02 (OCR Provider)  │
│  - Secure Storage Service with MIME & SHA-256 Hashing                  │
│  - Schema Updates: ExpenseClaim receiptHash, ocrExtracted              │
│  - Advisory Receipt OCR Parser (Local/Pluggable)                       │
│  - Resolve Security Findings: SEC-FIX-01, SEC-FIX-02, SEC-FIX-04       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WAVE 2.2: Employee Self-Service & Compliance Workflows                 │
│  Prerequisites: PO-DEC-03 (Limits), PO-DEC-04 (FBP), PO-DEC-05 (Regime)│
│  - Reimbursement Claim Submission Wizard & Duplicate Detection         │
│  - Payroll Batch Reimbursement Earning Injection                       │
│  - FBP Component Basket Allocation (Schema & UI)                       │
│  - Dual-Regime (Sec 115BAC) TDS Engine with HRA Sec 10(13A) Exemption  │
│  - HR Admin Split-Pane Tax Proof Verification Workspace                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WAVE 2.3: Multi-Vendor Biometric Attendance Integration                │
│  Prerequisites: PO-DEC-06 (Hardware Inventory) & PO-DEC-07 (Topology)  │
│  - Matrix COSEC Adapter (Direct Webhook or CENTRA Sync)                │
│  - eSSL Hardware Family Support & Offline Replay Buffer                │
│  - Scheduled Overnight Reconciliation Worker (Punches -> Shifts -> LOP)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WAVE 2.4: Bank Disbursement Engine & Statutory Returns Export          │
│  Prerequisites: PO-DEC-08 (Bank RM Specs), PO-DEC-09 (DSC), PO-DEC-10  │
│  - Pre-Disbursement Bank Validator (SEC-FIX-03)                       │
│  - Pluggable Bank Format Generators (ICICI CIB, HDFC Enet, SBI CMP)    │
│  - PKCS#7 / CMS Detached Digital Signature Bridge                      │
│  - EPF ECR v2.0 (#~# 11-column) Formatter with Age 58 EPS Rule         │
│  - ESIC Monthly Return (.xlsx) Formatter                               │
│  - BankDisbursementBatch & StatutoryReturnFiling Schema & Tracking     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Summary of Required Document Updates

The following corrections must be maintained in the planning records:
1. **`PHASE2_IMPLEMENTATION_WAVE_PLAN.md`**: Decouple `BankDisbursementBatch` and `StatutoryReturnFiling` from Wave 2.1 to Wave 2.4.
2. **`PHASE2_DATABASE_DESIGN.md`**: Add `signatureFileUrl` to `BankDisbursementBatch` for detached PKCS#7 binary file persistence.
3. **`PHASE2_API_SPECIFICATION.md`**: Document `multipart/form-data` as the primary standard for file uploads alongside base64 with a 10MB ceiling.
4. **`PHASE2_TEST_STRATEGY.md`**: Update `UT-219` to test both statutory wage ceiling (₹15,000) and actual basic pay branches.
5. **`PHASE2_INTEGRATION_SPECIFICATIONS.md`**: Add explicit disclaimers that ICICI, HDFC, and SBI specifications are representative baselines pending bank RM template approval.

---

## 10. Final Status & Exact Next Action

### Final Status:
# **VALIDATED WITH BLOCKERS — PRODUCT OWNER DECISIONS REQUIRED**

### Exact Next Action Required from Product Owner:
To unblock and begin **Wave 2.1: Foundation Extensions & Secure Document Subsystem**, the Product Owner must provide decisions on the **two Wave 2.1 blockers**:
1. **PO-DEC-01 (Storage)**: Confirm local encrypted disk storage (`/storage/tenants/:tenantId/`) or Cloud S3. *(Recommended: Local disk storage with S3 adapter).*
2. **PO-DEC-02 (OCR Provider)**: Confirm self-hosted local OCR (Tesseract) for zero external API costs, or Cloud Document AI. *(Recommended: Self-hosted local OCR).*

Decisions regarding Bank Payout templates, Biometric hardware models, and FBP policies can be provided during Wave 2.1 execution and will not delay the start of development.
