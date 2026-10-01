# Phase 2 Database Design & Relational Entity Model
## Advanced Payroll Module: Schema Extensions (Planning & Proposed Architecture)

**Document ID**: `DOC-P2-005`  
**Classification**: Database Design Specification  
**Status**: PROPOSED DESIGN — DESIGN ONLY (DO NOT MODIFY PRISMA SCHEMA YET)  
**Date**: October 1, 2026  
**Architect**: Database Architect & Principal Software Architect  

---

## 1. Overview & Guardrails

This document specifies the exact schema extensions required for Phase 2.
**STRICT SAFEGUARD**: In accordance with project instructions, **no database migrations or edits to `schema.prisma` will be executed during this planning phase**. All models below represent the verified target design for Phase 2 implementation.

### Key Tenets
1. **100% Tenant Isolation**: Every table contains a mandatory `tenantId` indexed and foreign-keyed to `tenants(id)`.
2. **Decimal Precision**: All monetary values use `Decimal(12, 2)` or `Decimal(15, 2)`.
3. **Compound Indexes**: Frequent lookup patterns (e.g. `[tenantId, status]`, `[tenantId, employeeId]`, `[tenantId, financialYear]`) are explicitly indexed.
4. **Audit Immutability**: All tables have `createdAt` and `updatedAt`. Locked payroll records and bank files include cryptographic SHA-256 hashes.

---

## 2. Proposed Entity Relationship Diagram (ERD)

```
┌─────────────────┐       1:N       ┌────────────────────────┐
│     Tenant      ├─────────────────┤  BankDisbursementBatch │
└────────┬────────┘                 └───────────┬────────────┘
         │                                      │ 1:N
         │ 1:N                                  ▼
         │                          ┌────────────────────────┐
         ├──────────────────────────┤ BankDisbursementItem   │
         │                          └────────────────────────┘
         │ 1:N
         ├──────────────────────────┌────────────────────────┐
         │                          │ StatutoryReturnFiling  │
         │                          └───────────┬────────────┘
         │                                      │ 1:N
         │                                      ▼
         │                          ┌────────────────────────┐
         ├──────────────────────────┤ StatutoryReturnItem    │
         │                          └────────────────────────┘
         │ 1:N
         ├──────────────────────────┌────────────────────────┐
         │                          │ FbpDeclaration         │
         │                          └───────────┬────────────┘
         │                                      │ 1:N
         │                                      ▼
         │                          ┌────────────────────────┐
         ├──────────────────────────┤ FbpDeclarationItem     │
         │                          └────────────────────────┘
         │ 1:N
         ├──────────────────────────┌────────────────────────┐
         │                          │ BiometricDevice        │ (Existing, add Matrix fields)
         │                          └───────────┬────────────┘
         │                                      │ 1:N
         │                                      ▼
         │                          ┌────────────────────────┐
         └──────────────────────────┤ BiometricPunchLog      │ (Existing)
                                    └────────────────────────┘
```

---

## 3. Entity Specifications (Proposed Extensions)

### 3.1 Flexible Benefit Plan (FBP) Models

#### `model FbpDeclaration` (Proposed Table: `fbp_declarations`)
Stores the employee's annual allocation basket across flexible allowance components.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid()) @db.VarChar(36)` | Primary Key |
| `tenantId` | `String` | `@map("tenant_id") @db.VarChar(36)` | Tenant isolation FK |
| `employeeId` | `String` | `@map("employee_id") @db.VarChar(36)` | Employee FK |
| `financialYear` | `String` | `@map("financial_year") @db.VarChar(20)`| e.g. "2026-2027" |
| `totalFbpAnnual` | `Decimal`| `@map("total_fbp_annual") @db.Decimal(12,2)` | Total annual FBP pool available |
| `status` | `String` | `@default("draft") @db.VarChar(30)` | draft, submitted, approved, locked |
| `submittedAt` | `DateTime?`| `@map("submitted_at")` | Submission timestamp |
| `approvedAt` | `DateTime?`| `@map("approved_at")` | HR approval timestamp |
| `approvedBy` | `String?` | `@map("approved_by") @db.VarChar(150)` | Approver identity |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Modification timestamp |

**Indexes & Constraints**:
- `@@unique([tenantId, employeeId, financialYear])`
- `@@index([tenantId, status])`

---

#### `model FbpDeclarationItem` (Proposed Table: `fbp_declaration_items`)
Line items of individual flexible components chosen by the employee.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid()) @db.VarChar(36)` | Primary Key |
| `declarationId` | `String` | `@map("declaration_id") @db.VarChar(36)`| Parent declaration FK |
| `componentCode` | `String` | `@map("component_code") @db.VarChar(50)`| FUEL, TEL, MEAL, BOOKS, EDU |
| `componentName` | `String` | `@map("component_name") @db.VarChar(150)`| Display label |
| `monthlyDeclared` | `Decimal`| `@map("monthly_declared") @db.Decimal(10,2)`| Monthly amount chosen |
| `annualDeclared` | `Decimal`| `@map("annual_declared") @db.Decimal(12,2)` | Annual amount |
| `maxAnnualCap` | `Decimal`| `@map("max_annual_cap") @db.Decimal(12,2)` | Statutory or policy ceiling |
| `requiresProof` | `Boolean` | `@default(true) @map("requires_proof")` | Proof submission mandatory |

**Indexes & Constraints**:
- `@@unique([declarationId, componentCode])`
- `@@index([declarationId])`

---

### 3.2 Bank Disbursement Models

#### `model BankDisbursementBatch` (Proposed Table: `bank_disbursement_batches`)
Tracks payment batch files generated for bank transmission.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid()) @db.VarChar(36)` | Primary Key |
| `tenantId` | `String` | `@map("tenant_id") @db.VarChar(36)` | Tenant isolation FK |
| `payrollRunId` | `String` | `@map("payroll_run_id") @db.VarChar(36)` | Source PayrollRun FK |
| `bankCode` | `String` | `@map("bank_code") @db.VarChar(20)` | ICICI, HDFC, SBI |
| `batchReference` | `String` | `@map("batch_reference") @db.VarChar(50)`| Unique reference e.g. SAL-202608-HDFC-01 |
| `debitAccountNumber`| `String` | `@map("debit_account_number") @db.VarChar(50)`| Corporate payout account |
| `totalBeneficiaries`| `Int` | `@map("total_beneficiaries")` | Number of payee lines |
| `totalDisbursementAmount`| `Decimal`| `@map("total_disbursement_amount") @db.Decimal(15,2)` | Net batch amount |
| `currency` | `String` | `@default("INR") @db.VarChar(10)` | Currency |
| `formatType` | `String` | `@map("format_type") @db.VarChar(30)` | pipe_delimited, csv, fixed_width |
| `fileHash` | `String` | `@map("file_hash") @db.VarChar(64)` | SHA-256 integrity hash of file |
| `isDigitallySigned`| `Boolean` | `@default(false) @map("is_digitally_signed")` | Signed with DSC |
| `signatureDigest` | `String?` | `@map("signature_digest") @db.Text` | PKCS#7 detached signature base64 |
| `status` | `String` | `@default("generated") @db.VarChar(30)` | generated, downloaded, processed, reconciled |
| `generatedBy` | `String` | `@map("generated_by") @db.VarChar(150)`| User who exported the file |
| `downloadCount` | `Int` | `@default(0) @map("download_count")` | Audit counter |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt @map("updated_at")` | Modification timestamp |

**Indexes & Constraints**:
- `@@unique([tenantId, batchReference])`
- `@@index([tenantId, payrollRunId])`
- `@@index([tenantId, status])`

---

#### `model BankDisbursementItem` (Proposed Table: `bank_disbursement_items`)
Itemized payout record per employee for the bank batch.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid()) @db.VarChar(36)` | Primary Key |
| `batchId` | `String` | `@map("batch_id") @db.VarChar(36)` | Parent batch FK |
| `employeeId` | `String` | `@map("employee_id") @db.VarChar(36)` | Employee FK |
| `beneficiaryName` | `String` | `@map("beneficiary_name") @db.VarChar(150)`| Name sent to bank |
| `accountNumber` | `String` | `@map("account_number") @db.VarChar(50)` | Beneficiary bank account |
| `ifscCode` | `String` | `@map("ifsc_code") @db.VarChar(20)` | 11-character RBI IFSC |
| `amount` | `Decimal` | `@db.Decimal(12, 2)` | Net pay amount |
| `paymentMode` | `String` | `@default("NEFT") @map("payment_mode") @db.VarChar(20)`| NEFT, RTGS, FT |
| `transactionReference`| `String?`| `@map("transaction_reference") @db.VarChar(50)`| Bank UTR reference |
| `status` | `String` | `@default("pending") @db.VarChar(30)` | pending, success, failed, returned |
| `failureReason` | `String?` | `@map("failure_reason") @db.VarChar(255)`| Rejection reason from bank |

**Indexes & Constraints**:
- `@@index([batchId])`
- `@@index([employeeId])`

---

### 3.3 Statutory Return Filing Models

#### `model StatutoryReturnFiling` (Proposed Table: `statutory_return_filings`)
Tracks generated statutory returns (EPF ECR, ESIC Monthly Return, PT Chalan).

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid()) @db.VarChar(36)` | Primary Key |
| `tenantId` | `String` | `@map("tenant_id") @db.VarChar(36)` | Tenant isolation FK |
| `establishmentId` | `String` | `@map("establishment_id") @db.VarChar(36)` | Establishment FK |
| `payrollRunId` | `String` | `@map("payroll_run_id") @db.VarChar(36)` | Source PayrollRun FK |
| `returnType` | `String` | `@map("return_type") @db.VarChar(30)` | EPF_ECR, ESIC_MONTHLY, PT_RETURN |
| `wageMonth` | `Int` | `@map("wage_month")` | Month (1-12) |
| `wageYear` | `Int` | `@map("wage_year")` | Year (e.g. 2026) |
| `totalMembers` | `Int` | `@map("total_members")` | Member record count |
| `totalWages` | `Decimal` | `@map("total_wages") @db.Decimal(15, 2)` | Total gross/statutory wages |
| `totalEmployeeShare`| `Decimal`| `@map("total_employee_share") @db.Decimal(15, 2)`| Total employee deduction |
| `totalEmployerShare`| `Decimal`| `@map("total_employer_share") @db.Decimal(15, 2)`| Total employer contribution |
| `totalChallanAmount`| `Decimal`| `@map("total_challan_amount") @db.Decimal(15, 2)`| Grand total payable |
| `fileFormat` | `String` | `@map("file_format") @db.VarChar(20)` | txt, xlsx, csv |
| `fileHash` | `String` | `@map("file_hash") @db.VarChar(64)` | SHA-256 hash |
| `challanTrrn` | `String?` | `@map("challan_trrn") @db.VarChar(50)` | EPFO TRRN / ESIC Challan No |
| `status` | `String` | `@default("draft") @db.VarChar(30)` | draft, generated, uploaded, paid |
| `uploadedAt` | `DateTime?`| `@map("uploaded_at")` | Date uploaded to portal |
| `createdAt` | `DateTime` | `@default(now()) @map("created_at")` | Creation timestamp |

**Indexes & Constraints**:
- `@@unique([tenantId, establishmentId, returnType, wageYear, wageMonth])`
- `@@index([tenantId, returnType, status])`

---

## 4. Existing Schema Adaptations (No Breaking Changes)

To support Phase 2 without altering Phase 1 models:
1. **`BiometricDevice`**: Add optional fields:
   - `matrixDeviceId`: `String? @map("matrix_device_id") @db.VarChar(50)`
   - `authSecret`: `String? @map("auth_secret") @db.VarChar(100)`
2. **`ExpenseClaim`**: Add optional integrity fields:
   - `receiptHash`: `String? @map("receipt_hash") @db.VarChar(64)`
   - `ocrExtracted`: `Json? @map("ocr_extracted")`
   - `ocrConfidence`: `Decimal? @map("ocr_confidence") @db.Decimal(5, 2)`
   - `isDuplicateWarning`: `Boolean @default(false) @map("is_duplicate_warning")`
3. **`PayrollRun`**: Extend state machine:
   - Add status values `approved`, `disbursed` to support post-calculation banking workflows.
