# Phase 2 Security Architecture & Risk Register
## Advanced Payroll Module: Vulnerability Assessment, Threat Modeling & Risk Register

**Document ID**: `DOC-P2-011`  
**Classification**: Security Architecture & Risk Assessment  
**Status**: APPROVED SECURITY BASELINE  
**Date**: October 1, 2026  
**Auditor**: Principal Security Architect & Enterprise Compliance Auditor  

---

## 1. Security Architecture & Threat Model

Phase 2 introduces file uploads, biometric device network access, and bank disbursement files. This expansion significantly increases the system's attack surface, requiring comprehensive threat modeling:

```
Threat Vector                       Vulnerability Mitigation
────────────────────────────────────────────────────────────────────────────────
Malicious File Upload               Strict MIME validation, magic byte header
(Reimbursement/Tax proofs)          inspection, size limits, SHA-256 integrity hash,
                                    execution prevention (no direct script serving).
────────────────────────────────────────────────────────────────────────────────
Cross-Tenant Data Leakage           Mandatory row-level tenant filtering on 100% of
                                    Prisma queries and storage subdirectories.
────────────────────────────────────────────────────────────────────────────────
Bank File Tampering                 Cryptographic hash verification (SHA-256),
                                    immutable batch status locks, PKCS#7 digital
                                    signatures (DSC Class 3).
────────────────────────────────────────────────────────────────────────────────
Unauthenticated Biometric Push      Device-level API key validation, pre-shared
                                    HMAC authentication headers, IP whitelisting.
────────────────────────────────────────────────────────────────────────────────
Unauthorized Salary Snooping        Strict RBAC: Employees see only own payslips;
                                    Managers see approval totals without salary breakdowns.
```

---

## 2. Security Vulnerability Audit of Existing Implementation

During the Phase 1 and workspace audit, the following security findings were identified in the existing code:

| Risk ID | Affected Module | Vulnerability & Evidence | Severity | Proposed Mitigation | Blocks Phase 2? |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **SEC-001** | `documents.routes.ts` & `expenses.routes.ts` | **Unvalidated Document URLs**: Handlers accept arbitrary string `receiptUrl` / `fileUrl` without checking for malicious protocol (`javascript:`) or server-side request forgery (SSRF). | **HIGH** | Implement centralized secure document upload service with storage isolation, MIME whitelist, and internal authenticated download proxy. | **YES (Blocks P2.1)** |
| **SEC-002** | `biometric.routes.ts` | **Public Biometric Push Authentication**: Public route `/api/biometric/push` accepts raw punch logs with minimal payload validation. | **MEDIUM** | Enforce device API key lookup or pre-shared secret validation on every device punch payload. | No (Existing LAN usage) |
| **SEC-003** | `ai.routes.ts` | **OCR Endpoint Memory Consumption**: `/api/ai/ocr/extract` accepts large raw base64 payloads without streaming, creating high memory spikes under concurrency. | **MEDIUM** | Implement payload size limit (max 10MB) and asynchronous worker queue for document parsing. | No (Low concurrency) |
| **SEC-004** | `payroll-batch.service.ts` | **Bank Detail Integrity**: No regex format validation on bank account numbers or IFSC codes during payroll calculation. | **MEDIUM** | Add pre-flight bank format validator (`^[A-Z]{4}0[A-Z0-9]{6}$`) before payout file generation. | **YES (Blocks P2.4)** |

---

## 3. Comprehensive Phase 2 Risk Register

| Risk ID | Category | Risk Description | Likelihood | Impact | Mitigating Controls | Residual Risk |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| **RSK-201** | Compliance | Bank rejects bulk payout file due to slight formatting or character set mismatch. | High | Critical | Provide exact bank-specified format generators (ICICI, HDFC, SBI); include pre-disbursement IFSC/Account verification tool. | Low |
| **RSK-202** | Integrity | Duplicate employee reimbursement claims paid across different months. | Medium | High | Implement automated 60-day hash and duplicate invoice check on submission. | Low |
| **RSK-203** | Compliance | EPFO portal rejects ECR due to age 58 EPS wage discrepancy or member name mismatch. | Medium | Critical | Strictly enforce age 58 rule (EPS = 0); validate UAN format and Member Name matching against KYC records. | Low |
| **RSK-204** | Operational| Biometric network disconnect leaves punch logs buffered on hardware. | High | Medium | Implement idempotent offline punch synchronization with deduplication on `(tenantId, employeeCode, punchTime)`. | Low |
| **RSK-205** | Legal | Tax regime switching dispute between employee and employer. | Low | High | Enforce annual declaration cutoff lock; store immutable audit trail of employee regime selection timestamp and IP. | Low |
| **RSK-206** | Privacy | PII exposure of employee PAN, Aadhaar, and Bank Account numbers in audit logs. | Medium | High | Mask PAN and Bank Account numbers in UI traces and logs (`XXXXXX1234`). | Low |

---

## 4. Personally Identifiable Information (PII) & Privacy Policy

Under the Digital Personal Data Protection Act (DPDP Act, 2023):
1. **Aadhaar Protection**: Only last 4 digits of Aadhaar are visible in UI; Aadhaar is masked in all database logs.
2. **Bank Account Details**: Displayed as `••••••••1234` on employee self-service screens; unmasked only on authorized export files generated by `hr_admin`.
3. **Data Retention**: Payroll snapshots and statutory returns must be retained for a statutory minimum of **8 years** under the Income-tax Act and EPF regulations.
