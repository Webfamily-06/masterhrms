# MASTERHRMS — AUD-CONC-002 PHASE 3B.1
## Independent Audit Report: Contract Staffing Invoice Idempotency & Database Storage

**Document Reference:** `docs/hrms-audit/AUD_CONC_002_PHASE3B1_INVOICE_IDEMPOTENCY_REVIEW.md`  
**Audit Date:** 2026-11-04  
**Auditor:** Independent Principal PostgreSQL Engineer & Financial Systems Auditor  
**Target Codebase:** `server/src/services/contract-invoice.service.ts`  
**Database:** Supabase Managed PostgreSQL (`aws-0-ap-south-1`)  
**Audit Status:** **CONDITIONALLY ACCEPTED — APPLICATION-LEVEL SAFE, NO DATABASE CONSTRAINT**

---

## 1. Scope & Objective

This audit reviews `ContractInvoiceService.generateInvoicesForPayrollRun` to determine whether contract staffing client invoice duplicate prevention is enforced at the PostgreSQL database level or strictly via application logic, inspects invoice storage mechanics in the `sales` table, and verifies behavior on retry and crash recovery.

---

## 2. Code Inspection: `generateInvoicesForPayrollRun`

Located at `server/src/services/contract-invoice.service.ts:135-180`:

```typescript
for (const clientSummary of manifest.clients) {
  // Check for existing invoice for this cycle & client
  const existingInvoices = await db.sale.findMany({
    where: {
      tenantId,
      type: "staffing_billing",
    },
  });

  // Filter by payroll metadata in notes
  const duplicate = existingInvoices.find((sale) => {
    try {
      if (!sale.notes) return false;
      const meta = JSON.parse(sale.notes);
      return (
        meta.payrollRunId === payrollRunId &&
        meta.clientId === clientSummary.clientId &&
        meta.workflowStatus !== "CANCELLED"
      );
    } catch {
      return false;
    }
  });

  if (duplicate && !options?.forceRegenerate) {
    // AUD-CONC-002: Idempotent return of existing invoice
    let meta: any = {};
    try {
      meta = duplicate.notes ? JSON.parse(duplicate.notes) : {};
    } catch {}
    createdInvoices.push({
      id: duplicate.id,
      invoiceNo: duplicate.invoiceNo,
      payrollRunId,
      clientId: clientSummary.clientId,
      clientName: clientSummary.clientName,
      headcount: clientSummary.headcount,
      billableCtc: clientSummary.totalBillableCtc,
      mmuAmount: clientSummary.totalMmu,
      taxableSupplyValue: clientSummary.taxableSupplyValue,
      supplyType: clientSummary.supplyType,
      cgst: clientSummary.cgst,
      sgst: clientSummary.sgst,
      igst: clientSummary.igst,
      totalGst: clientSummary.totalGst,
      totalAmount: Number(duplicate.total),
      status: meta.workflowStatus || "DRAFT",
      createdAt: duplicate.createdAt,
    });
    continue;
  }
  ...
}
```

---

## 3. Physical Database Storage Inspection: Table `sales`

An independent physical inspection of the `sales` table was performed:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales';
```

### 3.1. Schema Architecture Findings
1. **Generic Sales Model:** Staffing client billing invoices are stored in the platform's unified `sales` table (`type = 'staffing_billing'`).
2. **Missing Relational Foreign Key:** There is **no physical column** named `payroll_run_id` on the `sales` table.
3. **JSON Metadata Packing:** The association between a sale and a payroll run is stored serialized inside the `notes` column as JSON:
   ```json
   {
     "source": "STAFFING_PAYROLL_AUTOMATION",
     "payrollRunId": "...",
     "clientId": "...",
     "workflowStatus": "DRAFT"
   }
   ```
4. **Physical Indexes Present:**
   - `sales_pkey` ON `(id)`
   - `sales_tenant_id_date_idx` ON `(tenant_id, date)`
   - `sales_tenant_id_payment_status_idx` ON `(tenant_id, payment_status)`
   - `sales_tenant_id_invoice_no_key` ON `(tenant_id, invoice_no)` (UNIQUE)

### 3.2. Critical Architectural Assessment
- **Database Engine Guarantee:** **NONE.** Because `payrollRunId` and `clientId` are packed in an un-indexed text/JSON string, PostgreSQL has no native unique constraint preventing two rows with identical `payrollRunId` and `clientId`.
- **Application Logic Guarantee:** The application queries all `type = 'staffing_billing'` sales for the tenant, parses the JSON strings in JavaScript, and matches `meta.payrollRunId` and `meta.clientId`.
- **Concurrent Insertion Risk:** If two workers simultaneously execute `ContractInvoiceService.generateInvoicesForPayrollRun` outside of `PayrollOrchestratorService`, both would pass the filter and create two distinct `Sale` records (with distinct `invoiceNo` values).
- **Mitigation in Production:** In the production workflow, `generateInvoicesForPayrollRun` is invoked during Stage 15 of `finalizePayroll` (and in `recoverPayrollCycle`). Both entry points are guarded by the atomic conditional claim on `payroll_runs` (`approvalStatus: "APPROVED" -> "FINALIZING"`), which guarantees single-worker invocation.

---

## 4. State Machine & Immutability Analysis

In `ContractInvoiceService.updateInvoiceStatus`:
```typescript
const allowedTransitions: Record<InvoiceWorkflowStatus, InvoiceWorkflowStatus[]> = {
  DRAFT: ["VALIDATED", "APPROVED", "CANCELLED"],
  VALIDATED: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["PAID", "CANCELLED"],
  PAID: [],     // Terminal financial state
  CANCELLED: [], // Terminal audit state
};
```
- **Terminal Immutability:** Once an invoice reaches `PAID`, no transitions are permitted.
- **Cancelled Voiding:** If an invoice is cancelled, subsequent runs with `forceRegenerate: true` can safely generate a replacement invoice.

---

## 5. Audit Verdict & Long-Term Recommendation

**CONDITIONALLY ACCEPTED.**
- The idempotency logic functions correctly for retries and crash recovery in the single-worker pipeline.
- **Architectural Debt Advisory:** Packing relational keys into `sales.notes` prevents PostgreSQL expression indexing and foreign key constraints. A formal schema migration adding `payroll_run_id VARCHAR(36)` and a partial unique index `CREATE UNIQUE INDEX uq_sales_tenant_payroll_client ON sales (tenant_id, payroll_run_id, customer_id) WHERE type = 'staffing_billing';` should be prioritized for future enterprise scaling.

