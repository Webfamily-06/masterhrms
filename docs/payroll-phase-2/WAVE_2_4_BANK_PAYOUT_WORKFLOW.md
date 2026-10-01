# WAVE 2.4 — BANK PAYOUT WORKFLOW & DOUBLE-PAYMENT RECONCILIATION
## End-to-End Operational Lifecycle, Idempotency, and Fraud Prevention

---

## 1. Payout Lifecycle States

```
                ┌──────────────┐
                │    DRAFT     │◄───────── Create Payout Batch
                └──────┬───────┘
                       │
                       ▼  (Admin / Finance Review)
                ┌──────────────┐
                │   APPROVED   │
                └──────┬───────┘
                       │
                       ▼  (Generate File + PKCS#7 Sign)
                ┌──────────────┐
                │  GENERATED   │
                └──────┬───────┘
                       │
                       ▼  (Bank Processing / UTR Confirmation)
                ┌──────────────┐
                │  DISBURSED   │ (Terminal State)
                └──────────────┘

* Cancel Action: From 'draft' or 'approved' ➔ 'cancelled'
```

---

## 2. Double-Payment Prevention Invariant

The fundamental financial invariant enforced by `BankPayoutService`:
> **No employee payslip shall ever be disbursed more than once for the same payroll period.**

### Implementation in `BankPayoutService.createPayoutBatch`:
1. The service queries all existing batches for the target `payrollRunId` in active states:
   ```ts
   const activeBatches = await prisma.bankDisbursementBatch.findMany({
     where: {
       payrollRunId,
       tenantId,
       status: { in: ['draft', 'approved', 'generated', 'disbursed'] },
     },
     select: { id: true },
   });
   ```
2. Any employee who appears in `bank_disbursement_items` of these active batches is flagged as `alreadyDisbursedEmployeeIds`.
3. If an employee is already in an approved/generated/disbursed batch, they are excluded from the candidate list.
4. If no eligible un-disbursed employees remain, batch creation is aborted with:
   `Error: No eligible employees available for disbursement. All employees have either been disbursed or have zero net pay.`

---

## 3. Step-by-Step Execution Guide

### Step 1: Batch Creation (HR / Finance Admin)
- User selects an approved `PayrollRun` from the Bank Disbursement Console.
- Selects target corporate bank adapter (`ICICI`, `HDFC`, or `SBI`).
- Provides debit corporate account number, client code, and payment narration.
- System validates all employee banking credentials. If invalid IFSC or account lengths are detected, actionable validation errors are raised.

### Step 2: Verification & Masked Review
- Batch items are populated in MySQL under `bank_disbursement_items`.
- Reviewer views the batch in the UI. Account numbers are masked (`••••••••1234`), protecting employee financial privacy.

### Step 3: Authorization & Approval
- Finance approver reviews control totals and approves the batch (`POST /api/payroll/disbursement/batches/:id/approve`).
- Status transitions from `draft` to `approved`.

### Step 4: Payout File Generation & Digital Signing
- The system generates the verified file format on the server filesystem (`storage/tenants/{tenantId}/disbursement/`).
- If digital signing is requested, `DigitalSignatureService` computes the SHA-256 hash and produces a detached PKCS#7 envelope signed with the corporate certificate.
- Status transitions to `generated`.

### Step 5: Secure Transmission & Disbursement Confirmation
- The authorized admin downloads the signed file via authenticated route (`GET /api/payroll/disbursement/batches/:id/download`).
- After the corporate bank executes the bulk transfer, the admin enters the Bank UTR / Reference number and marks the batch as `disbursed`.
- Status transitions to `disbursed`, permanently locking the batch against modifications.
