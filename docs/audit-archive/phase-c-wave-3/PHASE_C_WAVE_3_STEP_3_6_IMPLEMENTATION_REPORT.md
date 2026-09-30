# PHASE C · WAVE 3 · STEP 3.6 — IMPLEMENTATION REPORT
## Sales & Purchase Returns Engine (Credit & Debit Notes)

**Date:** 2026-09-28  
**Author:** Antigravity Senior ERP Architect & Staff Backend Engineer  
**Status:** ✅ IMPLEMENTATION COMPLETE & VERIFIED (100% Pass Rate)

---

## 1. Executive Summary

Phase C Wave 3 Step 3.6 delivers a full double-entry financial returns engine, closing the gap between Stocky Laravel's `SalesInvoiceReturn` / `PurchaseReturn` modules and the target Node.js + Express + Prisma + MariaDB architecture. 

The implementation introduces:
1. **Sales Returns & Credit Notes**:
   - `SalesReturn` & `SalesReturnDetail` data models with strict returnable quantity validation against original sales.
   - Idempotent `CreditNote` generation (`CN-YYYY-XXXX`) tracking allocated amounts and remaining customer credit balances.
   - Restocking workflows powered by `InventoryMovementService.increaseStock` with `STOCK_MOVEMENT_TYPES.SALES_RETURN`.
   - Balanced general ledger journal entries reversing revenue (`4020`) and tax (`2020`) while crediting Cash (`1010`), Bank (`1020`), or Accounts Receivable (`1030`).
2. **Purchase Returns & Debit Notes**:
   - `PurchaseReturn` & `PurchaseReturnDetail` data models with strict returnable quantity validation against original purchase orders.
   - Idempotent `DebitNote` generation (`DN-YYYY-XXXX`) tracking allocated amounts and vendor claims.
   - De-stocking workflows powered by `InventoryMovementService.decreaseStock` with `STOCK_MOVEMENT_TYPES.PURCHASE_RETURN`, throwing `InsufficientStockError` if physical inventory is depleted.
   - Balanced general ledger journal entries reducing Accounts Payable (`2010`) while crediting Purchase Returns & Allowances (`5020`) and Input Tax Credit (`1040`).
3. **Multi-Tenant Isolation & Closed-Period Safeguards**:
   - Registered all return models in `tenant-models.config.ts` (`DIRECT_TENANT_MODELS` and `CHILD_DEPENDENT_MODELS`).
   - Hardened `tenant-isolation.extension.ts` against child relation injection issues.
   - Enforced `assertOpenPeriodForPosting` to block return posting into closed/locked fiscal periods.
4. **UI & Navigation Integration**:
   - Created full-featured `src/routes/_authenticated/_app/returns.tsx` with tabs for Sales Returns, Credit Notes, Purchase Returns, and Debit Notes.
   - Added `Returns & Notes` nav item to `src/components/app-sidebar.tsx`.
   - Embedded "Issue Return / Credit Note" in invoice view dialog (`invoices.tsx`) and "Issue Return / Debit Note" in purchase order details (`purchases.tsx`).

---

## 2. Architectural Blueprint & Data Models

### 2.1 Database Schema Additions (`schema.prisma`)

```prisma
model SalesReturn {
  id           String   @id @default(uuid()) @db.VarChar(36)
  tenantId     String   @map("tenant_id") @db.VarChar(36)
  saleId       String   @map("sale_id") @db.VarChar(36)
  customerId   String?  @map("customer_id") @db.VarChar(36)
  warehouseId  String?  @map("warehouse_id") @db.VarChar(36)
  returnNumber String   @map("return_number") @db.VarChar(100)
  returnDate   DateTime @default(now()) @map("return_date")
  status       String   @default("draft") @db.VarChar(50) // draft, approved, completed, cancelled
  reason       String?  @db.VarChar(255)
  subtotal     Decimal  @default(0.00) @db.Decimal(15, 2)
  taxAmount    Decimal  @default(0.00) @map("tax_amount") @db.Decimal(15, 2)
  totalAmount  Decimal  @default(0.00) @map("total_amount") @db.Decimal(15, 2)
  notes        String?  @db.Text
  createdById  String?  @map("created_by_id") @db.VarChar(36)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tenant    Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sale      Sale                @relation(fields: [saleId], references: [id], onDelete: Cascade)
  customer  Customer?           @relation(fields: [customerId], references: [id], onDelete: SetNull)
  warehouse Warehouse?          @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  details   SalesReturnDetail[]
  creditNote CreditNote?

  @@unique([tenantId, returnNumber])
  @@index([tenantId, status])
  @@index([tenantId, saleId])
  @@map("sales_returns")
}

model SalesReturnDetail {
  id               String   @id @default(uuid()) @db.VarChar(36)
  returnId         String   @map("return_id") @db.VarChar(36)
  productId        String   @map("product_id") @db.VarChar(36)
  originalDetailId String?  @map("original_detail_id") @db.VarChar(36)
  productName      String   @map("product_name") @db.VarChar(255)
  quantity         Decimal  @default(1.000) @db.Decimal(15, 3)
  unitPrice        Decimal  @default(0.00) @map("unit_price") @db.Decimal(15, 2)
  taxRate          Decimal  @default(0.00) @map("tax_rate") @db.Decimal(5, 2)
  taxAmount        Decimal  @default(0.00) @map("tax_amount") @db.Decimal(15, 2)
  subtotal         Decimal  @default(0.00) @db.Decimal(15, 2)
  total            Decimal  @default(0.00) @db.Decimal(15, 2)
  isRestocked      Boolean  @default(true) @map("is_restocked")
  createdAt        DateTime @default(now()) @map("created_at")

  salesReturn    SalesReturn  @relation(fields: [returnId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  originalDetail SaleDetail?  @relation(fields: [originalDetailId], references: [id], onDelete: SetNull)

  @@index([returnId])
  @@map("sales_return_details")
}

model CreditNote {
  id              String   @id @default(uuid()) @db.VarChar(36)
  tenantId        String   @map("tenant_id") @db.VarChar(36)
  returnId        String?  @unique @map("return_id") @db.VarChar(36)
  saleId          String?  @map("sale_id") @db.VarChar(36)
  customerId      String?  @map("customer_id") @db.VarChar(36)
  noteNumber      String   @map("note_number") @db.VarChar(100)
  noteDate        DateTime @default(now()) @map("note_date")
  amount          Decimal  @default(0.00) @db.Decimal(15, 2)
  allocatedAmount Decimal  @default(0.00) @map("allocated_amount") @db.Decimal(15, 2)
  balanceAmount   Decimal  @default(0.00) @map("balance_amount") @db.Decimal(15, 2)
  status          String   @default("active") @db.VarChar(50)
  reason          String?  @db.VarChar(255)
  notes           String?  @db.Text
  createdById     String?  @map("created_by_id") @db.VarChar(36)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  salesReturn SalesReturn? @relation(fields: [returnId], references: [id], onDelete: SetNull)
  sale        Sale?        @relation(fields: [saleId], references: [id], onDelete: SetNull)
  customer    Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)

  @@unique([tenantId, noteNumber])
  @@index([tenantId, customerId])
  @@map("credit_notes")
}

model PurchaseReturn {
  id           String   @id @default(uuid()) @db.VarChar(36)
  tenantId     String   @map("tenant_id") @db.VarChar(36)
  purchaseId   String   @map("purchase_id") @db.VarChar(36)
  supplierId   String?  @map("supplier_id") @db.VarChar(36)
  warehouseId  String?  @map("warehouse_id") @db.VarChar(36)
  returnNumber String   @map("return_number") @db.VarChar(100)
  returnDate   DateTime @default(now()) @map("return_date")
  status       String   @default("draft") @db.VarChar(50)
  reason       String?  @db.VarChar(255)
  subtotal     Decimal  @default(0.00) @db.Decimal(15, 2)
  taxAmount    Decimal  @default(0.00) @map("tax_amount") @db.Decimal(15, 2)
  totalAmount  Decimal  @default(0.00) @map("total_amount") @db.Decimal(15, 2)
  notes        String?  @db.Text
  createdById  String?  @map("created_by_id") @db.VarChar(36)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tenant    Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  purchase  Purchase               @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  supplier  Supplier?              @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  warehouse Warehouse?             @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  details   PurchaseReturnDetail[]
  debitNote DebitNote?

  @@unique([tenantId, returnNumber])
  @@index([tenantId, status])
  @@index([tenantId, purchaseId])
  @@map("purchase_returns")
}

model PurchaseReturnDetail {
  id               String   @id @default(uuid()) @db.VarChar(36)
  returnId         String   @map("return_id") @db.VarChar(36)
  productId        String   @map("product_id") @db.VarChar(36)
  originalDetailId String?  @map("original_detail_id") @db.VarChar(36)
  productName      String   @map("product_name") @db.VarChar(255)
  quantity         Decimal  @default(1.000) @db.Decimal(15, 3)
  unitCost         Decimal  @default(0.00) @map("unit_cost") @db.Decimal(15, 2)
  taxRate          Decimal  @default(0.00) @map("tax_rate") @db.Decimal(5, 2)
  taxAmount        Decimal  @default(0.00) @map("tax_amount") @db.Decimal(15, 2)
  subtotal         Decimal  @default(0.00) @db.Decimal(15, 2)
  total            Decimal  @default(0.00) @db.Decimal(15, 2)
  createdAt        DateTime @default(now()) @map("created_at")

  purchaseReturn PurchaseReturn  @relation(fields: [returnId], references: [id], onDelete: Cascade)
  product        Product         @relation(fields: [productId], references: [id], onDelete: Restrict)
  originalDetail PurchaseDetail? @relation(fields: [originalDetailId], references: [id], onDelete: SetNull)

  @@index([returnId])
  @@map("purchase_return_details")
}

model DebitNote {
  id              String   @id @default(uuid()) @db.VarChar(36)
  tenantId        String   @map("tenant_id") @db.VarChar(36)
  returnId        String?  @unique @map("return_id") @db.VarChar(36)
  purchaseId      String?  @map("purchase_id") @db.VarChar(36)
  supplierId      String?  @map("supplier_id") @db.VarChar(36)
  noteNumber      String   @map("note_number") @db.VarChar(100)
  noteDate        DateTime @default(now()) @map("note_date")
  amount          Decimal  @default(0.00) @db.Decimal(15, 2)
  allocatedAmount Decimal  @default(0.00) @map("allocated_amount") @db.Decimal(15, 2)
  balanceAmount   Decimal  @default(0.00) @map("balance_amount") @db.Decimal(15, 2)
  status          String   @default("active") @db.VarChar(50)
  reason          String?  @db.VarChar(255)
  notes           String?  @db.Text
  createdById     String?  @map("created_by_id") @db.VarChar(36)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant         Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  purchaseReturn PurchaseReturn? @relation(fields: [returnId], references: [id], onDelete: SetNull)
  purchase       Purchase?       @relation(fields: [purchaseId], references: [id], onDelete: SetNull)
  supplier       Supplier?       @relation(fields: [supplierId], references: [id], onDelete: SetNull)

  @@unique([tenantId, noteNumber])
  @@index([tenantId, supplierId])
  @@map("debit_notes")
}
```

---

## 3. General Ledger Double-Entry Rules

### 3.1 Sales Return (Credit Note)
$$\sum \text{Debits} = \text{Subtotal} + \text{Tax} = \text{Total Amount} = \sum \text{Credits}$$

| Entry Side | Account Code | Account Name | Normal Category | Amount |
|---|---|---|---|---|
| **DEBIT** | `4020` | Sales Returns & Allowances | Revenue (Contra) | Subtotal |
| **DEBIT** | `2020` | GST / Output Tax Payable | Liability Reversal | Tax Amount |
| **CREDIT** | `1010` / `1020` / `1030` | Cash / Bank / Accounts Receivable | Asset Reversal | Total Amount |

### 3.2 Purchase Return (Debit Note)
$$\sum \text{Debits} = \text{Total Amount} = \text{Subtotal} + \text{Tax} = \sum \text{Credits}$$

| Entry Side | Account Code | Account Name | Normal Category | Amount |
|---|---|---|---|---|
| **DEBIT** | `2010` | Accounts Payable (Creditors) | Liability Reduction | Total Amount |
| **CREDIT** | `5020` | Purchase Returns & Allowances | Expense Reversal (COGS) | Subtotal |
| **CREDIT** | `1040` | GST Input Tax Credit | Asset Reversal | Tax Amount |

---

## 4. API Endpoints Reference

| Method | Endpoint | Description | Guard / RBAC |
|---|---|---|---|
| `GET` | `/api/returns/sales` | List sales returns with pagination, date, status, customer & sale filters | `finance.invoices.view` |
| `GET` | `/api/returns/sales/:id` | Get sales return passport with line items & credit note | `finance.invoices.view` |
| `POST` | `/api/returns/sales` | Create draft sales return with returnable quantity check | `finance.invoices.edit` |
| `POST` / `PATCH` | `/api/returns/sales/:id/approve` | Approve return and issue `CreditNote` (`CN-YYYY-XXXX`) | `finance.invoices.edit` |
| `POST` / `PATCH` | `/api/returns/sales/:id/complete` | Complete return, restock goods (`InventoryMovementService`), post GL | `finance.invoices.edit` |
| `GET` | `/api/returns/credit-notes` | List credit notes with balance amount and status | `finance.invoices.view` |
| `GET` | `/api/returns/purchases` | List purchase returns with pagination and filters | `purchase.view` |
| `GET` | `/api/returns/purchases/:id` | Get purchase return passport with line items & debit note | `purchase.view` |
| `POST` | `/api/returns/purchases` | Create draft purchase return with returnable quantity check | `purchase.create` |
| `POST` / `PATCH` | `/api/returns/purchases/:id/approve` | Approve return and issue `DebitNote` (`DN-YYYY-XXXX`) | `purchase.edit` |
| `POST` / `PATCH` | `/api/returns/purchases/:id/complete` | Complete return, remove stock (`InventoryMovementService`), post GL | `purchase.edit` |
| `GET` | `/api/returns/debit-notes` | List debit notes with balance amount and status | `purchase.view` |
| `GET` | `/api/sales/:id/returns` | Sub-route streaming all returns for a specific sale | `sales.invoices.view` |
| `GET` | `/api/purchases/:id/returns` | Sub-route streaming all returns for a specific PO | `purchase.view` |

---

## 5. UI Integration Details

1. **Returns Page (`src/routes/_authenticated/_app/returns.tsx`)**:
   - Tab 1: **Sales Returns** (Status, Invoice Reference, Customer, Subtotal, Tax, Total, Action buttons).
   - Tab 2: **Credit Notes** (Note #, Customer, Original Amount, Allocated, Balance, Active badge).
   - Tab 3: **Purchase Returns** (Status, Purchase #, Supplier, Total, Actions).
   - Tab 4: **Debit Notes** (Note #, Supplier, Original Amount, Allocated, Balance, Active badge).
   - Dialogs: Create Sales Return Dialog with dynamic item selector and returnable quantity limiter; Create Purchase Return Dialog; View Return Passport Modal.
2. **App Sidebar (`src/components/app-sidebar.tsx`)**:
   - Added `{ title: "Returns & Notes", url: "/returns", icon: RotateCcw }` in the Sales & Projects group.
3. **Invoices View (`src/routes/_authenticated/_app/invoices.tsx`)**:
   - Added "Issue Return / Credit Note" button in invoice preview dialog routing directly to `/returns`.
4. **Purchases View (`src/routes/_authenticated/_app/purchases.tsx`)**:
   - Added "Issue Return / Debit Note" button on received purchase orders routing to `/returns`.

---

## 6. Verification Status

- Automated integration test suite `server/src/tests/wave3-step3-6-sales-purchase-returns.test.ts` passed **12/12 scenarios (100%)**.
- Regression test suites `wave3-step3-5-sales-pos-ar.test.ts` (10/10), `wave3-step3-3-5-inventory-finalization.test.ts` (25/25), and `wave3-step3-1-tenant-isolation.test.ts` (28/28) passed **100% with zero regressions**.
- Frontend type check (`npx tsc --noEmit`) succeeded with **0 errors**.
