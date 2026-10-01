# WAVE 2.4 — DATABASE DESIGN & MIGRATION VERIFICATION
## Schema Extensions: Bank Disbursement Batches, Items & Statutory Return Filings

---

## 1. Schema Extensions in `server/prisma/schema.prisma`

Three new models were added to persist Wave 2.4 operational entities:

### 1.1 `BankDisbursementBatch` (`bank_disbursement_batches`)
- `id`: UUID (Primary Key)
- `tenantId`: Foreign key to `Tenant` (Cascade delete)
- `payrollRunId`: Foreign key to `PayrollRun` (Cascade delete)
- `bankCode`: Bank identifier (`ICICI`, `HDFC`, `SBI`)
- `batchReference`: Unique human-readable code (`PAY-{BANK}-{YYYYMM}-{HEX6}`)
- `debitAccountNumber`: Corporate bank account from which salaries are debited
- `totalBeneficiaries`: Count of included employees
- `totalDisbursementAmount`: Decimal(15, 2) net salary sum
- `currency`: Default "INR"
- `formatType`: Transmission format (`pipe_delimited`, `csv`, `fixed_width`)
- `fileHash`: SHA-256 integrity hash of generated payout file
- `filePath`: Absolute or relative path in tenant-partitioned storage
- `isDigitallySigned`: Boolean flag
- `signatureDigest`: Cryptographic signature envelope
- `signerIdentity`: Authorized corporate officer
- `signedAt`: Timestamp of digital signing
- `status`: Lifecycle status (`draft`, `approved`, `generated`, `disbursed`, `cancelled`)
- `downloadCount`: Integer tracking file downloads
- `reconciledAt`: Timestamp of bank UTR confirmation
- `reconciledBy`: User who confirmed bank execution

### 1.2 `BankDisbursementItem` (`bank_disbursement_items`)
- `id`: UUID (Primary Key)
- `batchId`: Foreign key to `BankDisbursementBatch` (Cascade delete)
- `employeeId`: Foreign key to `Employee`
- `beneficiaryName`: Employee account holder name
- `accountNumber`: Bank account number (stored for file generation; masked for UI queries)
- `ifscCode`: Beneficiary bank IFSC code
- `bankName`: Name of bank
- `amount`: Decimal(15, 2) net pay
- `paymentMode`: `NEFT`, `RTGS`, `IFT`, or `IMPS`
- `status`: Item status (`pending`, `processed`, `failed`)

### 1.3 `StatutoryReturnFiling` (`statutory_return_filings`)
- `id`: UUID (Primary Key)
- `tenantId`: Foreign key to `Tenant` (Cascade delete)
- `establishmentId`: Optional foreign key to `Establishment`
- `payrollRunId`: Foreign key to `PayrollRun`
- `returnType`: Filing type (`EPF_ECR`, `ESIC_MONTHLY`, `PT_RETURN`)
- `wageMonth`: Integer (1-12)
- `wageYear`: Integer (e.g. 2026)
- `totalMembers`: Total employees included
- `totalWages`: Decimal(15, 2) gross wages reported
- `totalEmployeeShare`: Decimal(15, 2) employee statutory deduction sum
- `totalEmployerShare`: Decimal(15, 2) employer statutory contribution sum
- `totalChallanAmount`: Decimal(15, 2) total payable challan amount
- `fileFormat`: `txt`, `xlsx`, or `csv`
- `fileHash`: SHA-256 hash of generated filing file
- `filePath`: Storage path on disk
- `challanTrrn`: Government portal TRRN or challan receipt number
- `status`: Filing status (`draft`, `generated`, `uploaded`, `paid`, `reconciled`)

---

## 2. Migration Execution & Verification

1. **Prisma DB Push**:
   - Pushed cleanly using `npx prisma db push`.
   - Verified in MySQL development database `master_hrms`.
2. **Multi-Tenant Model Registry**:
   - Registered `bankDisbursementBatch`, `bankDisbursementItem`, and `statutoryReturnFiling` in `server/src/config/tenant-models.config.ts`.
3. **Database Constraints**:
   - Composite unique constraint `@@unique([tenantId, batchReference])` prevents reference collision.
   - Composite unique constraint `@@unique([tenantId, establishmentId, returnType, wageYear, wageMonth])` prevents duplicate return creation for the same establishment and wage period.
