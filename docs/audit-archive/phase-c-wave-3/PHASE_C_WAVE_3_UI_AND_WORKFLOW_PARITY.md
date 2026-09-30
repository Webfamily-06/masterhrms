# PHASE C — WAVE 3 UI AND WORKFLOW PARITY AUDIT
## Screen-by-Screen Parity Evaluation: Laravel React/Inertia vs Target React/TanStack Router

**Audit Scope:** 19 Major ERP User Interfaces and Workflows  
**Evaluation Standard:** FULLY EQUIVALENT, PARTIALLY EQUIVALENT, MISSING, DIFFERENT BY DESIGN, NOT VERIFIED  

---

## 1. COMPREHENSIVE SCREEN-BY-SCREEN PARITY MATRIX

| # | Screen / Workflow Domain | Laravel Source Screen (`main-file/`) | Target Platform Route (`src/routes/_authenticated/_app/`) | Parity Classification | Granular UI & Workflow Comparison |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Accounting Dashboard & KPIs** | `packages/workdo/Account/src/Resources/js/Pages/Dashboard/Index.tsx` | `accounting.tsx` (Tab: "overview") & `finance-dashboard.tsx` | **FULLY EQUIVALENT** | Both display total revenue, total expense, net profit, cash balance, and quick action buttons. Target adds real-time balance sheet health indicators. |
| **2** | **Chart of Accounts (COA)** | `Account/.../Pages/ChartOfAccounts/Index.tsx` | `accounting.tsx` (Tab: "chart") | **FULLY EQUIVALENT** | Displays expandable hierarchical table of accounts grouped by type (Asset, Liability, Equity, Revenue, Expense). Search, create modal, edit modal, delete protection on system accounts. |
| **3** | **Manual Journal Entries** | `Account/.../Pages/JournalEntry/Index.tsx`, `Create.tsx` | `accounting.tsx` (Tab: "journals") | **FULLY EQUIVALENT** | Multi-line debit/credit table with auto-calculating totals, balance difference indicator, reference number, narration, and posting validation. |
| **4** | **General Ledger Statement** | `Account/.../Pages/Reports/CustomerDetail.tsx` (ad-hoc) | `accounting.tsx` (Tab: "ledger") | **FULLY EQUIVALENT** | Account selector dropdown, date range picker, running balance column, debit/credit split, and counter-account traceability. |
| **5** | **Trial Balance Report** | External add-on in Laravel | `accounting.tsx` (Tab: "trial-balance") | **FULLY EQUIVALENT** | Debit vs Credit columns per account, grand totals row, and dynamic mathematical balance check badge (`Balanced / Unbalanced`). |
| **6** | **Balance Sheet & Profit & Loss** | `Account/.../Pages/Reports/Index.tsx` | `accounting.tsx` (Tab: "statements") | **FULLY EQUIVALENT** | Categorized dual-statement view (P&L: Gross Revenue, Expenses, Net Profit; Balance Sheet: Total Assets = Total Liabilities + Total Equity). Printable export. |
| **7** | **Product & Service Directory** | `packages/workdo/ProductService/.../Pages/Items/Index.tsx` | `products.tsx` | **FULLY EQUIVALENT** | Data table with product images, SKU, Barcode, HSN/SAC, category badge, sale price, purchase cost, warehouse stock badges, low-stock threshold warning, and pagination. |
| **8** | **Product Create & Edit Drawer** | `Items/Create.tsx`, `Edit.tsx` | `products.tsx` (Slide-over Dialog / Drawer) | **FULLY EQUIVALENT** | Multi-section form: General info, pricing, tax rates, category, brand, units, reorder levels, image uploads, and initial stock by warehouse. |
| **9** | **Multi-Warehouse Management** | `resources/js/Pages/warehouses/Index.tsx` | `products.tsx` (Warehouse Tab) & `inventory-dashboard.tsx` | **FULLY EQUIVALENT** | Warehouse directory, location, contact info, default warehouse toggle, and aggregate physical inventory breakdown. |
| **10** | **Stock Transfers Manifest** | `resources/js/Pages/Transfers/Index.tsx` | `transfers.tsx` | **FULLY EQUIVALENT** | List of transfers with status badges (`pending`, `approved`, `in_transit`, `completed`, `rejected`), source/destination warehouse, item count, and dispatch/receive actions. |
| **11** | **Stock Adjustment Vouchers** | `ProductService/.../Pages/Stock/Index.tsx` | `adjustments.tsx` | **FULLY EQUIVALENT** | Warehouse selector, adjustment type toggle (Addition / Subtraction), item search, quantity, reason code dropdown, and auto-posting to GL. |
| **12** | **Supplier / Vendor Master** | `Account/.../Pages/Vendors/Index.tsx` | `suppliers.tsx` | **FULLY EQUIVALENT** | Supplier directory with search, GSTIN, email, phone, city, balance payable badge, and purchase history drawer. |
| **13** | **Purchase Order & Goods Receipt** | `resources/js/Pages/Purchase/Index.tsx`, `Show.tsx` | `purchases.tsx` & `procurement-dashboard.tsx` | **FULLY EQUIVALENT** | PO table, status badges (`pending`, `received`, `cancelled`), payment status, supplier dropdown, warehouse selector, item rows with tax calculation, and goods receipt action. |
| **14** | **Purchase Returns & Debit Notes** | `resources/js/Pages/PurchaseReturns/Index.tsx` | *Missing in Target* (`sales-returns.tsx` placeholder) | **MISSING** | Target has no dedicated UI screen for initiating vendor returns or generating debit notes against pending purchase bills. |
| **15** | **Customer Directory & Credit** | `Account/.../Pages/Customers/Index.tsx` | `crm.tsx` & `invoices.tsx` (Customer Tab) | **FULLY EQUIVALENT** | Customer list with GSTIN, credit limit, phone, email, outstanding receivable balance, and billing/shipping address. |
| **16** | **Sales Invoice Generator** | `resources/js/Pages/Sales/Create.tsx`, `Index.tsx` | `invoices.tsx` & `sales-dashboard.tsx` | **FULLY EQUIVALENT** | B2B invoice creation with line items, tax mode (CGST/SGST vs IGST), discount, customer selection, dueDate, and PDF preview. |
| **17** | **POS Terminal Checkout** | `packages/workdo/Pos/.../Pages/Pos/Index.tsx` | `pos.tsx` | **FULLY EQUIVALENT** | Dual-pane high-speed POS: left-side product grid with barcode search, right-side active cart, held orders bar, split-tender payment modal (Cash/Card/UPI), thermal receipt printing. |
| **18** | **Cash Registers & Shift Sessions** | `Pos/.../Pages/PosCounter/Index.tsx` | `pos.tsx` (Register Shift Drawer) | **FULLY EQUIVALENT** | Register open/close dialog with opening float, running cash in/out, expected cash calculation, actual cash entry, and cash discrepancy reporting. |
| **19** | **Sales Returns & Credit Notes** | `resources/js/Pages/SalesReturns/Index.tsx` | *Missing in Target* | **MISSING** | Target has no dedicated UI screen for processing customer returns, restocking returned inventory, or issuing credit notes. |

---

## 2. DETAILED UI COMPONENT & INTERACTION AUDIT

### 2.1 Table Operations & Universal Query Contract
Across all Wave 3 target screens (`accounting.tsx`, `products.tsx`, `purchases.tsx`, `invoices.tsx`, `pos.tsx`, `transfers.tsx`):
- **Search & Debounce:** All tables implement instant debounced search (300ms) querying backend API filters.
- **Sorting:** Multi-column sorting (`accountCode`, `name`, `createdAt`, `totalAmount`, `status`) supported.
- **Pagination:** Target uses standardized pagination components (`page`, `pageSize`, `totalCount`, `totalPages`).
- **Responsive Layout:** Responsive flex tables with mobile card view fallbacks using Tailwind CSS breakpoints.

### 2.2 Modal Dialogs & Passport Drawers
- **Create / Edit Modals:** High-density forms implemented with Radix UI Dialog and Sheet primitives.
- **Destructive Action Confirmations:** Custom alert dialogs for voiding journal entries, cancelling purchase orders, and deleting catalog items. System accounts and active warehouses have disabled delete actions.

### 2.3 Thermal & PDF Printing Workflows
- **POS Receipts:** `pos.tsx` integrates both direct browser print stylesheets and QZ-Tray thermal printing endpoints (`/api/qz/print`) for 80mm and 58mm thermal receipt printers.
- **Invoice PDF Generation:** Client portal (`portal.invoices.$id.tsx`) renders responsive tax invoices formatted for standard A4 printing and PDF export with tax breakdown tables.

### 2.4 External Data Exchange Workflows
- **Tally Importer:** Target provides a dedicated UI (`tally-importer.tsx`) for importing Tally XML charts of accounts and day books into the target database.
- **QuickBooks / Xero Export:** `accounting.routes.ts` provides pre-formatted CSV/JSON export endpoints for QuickBooks and Xero.

---

## 3. UI PARITY SUMMARY

- **Total Screens Audited:** 19 Functional UI Workflows
- **Fully Equivalent:** 17 Screens (89.5%)
- **Partially Equivalent:** 0 Screens (0.0%)
- **Missing Screens:** 2 Screens (10.5%)
  1. `PurchaseReturns` (Vendor Debit Notes & Return Stock Inward)
  2. `SalesReturns` (Customer Credit Notes & Restocking)
