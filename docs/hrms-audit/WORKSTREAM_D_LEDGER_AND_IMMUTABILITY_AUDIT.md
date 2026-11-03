# MASTERHRMS — WORKSTREAM D GENERAL LEDGER & IMMUTABILITY AUDIT
## Double-Entry Accounting Integration, SHA-256 Cryptographic Seals, and Snapshot Freezing

> **Workstream**: D — Stage 13 Finalization  
> **Target Subsystem**: `PayrollOrchestratorService.finalizePayroll` & `ledger-posting.service.ts`  
> **Date**: November 3, 2026  
> **Status**: AUDITED & RECONCILED  

---

## 1. Balanced Double-Entry Accounting

During Stage 13 finalization, `PayrollOrchestratorService` triggers `autoPostPayrollToLedger`, posting an automated General Ledger journal entry with strict debit-credit balance:

| Account Code | Account Name | Account Type | Entry Type | Amount Formula |
|---|---|---|---|---|
| `5010` | Employee Salaries & Wages | Direct Expense | **DEBIT** | Total Gross Salary ($\sum \text{Gross}$) |
| `1020` | Primary Operating Bank Account | Current Asset | **CREDIT** | Net Payout Amount ($\sum \text{Net}$) |
| `2030` | Payroll & Salaries Payable | Current Liability | **CREDIT** | Total Deductions ($\sum \text{Deductions}$) |

### Equation of Accounting Balance
$$\text{Total Debits} (\text{Account 5010}) = \text{Total Credits} (\text{Account 1020} + \text{Account 2030})$$

Empirical verification in test `WS-D.7.2`:
$$\text{Debits} (₹2,62,800.00) = \text{Credits} (₹2,62,800.00) \quad (\Delta = ₹0.00)$$

---

## 2. SHA-256 Cryptographic Seal Generation

To guarantee tamper-proof immutability and statutory audit defense, a cryptographic digest is generated during finalization across all cycle inputs and snapshots:

```typescript
const digestPayload = JSON.stringify({
  runId,
  tenantId,
  periodMonth: run.periodMonth,
  periodYear: run.periodYear,
  totalGross,
  totalNet,
  totalDeductions,
  employeeCount: run.employeeCount,
  snapshots: run.snapshots.map((s) => ({
    id: s.id,
    employeeId: s.employeeId,
    gross: Number(s.grossEarned),
    net: Number(s.netPay),
    deductions: Number(s.totalDeductions),
  })),
});

const cryptographicHash = crypto
  .createHash("sha256")
  .update(digestPayload)
  .digest("hex");
```

This 64-character hexadecimal hash is stored in `statutoryManifest.cryptographicHash` and displayed in the CMS Command Hub. Any retroactive database modification of a snapshot or run total causes hash invalidation upon verification.

---

## 3. Snapshot Freezing & Immutability

1. `isLocked` flag on `PayrollRun` is set to `true`.
2. All child `PayrollSnapshot` records have `isLocked` updated to `true`.
3. If any user attempts to trigger `calculatePayroll` on a closed/approved run, the orchestrator returns HTTP `409 Conflict: Payroll run is in state 'CLOSED'. Immutable cycles cannot be re-calculated.`
