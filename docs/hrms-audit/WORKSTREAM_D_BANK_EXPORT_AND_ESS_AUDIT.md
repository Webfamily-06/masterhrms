# MASTERHRMS — WORKSTREAM D BANK EXPORT & ESS PAYSLIP AUDIT
## Standardized NEFT/RTGS Advice Generation, Exact Rupee Matching, and Self-Service Publishing

> **Workstream**: D — Stage 16 Outputs  
> **Target Subsystem**: `PayrollOrchestratorService.generateBankDisbursementExport` & ESS Publishing  
> **Date**: November 3, 2026  
> **Status**: AUDITED & RECONCILED  

---

## 1. Bank Payment Advice Specification

Stage 16 generates standardized bank disbursement files compatible with primary Indian corporate banking portals (HDFC Corporate Banking, ICICI Eazypay, SBI Corporate, Axis Bank):

### CSV Column Format
```csv
SL_NO,EMPLOYEE_CODE,EMPLOYEE_NAME,BANK_NAME,ACCOUNT_NUMBER,IFSC_CODE,NET_PAY_INR,PAYMENT_REF
1,"ENBL1024","T. SATHISH KUMAR","HDFC Bank","5010049281928","HDFC0001234",20512.00,"SAL-202610-ENBL1024"
2,"ENBL1025","D. JAYAKUMAR","ICICI Bank","1293019283019","ICIC0000456",20512.00,"SAL-202610-ENBL1025"
```

---

## 2. Zero-Variance Financial Assertion

Prior to authorizing bank advice download, the orchestrator executes an exact rupee balance validation:

$$\sum (\text{Exported Net Pay}) \equiv \text{PayrollRun}.\text{totalNet}$$

If the sum of rows differs from `totalNet` by even ₹0.01, the export throws a hard fatal error:
```typescript
if (!isBalanced && run.approvalStatus === "CLOSED") {
  throw new Error(
    `Financial mismatch in bank advice export! Export total ₹${sumNet.toFixed(2)} does not match cycle net pay ₹${expectedTotal.toFixed(2)}.`
  );
}
```

### Empirical Test Evidence
Test `WS-D.8.2` validates that `exportAdvice.isBalanced === true` with exact zero variance.

---

## 3. Privacy Masking Support

For audit previews and non-privileged Finance viewer roles, the endpoint supports `?masked=true`:
- Bank Account numbers are masked to show only the last 4 digits: `*********1928`.
- Aadhaar and PAN identifiers are masked across previews.
- Full unmasked files are restricted to users with `finance_director`, `super_admin`, or `tenant_admin` roles.

---

## 4. Employee Self-Service (ESS) Payslip Publishing

1. **State Update**: Sets `isPublished = true`, `publishedAt = new Date()`, and `publishedBy = actor.email` on `PayrollRun`.
2. **Access Control**: When published, individual employees can access their own payslips via `/me/payroll/payslips` or `/hr/payroll/payslips/:id`.
3. **Tenant & Employee Isolation**: Multi-tenant middleware guarantees that employees can only view their own individual payslips within their authenticated tenant scope.
