# LARAVEL TO TARGET DATABASE MAPPING & SCHEMA PARITY REPORT

**Source Database:** Laravel 12 MySQL Schema (`main-file/database/migrations` & `main-file/packages/workdo/*/src/Database/Migrations`)  
**Target ORM & Database:** Prisma 5.19.1 + MariaDB / MySQL (`server/prisma/schema.prisma`)  
**Status:** Comprehensive Database Mapping Complete — Phase A  

---

## 1. TABLE-TO-MODEL COMPREHENSIVE MAPPING MATRIX

Below is the exhaustive mapping of all major Laravel database tables to existing and proposed Prisma schema models in the target platform:

| Laravel Database Table | Target Prisma Model | Multi-Tenant Key | Mapping Status | Key Field Modifications / Gap Resolution |
| :--- | :--- | :---: | :---: | :--- |
| `users` | `User` | Global | **Mapped** | Unscoped platform user identity. Related via `Profile` and `Employee`. |
| `plans` | `SubscriptionPlan` | Global | **Mapped** | Master SaaS subscription plans catalog. |
| `orders` | `PaymentGatewayTransaction` | `tenant_id` | **Mapped** | Stores SaaS subscription invoice payments and checkout transactions. |
| `coupons` / `user_coupons` | `SubscriptionCoupon` (Proposed) | Global | **To Add** | SaaS plan discount coupon engine. |
| `add_ons` / `user_active_modules` | `Addon` / `TenantAddon` | `tenant_id` | **Mapped** | Marketplace modules and tenant active entitlements. |
| `employees` | `Employee` | `tenant_id` | **Mapped** | Full employee HR records (Personal, Statutory, Bank, Salary). |
| `attendances` | `Attendance` | `tenant_id` | **Mapped** | Biometric and manual employee punch logs. |
| `leave_applications` / `leave_types` | `LeaveRequest` / `LeaveType` | `tenant_id` | **Mapped** | Leave requests, leave balances, approval workflows. |
| `payrolls` / `payroll_entries` | `PayrollRun` / `Payslip` | `tenant_id` | **Mapped** | Monthly payroll processing, salary structures, payslip PDFs. |
| `allowances` / `deductions` | `SalaryComponent` / `SalaryStructureItem` | `tenant_id` | **Mapped** | Earning and deduction components attached to salary structures. |
| `chart_of_accounts` | `ChartOfAccount` | `tenant_id` | **Mapped** | ERP double-entry accounting ledger accounts. |
| `journal_entries` / `journal_entry_items` | `JournalEntry` / `JournalItem` | `tenant_id` | **Mapped** | Balanced debit/credit journal transactions. |
| `bank_accounts` / `bank_transactions` | `BankAccount` / `BankTransaction` (Proposed) | `tenant_id` | **To Add** | Corporate banking, deposits, withdrawals, transfers. |
| `sales_invoices` / `sales_invoice_items` | `Sale` / `SaleDetail` | `tenant_id` | **Mapped** | Customer invoicing, line items, taxes, discounts. |
| `purchase_invoices` / `purchase_invoice_items` | `Purchase` / `PurchaseDetail` | `tenant_id` | **Mapped** | Vendor bills, stock receipt posting, line items. |
| `sales_returns` / `purchase_returns` | `SalesReturn` / `PurchaseReturn` (Proposed) | `tenant_id` | **To Add** | Stock return notes and approval states. |
| `pos` / `pos_items` / `pos_payments` | `CashRegister` / `RegisterShift` / `Sale` | `tenant_id` | **Mapped** | POS checkout, barcode terminal sales, shift registers. |
| `warehouses` / `warehouse_stocks` | `Warehouse` / `ProductWarehouse` | `tenant_id` | **Mapped** | Physical warehouses and stock inventory counts. |
| `projects` / `project_tasks` / `project_bugs` | `Project` / `ProjectTask` / `ProjectBug` (Proposed) | `tenant_id` | **Mapped / To Add** | Taskly project management, Kanban stages, bug tracker. |
| `leads` / `deals` / `sales_proposals` | `CrmLead` / `CrmProposal` | `tenant_id` | **Mapped** | CRM sales pipeline, deals, custom proposals. |
| `helpdesk_tickets` / `helpdesk_replies` | `HelpdeskTicket` / `HelpdeskComment` | `tenant_id` | **Mapped** | Customer support tickets and reply messages. |
| `ch_messages` / `ch_favorites` / `ch_pinned` | `ChatMessage` | `tenant_id` | **Mapped** | Realtime internal messenger chat history. |
| `announcements` / `acknowledgments` | `Announcement` / `AnnouncementAcknowledgement` | `tenant_id` | **Mapped** | Company broadcasts & digital policy signatures. |

---

## 2. MULTI-TENANT ISOLATION GUARANTEES

In the Laravel source application, multi-tenancy was partially enforced via `workspace_id` or `created_by` columns.

In the target platform, **ALL tenant-owned models MUST strictly implement the `tenant_id` column** referencing `tenants(id)`.

### Automatic Database Isolation Rules:
1. **Direct Tenant Models:** Column `tenant_id VARCHAR(36) NOT NULL` with foreign key `@relation(fields: [tenantId], references: [id], onDelete: Cascade)`.
2. **Child-Dependent Models:** Isolated via parent relation predicate (e.g. `SaleDetail` isolated via `sale: { tenantId }`).
3. **ORM Auto-Scoping:** The Prisma Proxy Facade automatically injects `tenantId` into `where` predicates and write payloads.
