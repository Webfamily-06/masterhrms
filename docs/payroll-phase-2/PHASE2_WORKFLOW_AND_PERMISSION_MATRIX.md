# Phase 2 Workflow Lifecycle & RBAC Permission Matrix
## Advanced Payroll Module: State Transitions & Access Control Rules

**Document ID**: `DOC-P2-008`  
**Classification**: Security & Workflow Specification  
**Status**: APPROVED BASELINE  
**Date**: October 1, 2026  
**Architect**: Enterprise HRMS Consultant & Security Architect  

---

## 1. Role-Based Access Control (RBAC) Matrix

The system enforces strict multi-tenant role boundaries across all Phase 2 features:

| Feature / Action | Employee | Reporting Manager | HR Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **File Own Reimbursement Claim** | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| **Approve Subordinate Expense Claim** | DENIED | ALLOWED (L1) | ALLOWED (L1/L2) | ALLOWED |
| **Finance Approve Expense Claim** | DENIED | DENIED | ALLOWED (L2) | ALLOWED |
| **Submit Own FBP & Tax Declaration** | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| **Audit & Verify Employee Tax Proofs** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Configure FBP Component Caps** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Manage Biometric Devices** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Trigger Biometric Attendance Reconcile**| DENIED | DENIED | ALLOWED | ALLOWED |
| **Run Pre-Disbursement Bank Audit** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Generate Bank Payout Files (ICICI/HDFC/SBI)**| DENIED | DENIED | ALLOWED | ALLOWED |
| **Digitally Sign Disbursement Batch** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Generate EPF ECR v2.0 & ESIC Return** | DENIED | DENIED | ALLOWED | ALLOWED |
| **Record Challan TRRN & Mark Filed** | DENIED | DENIED | ALLOWED | ALLOWED |

---

## 2. Reimbursement Workflow Lifecycle (P2.1)

```
       ┌────────────────────────┐
       │         DRAFT          │
       └───────────┬────────────┘
                   │ Employee Submits Claim
                   ▼
       ┌────────────────────────┐
       │        PENDING         │
       └─────┬────────────┬─────┘
             │            │ Manager Rejects
             │ Manager    └─────────────────────────────┐
             │ Approves                                 ▼
             ▼                             ┌────────────────────────┐
       ┌────────────────────────┐          │        REJECTED        │
       │    MANAGER_APPROVED    │          └────────────────────────┘
       └─────┬────────────┬─────┘                       ▲
             │            │ Finance Rejects             │
             │ Finance    └─────────────────────────────┘
             │ Approves
             ▼
       ┌────────────────────────┐
       │    FINANCE_APPROVED    │
       └───────────┬────────────┘
                   │ Payroll Batch Executes & Payslips Generated
                   ▼
       ┌────────────────────────┐
       │       REIMBURSED       │ (Auto-Posted to General Ledger)
       └────────────────────────┘
```

### Transition Guards:
1. `DRAFT -> PENDING`: File attachment must exist; receipt hash must be generated.
2. `PENDING -> MANAGER_APPROVED`: User must be employee's reporting manager or HR Admin.
3. `MANAGER_APPROVED -> FINANCE_APPROVED`: User must hold `hr_admin` role. Policy amount limit verified.
4. `FINANCE_APPROVED -> REIMBURSED`: Automated transition triggered upon completion of the targeted `PayrollRun`.

---

## 3. FBP & Tax Declaration Lifecycle (P2.2)

```
  ┌────────────────────────────────────────────────────────┐
  │                        DRAFT                           │
  └──────────────────────────┬─────────────────────────────┘
                             │ Employee Submits (Before Window Cutoff)
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                      SUBMITTED                         │
  └──────────┬───────────────────────────────┬─────────────┘
             │                               │
             │ Proofs Uploaded &             │ Proofs Incomplete / Rejected
             │ Verified by HR Admin          │
             ▼                               ▼
  ┌────────────────────────────────┐ ┌────────────────────────────────┐
  │            VERIFIED            │ │       ACTION_REQUIRED          │
  └────────────────┬───────────────┘ └───────────────┬────────────────┘
                   │                                 │ Resubmitted
                   │ Final Fiscal Year Freeze Date   └────────┐
                   ▼                                          │
  ┌────────────────────────────────────────────────────────┐  │
  │                        LOCKED                          │◄─┘
  └────────────────────────────────────────────────────────┘
```

### Transition Guards:
1. `DRAFT -> SUBMITTED`: Allowed only while `DeclarationWindow` is active for the current fiscal year.
2. `SUBMITTED -> VERIFIED`: HR Admin must explicitly verify line items; declared rent > ₹1,00,000 mandates landlord PAN validation.
3. `-> LOCKED`: Automated cutoff or manual administrative lock. Once locked, declarations can only be unlocked by Super Admin with audit trail entry.

---

## 4. Bank Disbursement Batch Lifecycle (P2.4)

```
  ┌────────────────────────────────────────────────────────┐
  │                       GENERATED                        │
  │  (Pre-Flight Check Passed, Batch File Created & Hashed)│
  └──────────────────────────┬─────────────────────────────┘
                             │ User Downloads Payout File / Applies DSC
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                      DOWNLOADED                        │
  └──────────────────────────┬─────────────────────────────┘
                             │ Uploaded to Corporate Bank Portal
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                      PROCESSED                         │
  └──────────┬───────────────────────────────┬─────────────┘
             │ Bank Confirms Successful      │ Bank Rejects Certain Payouts
             │ Payouts (UTR Received)        │ (Account Invalid / Frozen)
             ▼                               ▼
  ┌────────────────────────────────┐ ┌────────────────────────────────┐
  │           RECONCILED           │ │       PARTIALLY_RETURNED       │
  └────────────────────────────────┘ └────────────────────────────────┘
```

### Transition Guards:
1. `-> GENERATED`: Source `PayrollRun` must be in `completed` or `approved` state. Pre-flight check must report 0 blockers.
2. `GENERATED -> DOWNLOADED`: Increments `downloadCount`, records `downloadedBy` and timestamp.
3. `-> RECONCILED`: Payout status updated, matching bank UTR numbers against line items.

---

## 5. Statutory Return Filing Lifecycle (P2.5)

```
  ┌────────────────────────┐
  │         DRAFT          │ (Draft figures computed from PayrollSnapshots)
  └───────────┬────────────┘
              │ Validation Rules Satisfied (UAN / IP / Wage Caps Checked)
              ▼
  ┌────────────────────────┐
  │       GENERATED        │ (Official #~# text / .xlsx file created and hashed)
  └───────────┬────────────┘
              │ File Uploaded to Unified Portal / ESIC Portal
              ▼
  ┌────────────────────────┐
  │        UPLOADED        │
  └───────────┬────────────┘
              │ Payment Made & Challan TRRN Generated
              ▼
  ┌────────────────────────┐
  │      PAID & FILED      │ (Challan TRRN recorded; Return Locked)
  └────────────────────────┘
```
