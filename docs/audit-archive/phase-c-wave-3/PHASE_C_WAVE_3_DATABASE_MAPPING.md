# PHASE C — WAVE 3 DATABASE & SCHEMA MAPPING
## Comprehensive Entity Mapping: Laravel Eloquent vs Prisma 5 MySQL Schema

**Audit Scope:** Database tables, columns, data types, constraints, foreign keys, and tenant ownership  
**Source Database Engine:** MySQL / MariaDB (Laravel Eloquent ORM)  
**Target Database Engine:** MySQL / MariaDB (Prisma 5.19.1 ORM)  

---

## 1. ARCHITECTURAL & CONSTITUTIONAL PRINCIPLES

1. **Naming Standard:**
   - Database Tables: `snake_case` (e.g., `chart_of_accounts`, `journal_entries`, `product_warehouses`, `sale_details`).
   - Prisma Models: `PascalCase` (e.g., `ChartOfAccount`, `JournalEntry`, `ProductWarehouse`, `SaleDetail`).
   - Foreign Keys & Primary Keys: `id` (UUIDv4 @db.VarChar(36)), `tenantId` (`@map("tenant_id") @db.VarChar(36)`).
2. **Numeric Precision:**
   - Monetary Amounts: All financial balances, line subtotals, taxes, and totals use `@db.Decimal(15, 2)`.
   - Tax Percentages / Rates: `@db.Decimal(5, 2)`.
   - Physical Quantities: `Int` or `@db.Decimal(12, 3)` where fractional units of measurement (kg, meters) apply.
3. **Tenant Ownership Isolation:**
   - Direct Tenant Models MUST define `tenantId @map("tenant_id")` and foreign key reference to `Tenant.id` with `onDelete: Cascade`.
   - Child-Dependent Models (e.g., `JournalItem`, `SaleDetail`, `PurchaseDetail`) reference their direct tenant parent with `onDelete: Cascade`.

---

## 2. DETAILED MODEL-TO-MODEL MAPPING MATRIX

### 2.1 Financial Accounting & General Ledger

#### A. Chart of Accounts
| Dimension | Laravel Eloquent Source (`chart_of_accounts`) | Target Prisma Schema (`chart_of_accounts` / `ChartOfAccount`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Primary Key** | `id` (BigIncrements / UnsignedBigInt) | `id` (UUIDv4 @db.VarChar(36)) | **EQUIVALENT** (Adapted to UUID) |
| **Tenant Key** | `created_by` / `workspace_id` (BigInt) | `tenantId` (`@map("tenant_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Account Code** | `account_code` (VarChar 50) | `accountCode` (`@map("account_code") @db.VarChar(50)`) | **EQUIVALENT** |
| **Account Name** | `account_name` (VarChar 150) | `accountName` (`@map("account_name") @db.VarChar(150)`) | **EQUIVALENT** |
| **Account Type** | `type` (asset, liability, equity, income, expense) | `accountType` (`@map("account_type") @db.VarChar(50)`) | **EQUIVALENT** (asset, liability, equity, revenue, expense) |
| **Category** | `category` (FK to `account_categories`) | `category` (VarChar 50 enum string) | **DIFFERENT BY DESIGN** (Target uses standard ERP categories) |
| **Balance** | Computed dynamically from journal items | `balance` (`@db.Decimal(15, 2) @default(0.00)`) | **DIFFERENT BY DESIGN** (Running cached balance for O(1) balance sheets) |
| **System Flag** | `is_system` (Boolean @default(0)) | `isSystem` (`@map("is_system") @default(false)`) | **EQUIVALENT** |
| **Status** | `status` (Boolean / Active) | `status` (VarChar 20 @default("active")) | **EQUIVALENT** |
| **Unique Indexes**| `UNIQUE(account_code, created_by)` | `@@unique([tenantId, accountCode])` | **EQUIVALENT** |

#### B. Journal Entries & Journal Items
| Dimension | Laravel Eloquent Source (`journal_entries` & `journal_entry_items`) | Target Prisma Schema (`journal_entries` & `journal_items`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Parent Entity** | `JournalEntry` (`journal_entries`) | `JournalEntry` (`journal_entries`) | **EQUIVALENT** |
| **Entry Number** | `journal_id` (Integer auto-sequence) | `entryNumber` (`@map("entry_number") @db.VarChar(50)`) | **EQUIVALENT** (`JE-YYYY-XXXX-RAND`) |
| **Posting Date** | `journal_date` (Date) | `entryDate` (`@map("entry_date") @db.Date`) | **EQUIVALENT** |
| **Reference** | `reference` (String) | `reference` (VarChar 150) & `referenceType` (VarChar 50) | **EQUIVALENT** (invoice, payroll, pos, manual) |
| **Description** | `description` (Text) | `description` (Text) | **EQUIVALENT** |
| **Total Amount** | `total_debit` (Double 15,2) | `totalAmount` (`@map("total_amount") @db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Posting Status**| `status` (draft, posted) | `status` (draft, posted, void @default("posted")) | **EQUIVALENT** |
| **Child Entity** | `JournalEntryItem` (`journal_entry_items`) | `JournalItem` (`journal_items`) | **EQUIVALENT** |
| **Account FK** | `account_id` (BigInt FK) | `accountId` (`@map("account_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Debit Amount** | `debit` (Double 15,2 @default(0)) | `debit` (`@db.Decimal(15, 2) @default(0.00)`) | **EQUIVALENT** |
| **Credit Amount**| `credit` (Double 15,2 @default(0)) | `credit` (`@db.Decimal(15, 2) @default(0.00)`) | **EQUIVALENT** |
| **Item Notes** | `description` (VarChar) | `notes` (`@db.VarChar(255)`) | **EQUIVALENT** |

---

### 2.2 Product Catalog & Inventory Management

#### A. Products & Catalogs
| Dimension | Laravel Eloquent Source (`product_service_items`) | Target Prisma Schema (`products` / `Product`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Primary Key** | `id` (BigIncrements) | `id` (UUIDv4 @db.VarChar(36)) | **EQUIVALENT** |
| **Tenant Key** | `created_by` / `workspace_id` | `tenantId` (`@map("tenant_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Item Name** | `name` (VarChar 255) | `name` (VarChar 255) | **EQUIVALENT** |
| **Item Type** | `type` (product, service) | `type` (VarChar 50 @default("Product")) | **EQUIVALENT** |
| **SKU & Barcode**| `sku` (VarChar 100), `barcode` (VarChar 100) | `sku` (VarChar 100), `barcode` (VarChar 100) | **EQUIVALENT** (`UNIQUE([tenantId, sku])`) |
| **HSN / SAC Code**| `hsn_sac` (VarChar 50) | `hsnSac` (`@map("hsn_sac") @db.VarChar(50)`) | **EQUIVALENT** |
| **Cost Price** | `purchase_price` (Double 15,2) | `purchasePrice` (`@map("purchase_price") @db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Selling Price** | `sale_price` (Double 15,2) | `salePrice` (`@map("sale_price") @db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Tax Rate FK** | `tax_id` (BigInt FK) | `taxRateId` (`@map("tax_rate_id") @db.VarChar(36)`) | **EQUIVALENT** (FK to `TaxRate`) |
| **Unit FK** | `unit_id` (BigInt FK) | `unitId` (`@map("unit_id") @db.VarChar(36)`) | **EQUIVALENT** (FK to `Unit`) |
| **Category FK** | `category_id` (BigInt FK) | `categoryId` (`@map("category_id") @db.VarChar(36)`) | **EQUIVALENT** (FK to `ProductCategory`) |
| **Brand FK** | None in core ProductService | `brandId` (`@map("brand_id") @db.VarChar(36)`) | **TARGET EXTENSION** (FK to `Brand`) |
| **Reorder Level** | `low_stock_threshold` (Int @default(5)) | `lowStockThreshold` (`@map("low_stock_threshold") @default(5)`) | **EQUIVALENT** |

#### B. Warehouses & Warehouse Stocks
| Dimension | Laravel Eloquent Source (`warehouses` & `warehouse_stocks`) | Target Prisma Schema (`warehouses` & `product_warehouses`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Warehouse PK** | `id` (BigIncrements) | `id` (UUIDv4 @db.VarChar(36)) | **EQUIVALENT** |
| **Warehouse Name**| `name` (VarChar 150) | `name` (VarChar 150) | **EQUIVALENT** |
| **Stock Table** | `warehouse_stocks` | `product_warehouses` (`ProductWarehouse`) | **EQUIVALENT** |
| **Product FK** | `product_id` (BigInt FK) | `productId` (`@map("product_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Warehouse FK** | `warehouse_id` (BigInt FK) | `warehouseId` (`@map("warehouse_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Stock Quantity**| `quantity` (Int @default(0)) | `quantity` (Int @default(0)) | **EQUIVALENT** |
| **Composite Key** | `UNIQUE(product_id, warehouse_id)` | `@@unique([productId, warehouseId])` | **EQUIVALENT** |

#### C. Stock Transfers & Adjustments
| Dimension | Laravel Eloquent Source (`transfers`) | Target Prisma Schema (`stock_transfers` & `stock_adjustments`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Transfer Model**| `Transfer` (`transfers`) | `StockTransfer` (`stock_transfers`) | **EQUIVALENT** |
| **Transfer Lines**| Single item per transfer row | `StockTransferDetail` (`stock_transfer_details`) | **TARGET IMPROVEMENT** (Target supports multi-item manifest per transfer) |
| **Transfer States**| `pending`, `completed` | `pending`, `approved`, `in_transit`, `completed`, `rejected` | **TARGET IMPROVEMENT** (Full logistics state machine) |
| **Adjustments** | Embedded in stock logs | `StockAdjustment` (`stock_adjustments`) & `StockAdjustmentDetail` | **TARGET IMPROVEMENT** (Audited adjustment headers and items with GL linking) |

---

### 2.3 Purchases & Accounts Payable

#### A. Suppliers / Vendors
| Dimension | Laravel Eloquent Source (`vendors`) | Target Prisma Schema (`suppliers` / `Supplier`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Primary Key** | `id` (BigIncrements) | `id` (UUIDv4 @db.VarChar(36)) | **EQUIVALENT** |
| **Tenant Key** | `created_by` / `workspace_id` | `tenantId` (`@map("tenant_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Name** | `name` (VarChar 255) | `name` (VarChar 255) | **EQUIVALENT** |
| **Email & Phone** | `email`, `contact` | `email`, `phone` | **EQUIVALENT** |
| **Tax ID / GSTIN**| `tax_number` (VarChar 50) | `gstin` (VarChar 50) | **EQUIVALENT** |
| **Address** | `billing_address`, `shipping_address` | `address`, `city`, `country` | **EQUIVALENT** |

#### B. Purchase Orders & Purchase Invoices
| Dimension | Laravel Eloquent Source (`purchase_invoices` & `purchase_invoice_items`) | Target Prisma Schema (`purchases` & `purchase_details`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Header Table** | `purchase_invoices` | `purchases` (`Purchase`) | **EQUIVALENT** |
| **PO / Bill No** | `invoice_number` (VarChar 100) | `purchaseNo` (`@map("purchase_no") @db.VarChar(100)`) | **EQUIVALENT** (`UNIQUE([tenantId, purchaseNo])`) |
| **Supplier FK** | `vendor_id` (BigInt FK) | `supplierId` (`@map("supplier_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Warehouse FK** | `warehouse_id` (BigInt FK) | `warehouseId` (`@map("warehouse_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Total Amount** | `total_amount` (Double 15,2) | `total` (`@db.Decimal(15, 2) @default(0.00)`) | **EQUIVALENT** |
| **Paid Amount** | `paid_amount` (Double 15,2) | `paidAmount` (`@map("paid_amount") @db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Status** | `draft`, `sent`, `posted`, `partial`, `paid` | `pending`, `received`, `cancelled` / `paymentStatus` (`unpaid`, `partial`, `paid`) | **EQUIVALENT** |
| **Detail Table** | `purchase_invoice_items` | `purchase_details` (`PurchaseDetail`) | **EQUIVALENT** |
| **Product FK** | `item_id` (BigInt FK) | `productId` (`@map("product_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Cost & Qty** | `unit_price`, `quantity` | `cost` (`@db.Decimal(15, 2)`), `quantity` (`Int`) | **EQUIVALENT** |

---

### 2.4 Sales Invoicing, POS & Accounts Receivable

#### A. Customers
| Dimension | Laravel Eloquent Source (`customers`) | Target Prisma Schema (`customers` / `Customer`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Primary Key** | `id` (BigIncrements) | `id` (UUIDv4 @db.VarChar(36)) | **EQUIVALENT** |
| **Tenant Key** | `created_by` / `workspace_id` | `tenantId` (`@map("tenant_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Name** | `name` (VarChar 255) | `name` (VarChar 255) | **EQUIVALENT** |
| **GSTIN** | `tax_number` (VarChar 50) | `gstin` (VarChar 50) | **EQUIVALENT** |
| **Credit Limit** | `credit_limit` (Double 15,2) | `creditLimit` (`@map("credit_limit") @db.Decimal(15, 2)`) | **EQUIVALENT** |

#### B. Sales Invoices & POS Sales
| Dimension | Laravel Eloquent Source (`sales_invoices` & `pos`) | Target Prisma Schema (`sales` / `Sale`) | Mapping Evaluation & Gaps |
| :--- | :--- | :--- | :--- |
| **Header Table** | `sales_invoices` & `pos` | `sales` (`Sale`) | **UNIFIED ERP DESIGN** (Target unifies B2B Invoices and POS Sales in `Sale` with `type: "invoice" \| "pos"`) |
| **Invoice Number**| `invoice_number` (VarChar 100) | `invoiceNo` (`@map("invoice_no") @db.VarChar(100)`) | **EQUIVALENT** (`UNIQUE([tenantId, invoiceNo])`) |
| **Customer FK** | `customer_id` (BigInt FK) | `customerId` (`@map("customer_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Warehouse FK** | `warehouse_id` (BigInt FK) | `warehouseId` (`@map("warehouse_id") @db.VarChar(36)`) | **EQUIVALENT** |
| **Cashier / User**| `user_id` (BigInt FK) | `cashierId`, `cashierName` | **EQUIVALENT** |
| **Subtotal & Tax**| `subtotal`, `tax_amount` | `subtotal`, `cgst`, `sgst`, `igst`, `totalTax` | **EQUIVALENT** (Explicit statutory Indian GST breakdowns) |
| **Total Amount** | `total_amount` (Double 15,2) | `total` (`@db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Paid Amount** | `paid_amount` (Double 15,2) | `paidAmount` (`@map("paid_amount") @db.Decimal(15, 2)`) | **EQUIVALENT** |
| **Payment Status**| `status` (unpaid, partial, paid) | `paymentStatus` (`@map("payment_status") @db.VarChar(30)`) | **EQUIVALENT** |
| **Detail Table** | `sales_invoice_items` & `pos_items` | `sale_details` (`SaleDetail`) | **EQUIVALENT** |
| **Payment Table** | `customer_payments` & `pos_payments` | `sale_payments` (`SalePayment`) | **EQUIVALENT** |

---

## 3. IDENTIFIED SCHEMA GAPS (MODELS REQUIRING ADDITION)

During this audit, the following database models present in the Laravel source were identified as missing from `server/prisma/schema.prisma`:

### GAP 1: `SalesReturn` & `SalesReturnDetail`
- **Laravel Reference:** `main-file/app/Models/SalesInvoiceReturn.php` & `SalesInvoiceReturnItem.php` (`sales_invoice_returns`, `sales_invoice_return_items`).
- **Required Target Models:**
  ```prisma
  model SalesReturn {
    id              String              @id @default(uuid()) @db.VarChar(36)
    tenantId        String              @map("tenant_id") @db.VarChar(36)
    returnNo        String              @map("return_no") @db.VarChar(100)
    saleId          String?             @map("sale_id") @db.VarChar(36)
    customerId      String?             @map("customer_id") @db.VarChar(36)
    warehouseId     String?             @map("warehouse_id") @db.VarChar(36)
    totalAmount     Decimal             @default(0.00) @map("total_amount") @db.Decimal(15, 2)
    refundStatus    String              @default("pending") @map("refund_status") @db.VarChar(30) // pending, refunded, credit_note
    returnDate      DateTime            @default(now()) @map("return_date")
    notes           String?             @db.Text
    createdAt       DateTime            @default(now()) @map("created_at")
    updatedAt       DateTime            @updatedAt @map("updated_at")

    tenant    Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    sale      Sale?              @relation(fields: [saleId], references: [id], onDelete: SetNull)
    customer  Customer?          @relation(fields: [customerId], references: [id], onDelete: SetNull)
    warehouse Warehouse?         @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
    items     SalesReturnDetail[]

    @@unique([tenantId, returnNo])
    @@map("sales_returns")
  }

  model SalesReturnDetail {
    id            String      @id @default(uuid()) @db.VarChar(36)
    salesReturnId String      @map("sales_return_id") @db.VarChar(36)
    productId     String      @map("product_id") @db.VarChar(36)
    quantity      Int         @default(1)
    unitPrice     Decimal     @default(0.00) @map("unit_price") @db.Decimal(15, 2)
    subtotal      Decimal     @default(0.00) @db.Decimal(15, 2)
    createdAt     DateTime    @default(now()) @map("created_at")

    salesReturn SalesReturn @relation(fields: [salesReturnId], references: [id], onDelete: Cascade)
    product     Product     @relation(fields: [productId], references: [id], onDelete: Restrict)

    @@map("sales_return_details")
  }
  ```

### GAP 2: `PurchaseReturn` & `PurchaseReturnDetail`
- **Laravel Reference:** `main-file/app/Models/PurchaseReturn.php` & `PurchaseReturnItem.php` (`purchase_returns`, `purchase_return_items`).
- **Required Target Models:**
  ```prisma
  model PurchaseReturn {
    id              String                @id @default(uuid()) @db.VarChar(36)
    tenantId        String                @map("tenant_id") @db.VarChar(36)
    returnNo        String                @map("return_no") @db.VarChar(100)
    purchaseId      String?               @map("purchase_id") @db.VarChar(36)
    supplierId      String?               @map("supplier_id") @db.VarChar(36)
    warehouseId     String?               @map("warehouse_id") @db.VarChar(36)
    totalAmount     Decimal               @default(0.00) @map("total_amount") @db.Decimal(15, 2)
    status          String                @default("pending") @db.VarChar(30)
    returnDate      DateTime              @default(now()) @map("return_date")
    notes           String?               @db.Text
    createdAt       DateTime              @default(now()) @map("created_at")
    updatedAt       DateTime              @updatedAt @map("updated_at")

    tenant    Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    purchase  Purchase?              @relation(fields: [purchaseId], references: [id], onDelete: SetNull)
    supplier  Supplier?              @relation(fields: [supplierId], references: [id], onDelete: SetNull)
    warehouse Warehouse?             @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
    items     PurchaseReturnDetail[]

    @@unique([tenantId, returnNo])
    @@map("purchase_returns")
  }

  model PurchaseReturnDetail {
    id               String         @id @default(uuid()) @db.VarChar(36)
    purchaseReturnId String         @map("purchase_return_id") @db.VarChar(36)
    productId        String         @map("product_id") @db.VarChar(36)
    quantity         Int            @default(1)
    cost             Decimal        @default(0.00) @db.Decimal(15, 2)
    subtotal         Decimal        @default(0.00) @db.Decimal(15, 2)
    createdAt        DateTime       @default(now()) @map("created_at")

    purchaseReturn PurchaseReturn @relation(fields: [purchaseReturnId], references: [id], onDelete: Cascade)
    product        Product        @relation(fields: [productId], references: [id], onDelete: Restrict)

    @@map("purchase_return_details")
  }
  ```

### GAP 3: `FiscalPeriod` / Period Locking Controls
- **Required Target Model:**
  ```prisma
  model FiscalPeriod {
    id          String    @id @default(uuid()) @db.VarChar(36)
    tenantId    String    @map("tenant_id") @db.VarChar(36)
    year        Int
    periodName  String    @map("period_name") @db.VarChar(50) // e.g. "FY 2026-27"
    startDate   DateTime  @map("start_date") @db.Date
    endDate     DateTime  @map("end_date") @db.Date
    isClosed    Boolean   @default(false) @map("is_closed")
    closedAt    DateTime? @map("closed_at")
    closedById  String?   @map("closed_by_id") @db.VarChar(36)
    createdAt   DateTime  @default(now()) @map("created_at")
    updatedAt   DateTime  @updatedAt @map("updated_at")

    tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    @@unique([tenantId, year, periodName])
    @@map("fiscal_periods")
  }
  ```

---

## 4. TENANT ISOLATION CONFIGURATION VALIDATION

In `server/src/config/tenant-models.config.ts`, verify the classification of Wave 3 entities:
- **Direct Tenant Models (`DIRECT_TENANT_MODELS`):**
  `ChartOfAccount`, `JournalEntry`, `ProductCategory`, `Brand`, `Unit`, `TaxRate`, `Warehouse`, `Product`, `Customer`, `Supplier`, `Sale`, `HeldOrder`, `Purchase`, `StockTransfer`, `StockAdjustment`, `CashRegister`, `RegisterShift`, `BudgetPlan`, `FinancialGoal`.
  *(When `SalesReturn`, `PurchaseReturn`, and `FiscalPeriod` are added during implementation, they MUST be registered in `DIRECT_TENANT_MODELS`.)*
- **Child-Dependent Models (`CHILD_DEPENDENT_MODELS`):**
  - `JournalItem` -> `journalEntry` (`JournalEntry`)
  - `ProductWarehouse` -> `product` (`Product`)
  - `SaleDetail` -> `sale` (`Sale`)
  - `SalePayment` -> `sale` (`Sale`)
  - `PurchaseDetail` -> `purchase` (`Purchase`)
  - `StockTransferDetail` -> `transfer` (`StockTransfer`)
  - `StockAdjustmentDetail` -> `adjustment` (`StockAdjustment`)
  *(When `SalesReturnDetail` and `PurchaseReturnDetail` are added, they MUST be registered in `CHILD_DEPENDENT_MODELS`.)*

All existing classifications in `tenant-models.config.ts` are verified and structurally sound.
