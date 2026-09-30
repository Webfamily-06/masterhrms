# Phase C — Wave 3 — Step 3.3: Database Mapping

**Domain**: Product Catalog & Inventory Atomic Stock Management  
**Status**: READ-ONLY AUDIT  
**Date**: 2026-09-27T00:50:00+05:30  
**Database**: MySQL 9.5.0 (`master_hrms_dev`)  

---

## 1. Table Schema Comparison & Mapping

### 1.1 Product Master Table
| Laravel (`product_service_items`) | Target Prisma (`products`) | MySQL Type (`master_hrms_dev`) | Constraints & Relations | Notes |
|---|---|---|---|---|
| `id` (bigint unsigned) | `id` (String / UUID) | `VARCHAR(36) PRIMARY KEY` | Primary Key | UUID migration pattern |
| `creator_id` / `created_by` | `tenantId` (`tenant_id`) | `VARCHAR(36) NOT NULL` | FK `tenants(id)` ON DELETE CASCADE | Strict tenant isolation |
| `name` (varchar 255) | `name` (String) | `VARCHAR(255) NOT NULL` | Indexed | Product name |
| `type` (varchar 50) | `type` (String) | `VARCHAR(50) DEFAULT 'Product'` | Indexed | `'Product'` or `'Service'` |
| `sku` (varchar 100) | `sku` (String) | `VARCHAR(100) NOT NULL` | `UNIQUE(tenant_id, sku)` | Tenant-scoped unique SKU |
| *None* | `barcode` (String?) | `VARCHAR(100) NULL` | Indexed | EAN-13 / Code-128 / UPC |
| *None* | `hsnSac` (`hsn_sac`) | `VARCHAR(50) NULL` | Nullable | Statutory GST / Tax code |
| `category_id` (bigint) | `categoryId` (`category_id`) | `VARCHAR(36) NULL` | FK `product_categories(id)` ON DELETE SET NULL | Category classification |
| *None* | `brandId` (`brand_id`) | `VARCHAR(36) NULL` | FK `brands(id)` ON DELETE SET NULL | Brand classification |
| `unit` (bigint) | `unitId` (`unit_id`) | `VARCHAR(36) NULL` | FK `units(id)` ON DELETE SET NULL | Unit of measurement |
| `tax_ids` (JSON) | `taxRateId` (`tax_rate_id`) | `VARCHAR(36) NULL` | FK `tax_rates(id)` ON DELETE SET NULL | Statutory tax rate link |
| `sale_price` (decimal 15,2) | `salePrice` (`sale_price`) | `DECIMAL(15, 2) DEFAULT 0.00` | Precision 15, Scale 2 | Default selling price |
| `purchase_price` (decimal 15,2) | `purchasePrice` (`purchase_price`) | `DECIMAL(15, 2) DEFAULT 0.00` | Precision 15, Scale 2 | Default cost price |
| *None* | `lowStockThreshold` (`low_stock_threshold`) | `INT DEFAULT 5` | Default 5 | Low-stock alert threshold |
| `image` (varchar 255) | `image` (String?) | `VARCHAR(500) NULL` | Nullable | Primary product image URL |
| `images` (JSON) | `additionalImages` (`additional_images`) | `JSON NULL` | Valid JSON | Product image gallery |
| *None* | `shortDescription` (`short_description`) | `VARCHAR(500) NULL` | Nullable | Summary description |
| `description` (text) | `description` (String?) | `TEXT NULL` | Nullable | Full HTML description |
| `is_active` (boolean) | `isActive` (`is_active`) | `BOOLEAN DEFAULT TRUE` | Indexed `(tenant_id, is_active)` | Active/Archived status |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` | `DATETIME(3)` | Default `CURRENT_TIMESTAMP(3)` | Audit timestamps |

---

### 1.2 Warehouse & Stock Balances Table
| Laravel (`warehouse_stocks`) | Target Prisma (`product_warehouses`) | MySQL Type (`master_hrms_dev`) | Constraints & Relations | Notes |
|---|---|---|---|---|
| `id` (bigint unsigned) | `id` (String / UUID) | `VARCHAR(36) PRIMARY KEY` | Primary Key | UUID |
| `product_id` (bigint) | `productId` (`product_id`) | `VARCHAR(36) NOT NULL` | FK `products(id)` ON DELETE CASCADE | Linked product |
| `warehouse_id` (bigint) | `warehouseId` (`warehouse_id`) | `VARCHAR(36) NOT NULL` | FK `warehouses(id)` ON DELETE CASCADE | Linked warehouse |
| **`quantity` (decimal 15,2)** | **`quantity` (Int)** | **`INT NOT NULL DEFAULT 0`** | **CRITICAL PRECISION GAP** | Laravel uses `decimal(15,2)`; Target uses `Int`. Must migrate to Decimal. |
| *None* | `createdAt` / `updatedAt` | `DATETIME(3)` | Default `CURRENT_TIMESTAMP(3)` | Timestamps |
| *None* | `@@unique([productId, warehouseId])` | `UNIQUE(product_id, warehouse_id)` | Composite unique key | 1 stock record per product/warehouse |

---

### 1.3 Warehouse Master Table
| Laravel (`warehouses`) | Target Prisma (`warehouses`) | MySQL Type (`master_hrms_dev`) | Constraints & Relations |
|---|---|---|---|
| `id` (bigint unsigned) | `id` (String / UUID) | `VARCHAR(36) PRIMARY KEY` | Primary Key |
| `creator_id` / `created_by` | `tenantId` (`tenant_id`) | `VARCHAR(36) NOT NULL` | FK `tenants(id)` ON DELETE CASCADE |
| `name` (varchar 255) | `name` (String) | `VARCHAR(150) NOT NULL` | Warehouse name |
| `address` (varchar 255) | `location` (String?) | `VARCHAR(255) NULL` | Street / location |
| `city` (varchar 255) | `city` (String?) | `VARCHAR(100) NULL` | City |
| `phone` (varchar 255) | `phone` (String?) | `VARCHAR(50) NULL` | Phone contact |
| `email` (varchar 255) | `email` (String?) | `VARCHAR(150) NULL` | Email contact |
| `is_active` (boolean) | `isDefault` (`is_default`) | `BOOLEAN DEFAULT FALSE` | Default warehouse flag |

---

### 1.4 Stock Transfers Tables
| Entity | Prisma Model | Table Name | Columns & Constraints |
|---|---|---|---|
| **Transfer Header** | `StockTransfer` | `stock_transfers` | `id` (UUID PK), `tenant_id` (FK), `transfer_no` (`UNIQUE(tenant_id, transfer_no)`), `from_warehouse_id` (FK `warehouses`), `to_warehouse_id` (FK `warehouses`), `status` (VARCHAR 30: `pending`, `approved`, `in_transit`, `completed`, `rejected`), `notes` (TEXT), `date` (DATETIME). |
| **Transfer Details** | `StockTransferDetail` | `stock_transfer_details` | `id` (UUID PK), `transfer_id` (FK `stock_transfers` ON DELETE CASCADE), `product_id` (FK `products` ON DELETE RESTRICT), **`quantity` (Int DEFAULT 1 - Precision Gap)**. |

---

### 1.5 Stock Adjustments Tables
| Entity | Prisma Model | Table Name | Columns & Constraints |
|---|---|---|---|
| **Adjustment Header** | `StockAdjustment` | `stock_adjustments` | `id` (UUID PK), `tenant_id` (FK), `warehouse_id` (FK `warehouses`), `type` (VARCHAR 30: `addition`, `subtraction`), `reason` (VARCHAR 255), `date` (DATETIME). |
| **Adjustment Details** | `StockAdjustmentDetail` | `stock_adjustment_details` | `id` (UUID PK), `adjustment_id` (FK `stock_adjustments` ON DELETE CASCADE), `product_id` (FK `products` ON DELETE RESTRICT), **`quantity` (Int DEFAULT 1 - Precision Gap)**. |

---

## 2. Multi-Tenant Scoping Configuration

In `server/src/config/tenant-models.config.ts`:

```typescript
// DIRECT_TENANT_MODELS (Enforced with automatic tenant_id injection)
"Product",
"Warehouse",
"ProductCategory",
"Brand",
"Unit",
"TaxRate",
"StockTransfer",
"StockAdjustment"

// CHILD_DEPENDENT_MODELS (Scoped via parent entity foreign keys)
["ProductWarehouse", { parentRelation: "product", parentModel: "Product" }],
["StockTransferDetail", { parentRelation: "transfer", parentModel: "StockTransfer" }],
["StockAdjustmentDetail", { parentRelation: "adjustment", parentModel: "StockAdjustment" }]
```

---

## 3. Required Schema Changes for Step 3.3 (Future Implementation)

The following schema modifications are identified for Step 3.3 implementation (do **NOT** apply in this audit stage):

1. **Fractional Quantity Precision Migration**:
   - `ProductWarehouse.quantity`: Change from `Int` to `Decimal @default(0.000) @db.Decimal(15, 3)`.
   - `StockTransferDetail.quantity`: Change from `Int` to `Decimal @default(1.000) @db.Decimal(15, 3)`.
   - `StockAdjustmentDetail.quantity`: Change from `Int` to `Decimal @default(1.000) @db.Decimal(15, 3)`.
2. **Immutable Stock Movement Ledger (`StockMovement` model)**:
   - Create `stock_movements` table:
     - `id`: UUID Primary Key
     - `tenantId`: FK to `tenants(id)`
     - `productId`: FK to `products(id)`
     - `warehouseId`: FK to `warehouses(id)`
     - `movementType`: Enum/String (`purchase_receipt`, `sales_deduction`, `transfer_out`, `transfer_in`, `adjustment_addition`, `adjustment_subtraction`, `opening_stock`, `sales_return`, `purchase_return`)
     - `quantity`: `Decimal(15, 3)`
     - `balanceBefore`: `Decimal(15, 3)`
     - `balanceAfter`: `Decimal(15, 3)`
     - `unitCost`: `Decimal(15, 2)`
     - `referenceId`: Nullable String (e.g., Sale ID, Purchase ID, Transfer ID)
     - `referenceType`: Nullable String (e.g., `"sale"`, `"purchase"`, `"transfer"`)
     - `createdAt`: `DateTime @default(now())`
     - Index on `(tenant_id, product_id, warehouse_id, created_at)`
3. **Register `StockMovement` in `tenant-models.config.ts`** under `DIRECT_TENANT_MODELS`.
