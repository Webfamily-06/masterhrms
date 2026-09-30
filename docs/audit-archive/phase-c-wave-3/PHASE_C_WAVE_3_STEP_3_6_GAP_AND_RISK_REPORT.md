# PHASE C · WAVE 3 · STEP 3.6 — GAP & RISK REPORT
## Sales & Purchase Returns Engine (Credit & Debit Notes)

**Date:** 2026-09-28  
**Author:** Antigravity Senior ERP Architect & Staff Backend Engineer  
**Status:** ✅ ALL GAPS RESOLVED — ZERO OUTSTANDING RISKS

---

## 1. Prior Identified Gaps & Resolution Matrix

| Risk / Gap Identified in Audit | Severity | Resolution Implemented | Verification Mechanism |
|---|---|---|---|
| **Return Quantity Overdraft**: User creates a return for more than the sold or received quantity | High | Implemented strict pre-flight calculation: $\text{Available} = \text{Sold/Received} - \sum(\text{Non-cancelled returns})$. Rejects with `400 BAD_REQUEST`. | Validated by scenarios T4, T5, and T9 |
| **Depleted Physical Inventory on Vendor Return**: Returned items cannot be removed because warehouse stock is depleted | High | Leverages `InventoryMovementService.decreaseStock` optimistic concurrency check. Cleanly rolls back and throws `InsufficientStockError`, returning `422 INSUFFICIENT_STOCK`. | Validated by scenario T10 |
| **Unbalanced Double-Entry Ledger Postings**: Reversals not balancing when tax rates differ | High | `autoPostSalesReturnToLedger` and `autoPostPurchaseReturnToLedger` enforce mathematical equivalence $\sum \text{Debit} \equiv \sum \text{Credit}$ with dynamic tax item allocation. | Validated by scenarios T3 and T8 |
| **Posting to Closed Fiscal Periods**: Return completed in a locked accounting period | Critical | `assertOpenPeriodForPosting` checks both fiscal year and period status before journal entry creation, rejecting closed periods with `422 PERIOD_CLOSED`. | Validated by scenario T12 |
| **Rogue tenantId Injection in Child Models**: Prisma extension injecting `tenantId` into `sales_return_details` or `purchase_return_details` | High | Added `KNOWN_CHILD_RELATION_KEYS` bypass to `sanitizeWritePayload` in `tenant-isolation.extension.ts`. | Validated by scenarios T1 through T10 |
| **Cross-Tenant Access Leakage**: Tenant B inspecting or approving Tenant A's returns or credit notes | Critical | All routes enforce `requireAuth` + `resolveTenantContext` + `where: { tenantId }`. Cross-tenant lookups fail closed with `404 NOT_FOUND`. | Validated by scenario T11 |

---

## 2. Residual Operational Considerations

1. **Credit Note Application to Future Invoices**:
   - `CreditNote.allocatedAmount` and `CreditNote.balanceAmount` are stored with full precision.
   - Future invoice payment workflows can consume credit notes as a payment method (`paymentMethod: "Credit Note"`).
2. **Damaged Goods Handling**:
   - The `isRestocked: boolean` flag in `sales_return_details` allows items to be returned without increasing sellable warehouse stock when goods are broken/defective upon return.
