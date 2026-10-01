# WAVE 2.4 — SYSTEM ARCHITECTURE
## Advanced Payroll Module: Phase 2 — Wave 2.4 (Final Wave)
### Bank Disbursement Engine, Digital Signature Integration & Statutory Returns Subsystem

---

## 1. Executive Summary & Design Principles

Wave 2.4 represents the terminal implementation wave of **Advanced Payroll Module — Phase 2**. It delivers the institutional disbursement bridge and government statutory filing automation layer that consumes finalized payroll calculation results from Phase 1 and Wave 2.2.

### Core Architectural Principles:
1. **Isolated Adapter Pattern**: Zero coupling between the core payroll calculation engine and bank/government portal transmission formats. Bank-specific protocols (ICICI CIB, HDFC Enet, SBI CMP) and portal formats (EPFO ECR v2.0, ESIC Monthly Returns) reside in decoupled adapters.
2. **Double-Payment Invariant**: Payout batch creation and disbursement are strictly guarded against double-payment. Beneficiaries included in an approved, generated, or disbursed batch are atomically excluded from subsequent batches.
3. **Cryptographic Integrity & Non-Repudiation**: Payout batches and statutory returns calculate SHA-256 digests. Corporate bank payout files support detached PKCS#7 / RSA-SHA256 digital signatures with certificate verification.
4. **Data Privacy & Masking**: Employee bank account numbers are masked (`••••••••1234`) across all UI displays, API read payloads, and audit logs. Raw account numbers are only assembled in-memory during authorized file generation.
5. **Multi-Tenant Fail-Closed Isolation**: All models (`BankDisbursementBatch`, `BankDisbursementItem`, `StatutoryReturnFiling`) enforce mandatory `tenantId` foreign keys and composite unique constraints, preventing cross-tenant data exposure.

---

## 2. High-Level Subsystem Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FINALIZED PAYROLL RUN                           │
│           (PayrollRun, Payslips, Snapshots, SalaryComponents)          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       BANK DISBURSEMENT ENGINE       │  │  STATUTORY RETURNS SUBSYSTEM │
│        (BankPayoutService)           │  │  (StatutoryReturnService)    │
└───────────────────┬──────────────────┘  └──────────────┬───────────────┘
                    │                                    │
        ┌───────────┴───────────┐            ┌───────────┴───────────┐
        ▼                       ▼            ▼                       ▼
┌───────────────┐       ┌───────────────┐ ┌────────────────┐ ┌────────────────┐
│ PRE-PAYOUT    │       │ CORPORATE     │ │ EPFO ECR v2.0  │ │ ESIC MONTHLY   │
│ VALIDATOR     │       │ BANK ADAPTERS │ │ ADAPTER        │ │ ADAPTER        │
│ • IFSC Check  │       │ • ICICI CIB   │ │ • 11 Columns   │ │ • XLSX (.xlsx) │
│ • Acct Length │       │ • HDFC Enet   │ │ • #~# Delim    │ │ • CSV (.csv)   │
│ • Net > 0     │       │ • SBI CMP     │ │ • Age 58 Cutoff│ │ • Ceiling Check│
└───────────────┘       └───────┬───────┘ └───────┬────────┘ └───────┬────────┘
                                │                 │                  │
                                ▼                 ▼                  ▼
                        ┌───────────────┐ ┌────────────────┐ ┌────────────────┐
                        │ PKCS#7 SIGNER │ │ SHA-256 HASH   │ │ SHA-256 HASH   │
                        │ • RSA-SHA256  │ │ GENERATOR      │ │ GENERATOR      │
                        │ • Detached Sig│ │ (Integrity)    │ │ (Integrity)    │
                        └───────┬───────┘ └───────┬────────┘ └───────┬────────┘
                                │                 │                  │
                                ▼                 ▼                  ▼
                        ┌─────────────────────────────────────────────────────┐
                        │           TENANT-PARTITIONED SECURE STORAGE         │
                        │ (storage/tenants/:tenantId/disbursement|statutory/) │
                        └─────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Breakdown

### 3.1 Module A: Bank Disbursement Engine
- **Pre-Disbursement Validator**: Inspects `Employee` master records and `Payslip` net payable figures. Verifies RBI IFSC regex (`^[A-Z]{4}0[A-Z0-9]{6}$`), account length per bank requirements, and non-zero positive amounts.
- **Batch Creator & Lock Manager**: Groups eligible payslips under a `BankDisbursementBatch`. Generates idempotent batch references (`PAY-{BANK}-{YYYYMM}-{HEX6}`).
- **Batch Status Machine**:
  - `draft` ➔ `approved` ➔ `generated` ➔ `disbursed` (Terminal)
  - `draft` / `approved` ➔ `cancelled`

### 3.2 Module B: Digital Signature Integration
- Implemented in `DigitalSignatureService` using Node.js native `crypto`.
- Computes SHA-256 hash of plaintext payout transmission file.
- Generates detached PKCS#7 / RSA-SHA256 signature containing signing timestamp, signer identity, and ASN.1/DER envelope.
- Supports tamper detection: any byte alternation in the payout file causes signature verification to fail immediately.

### 3.3 Module C: EPFO ECR Version 2.0 Subsystem
- Adheres to the official EPFO Unified Employer Portal specification.
- Generates 11-column `#~#` delimited plain text records.
- **Para 8(3) EPS 1995 Compliance**: Automatically evaluates employee age against wage month. For members who have attained age 58, EPS Wages are forced to `0` and EPS Contribution is forced to `0`, allocating the full employer share to EPF.
- Tracks Non-Contributory Period (NCP) days calculated from approved unpaid leave (LOP).

### 3.4 Module D: ESIC Monthly Return Subsystem
- Generates both Portal Template Excel (`.xlsx` via `exceljs`) and Comma-Separated Values (`.csv`).
- Reconciles 0.75% Employee and 3.25% Employer shares based on ₹21,000 statutory gross wage ceiling.
- Handles zero-working-day scenarios by emitting standard statutory reason codes (`01` on leave without pay, `02` left service).

---

## 4. Tenant Isolation and Security Architecture

1. **Storage Partitioning**: All generated files are stored in tenant-isolated directories (`storage/tenants/{tenantId}/...`) with zero cross-tenant symlinks or shared buckets.
2. **Download Streaming Guard**: Download routes (`/api/payroll/disbursement/batches/:id/download` and `/api/payroll/statutory/filings/:id/download`) require valid JWT authentication and explicitly filter by `req.tenantContext.tenantId`.
3. **Data Masking Middleware**: The service layer masks account numbers (`••••••••1234`) before emitting JSON to controllers or loggers.
