# Phase C — Wave 3 — Step 3.3.4: Gap and Risk Report

## Executive Summary
This report analyzes remaining gaps, operational risks, and architectural findings identified during the implementation of **Phase C — Wave 3 — Step 3.3.4: Inventory UI Hardening & Workflow Parity**.

---

## 1. Critical Finding: AI Purchase Order Generation Behavior

### File & Route Identified
- **File**: `server/src/routes/ai.routes.ts`
- **Route**: `POST /api/ai/ocr/save` (lines 579–610)

### Issue Description
When scanning an invoice via the AI OCR module and selecting `type: "purchase"`, the endpoint automatically creates a Purchase Order with:
```typescript
status: "received"
```
and immediately calls:
```typescript
await InventoryMovementService.increaseStock({
  tenantId,
  productId: product.id,
  warehouseId: defaultWarehouse.id,
  quantity: qty,
  movementType: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIPT,
  referenceType: "AI_PO",
  referenceId: purchase.id,
  createdById: req.user.userId,
  notes: `AI generated PO stock receipt (${purchase.purchaseNo})`,
});
```

### Risk Assessment & Rationale
In enterprise procurement workflows, generating or drafting a Purchase Order must **never** prematurely increment warehouse stock. Stock should only be incremented upon formal warehouse goods receipt (GRN) verification.
While the AI OCR reader represents an invoice that has been received from a vendor, creating the PO directly as `status: "received"` circumvents the standard physical receiving and inspection step.

### Frontend Mitigation & Limitation
- The frontend `src/routes/_authenticated/_app/ai-ocr.tsx` displays:
  `"Successfully saved as Purchase Order & auto-posted to General Ledger!"`
- Because this behavior is executed server-side inside `ai.routes.ts`, the frontend cannot safely decouple PO generation from goods receipt without modifying the backend route.
- Per constitutional safety rules of Step 3.3.4 (Zero Backend Modifications), this has not been modified in this step.

### Recommendation
In a dedicated backend hardening pass (or Step 3.3.5), update `POST /api/ai/ocr/save` to either:
1. Accept an optional flag `markReceived: boolean`, defaulting to `false` (creating the PO with `status: "ordered"` without increasing inventory).
2. Or create a dedicated Inward Goods Receipt transaction explicitly confirmed by warehouse personnel.

---

## 2. Identified Operational Gaps & Edge Cases

| Gap / Area | Severity | Impact | Mitigation in Step 3.3.4 | Recommended Future Work |
|---|---|---|---|---|
| **Client-Side Offline Synchronization** | Medium | Concurrent sales on offline POS terminals could theoretically oversell stock when both go online simultaneously. | Step 3.3.4 ensures failed sync attempts do NOT discard sales from the local queue, preventing silent data loss. Cashier is alerted with specific shortage details. | Implement server-side reservation locks or draft reconciliation queues for offline devices. |
| **High Latency Network Submissions** | Low | Impatient cashiers clicking "Pay Now" repeatedly during high latency. | Step 3.3.4 disables the submit button and displays a spinning `Loader2` while `persistSales.isPending`. | Add backend idempotency keys (`Idempotency-Key` HTTP header) to ensure duplicate network packets are rejected at the gateway. |
| **Barcode Scanner Decimal Input** | Low | Physical barcode scanners emit fixed SKU barcodes without quantity information. | Cashiers can now directly edit the quantity field in the cart stepper to decimal fractions (e.g. `0.250`). | Support embedded weight barcodes (e.g. GS1 DataBar / EAN-13 price/weight prefixes). |

---

## 3. Scope Boundaries & Deferred Items
- **Zero Schema Changes**: Database precision remains `Decimal(15,3)` as defined in Step 3.3.1.
- **Zero Backend Engine Modifications**: `InventoryMovementService` and backend route handlers remained strictly untouched.
- **No Production Deployment**: Execution was conducted entirely within the local development environment (`127.0.0.1:3306/master_hrms_dev`). Remote production server `147.79.66.214` was not contacted.
