# Full Application Four-Portal Parity Matrix

**Document Reference:** `FULL_APPLICATION_PORTAL_PARITY_MATRIX.md`  
**Audit Timestamp:** 2026-09-29T11:20:00+05:30  
**Scope:** Forensic Review of all Four Application Portals against Backend APIs and Database Models  
**Status Standard:** `COMPLETE` | `PARTIAL` | `BACKEND ONLY` | `FRONTEND ONLY` | `MOCKED` | `MISSING` | `NEEDS VERIFICATION`  

---

## 1. Executive Summary Across All Four Portals

| Portal | Intended User Persona | Primary Route Base | Implemented Screens | Actual Backend Integration | Overall Health & Completeness |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Super Admin Portal** | Platform Owner / SaaS Super Admin | `/_authenticated/super/*` | 19 Screens | 16 Connected / 3 Mocked | **84% COMPLETE** (Robust orchestration, but Transactions, Custom Domains, and Telemetry rely on mock data) |
| **2. Tenant/Vendor Admin Portal** | Organization Owner, HR/Finance Managers | `/_authenticated/_app/*` | 42 Screens | Real MySQL Relational Services | **95% COMPLETE** (Full ERP, HRMS, POS, Double-Entry Accounting, Stock Engine, Invoices, Returns) |
| **3. Employee Self-Service (ESS)** | Organization Employees | `/_authenticated/_app/employee-dashboard` | 1 Composite Dashboard | Partial (Attendance, Leave, Payslips) | **35% PARTIAL** (No dedicated shell; login redirects to Admin `/dashboard` yielding Access Denied; missing Timesheets and My Tasks) |
| **4. Client Portal** | External B2B Customers | `/_authenticated/_app/client-dashboard` & `/portal/*` | 1 Dashboard + 3 Public Routes | Partial (Statement lookup, Invoice Pay, Proposal Sign) | **40% PARTIAL / SECURITY RISK** (Dashboard calls admin `/api/invoices` without customer scoping; leaks data or throws 403; public portal uses mock fallback) |

---

## 2. Portal 1: Super Admin Portal Audit

### 2.1. Feature & Screen Matrix

| Feature / Screen | Frontend Route & Component | Backend Route / Controller | Role Enforcement | Tenant Scoping | Implementation Status | Detailed Findings & Forensic Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Root Command Center** | `/super/index.tsx`<br>`SuperOverview` | `GET /super/stats`<br>`GET /super/tenants`<br>`GET /cms/addons` | `super_admin` | Global (Platform-wide) | **COMPLETE** | Live KPI cards (active tenants, total users, system health, revenue), real MySQL queries, quick tenant creation modal, real-time clock. |
| **1-Click Impersonation** | `/super/index.tsx`<br>`SuperOverview` | `POST /super/impersonate/:id`<br>`POST /super/leave-impersonation` | `super_admin` | Switches to Target `tenant_id` | **COMPLETE** | Issues tenant-scoped JWT, backs up Super Admin token in `localStorage`, displays persistent amber warning banner on `AppShell` with 1-click exit. |
| **Tenant Workspaces** | `/super/tenants.tsx`<br>`TenantsAdminStudio` | `GET /super/tenants`<br>`POST /super/tenants`<br>`PUT /super/tenants/:id` | `super_admin` | Global | **COMPLETE** | Lists all tenants with employee/user count badges, search, creation modal, workspace policy drawer (`WorkspacePolicyDialog`). |
| **Subscription Plans** | `/super/plans.tsx`<br>`PlansMonetizationAdmin` | `GET /super/plans`<br>`POST /super/plans`<br>`PUT /super/plans/:id` | `super_admin` | Global | **COMPLETE** | Complete pricing tier manager (Free, Pro, Enterprise), monthly/annual pricing, seat limits, storage quotas, coupon discounts. |
| **Addons Marketplace** | `/super/marketplace.tsx`<br>`MarketplaceAdmin` | `GET /cms/addons`<br>`POST /cms/addons`<br>`PUT /cms/addons/:id` | `super_admin` | Global | **COMPLETE** | Addon registry, pricing, category filters, enable/disable switches, icon uploads. |
| **Roles & RBAC Matrix** | `/super/roles.tsx`<br>`RolesAdminStudio` | `GET /super/roles`<br>`GET /super/permissions`<br>`POST /super/roles` | `super_admin` | Global | **COMPLETE** | Master RBAC matrix, permission assignments per module, tenant role templates. |
| **Platform Settings** | `/super/settings.tsx`<br>`SuperSettingsPage` | `GET /cms/pages/system-platform-settings`<br>`PUT /cms/pages/...` | `super_admin` | Global | **COMPLETE** | SMTP mail configuration, Razorpay/Stripe platform keys, maintenance mode toggle, system currency, default timezone. |
| **Visual CMS Studio** | `/super/cms.tsx`<br>`CmsStudio` | `GET /cms/pages`<br>`POST /cms/pages`<br>`PUT /cms/pages/:id` | `super_admin` | Global | **COMPLETE** | Manages static landing pages, terms of service, privacy policy, dynamic JSON content editor. |
| **Blog & Case Studies** | `/super/blogs.tsx`<br>`/super/case-studies.tsx` | `GET /cms/pages?type=blog`<br>`POST /cms/pages` | `super_admin` | Global | **COMPLETE** | Public content management with categories, tags, author, and cover image. |
| **Platform Support** | `/super/support.tsx`<br>`SuperSupportPage` | `GET /api/platform-support/tickets`<br>`POST /api/platform-support/...` | `super_admin` | Global | **COMPLETE** | Cross-tenant global support ticketing system, priority queues, status transitions, staff replies. |
| **Database Backups** | `/super/backup.tsx`<br>`BackupRestoreAdmin` | `GET /cms/pages/system-backup-snapshots` | `super_admin` | Global | **PARTIAL** | UI records snapshots and metadata in `CmsPage`, but does not trigger an OS-level physical `mysqldump` streaming download. |
| **Platform Transactions** | `/super/transactions.tsx`<br>`SuperTransactionsPage` | None (`api.get("/api/system/config")` only) | `super_admin` | Global | **MOCKED** | Table renders hardcoded `INITIAL_TRANSACTIONS` (ACME Technologies, Globex, Initech, etc.). Does not query `PaymentGatewayTransaction`. |
| **Custom Domains** | `/super/domains.tsx`<br>`SuperDomainsPage` | None | `super_admin` | Global | **MOCKED** | Renders static mock `INITIAL_DOMAINS` array in local state. No backend domain routing table or CNAME verification API. |
| **Platform Telemetry** | `/super/analytics.tsx`<br>`SuperAnalyticsPage` | `GET /super/tenants` | `super_admin` | Global | **MOCKED** | Fetches tenant list but table renders `SAMPLE_TELEMETRY` (hardcoded storage GB, API call metrics). |

---

## 3. Portal 2: Tenant / Vendor Admin Portal Audit

### 3.1. Feature & Screen Matrix

| Feature / Screen | Frontend Route & Component | Backend Route / Controller | Role & Permissions | Tenant Scoping | Implementation Status | Detailed Findings & Forensic Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HRM Main Dashboard** | `/dashboard.tsx`<br>`DashboardPage` | `GET /api/dashboard/hrm` | `hrm.dashboard.view` | Strict `tenant_id` | **COMPLETE** | Workforce count, attendance rate, department donut chart, monthly new hires, pending leaves, dynamic payroll summary. |
| **POS & Inventory Dashboards** | `/pos-dashboard.tsx`<br>`/inventory-dashboard.tsx` | `GET /api/dashboard/pos`<br>`GET /api/dashboard/inventory` | `pos.view`<br>`inventory.view` | Strict `tenant_id` | **COMPLETE** | Real-time register revenue, top-selling items, cash drawer reconciliation, inventory valuation, stockout alerts. |
| **Finance & Accounting Dashboards** | `/finance-dashboard.tsx`<br>`/accounting.tsx` | `GET /api/dashboard/finance`<br>`GET /accounting/dashboard` | `finance.view`<br>`accounting.view` | Strict `tenant_id` | **COMPLETE** | Cash flow, accounts receivable aging, AP balances, revenue trends, expense breakdowns. |
| **Chart of Accounts & GL** | `/accounting.tsx`<br>`AccountingAppSuite` | `GET /accounting/accounts`<br>`POST /accounting/accounts`<br>`GET /accounting/journal-entries` | `accounting.view`<br>`accounting.create` | Strict `tenant_id` | **COMPLETE** | Standard 17 accounts seeded automatically. Double-entry journal entries, manual vouchers, balanced debit/credit validation. |
| **Fiscal Periods & Financial Statements** | `/accounting.tsx`<br>`AccountingAppSuite` | `GET /accounting/reports/trial-balance`<br>`GET /accounting/reports/profit-loss`<br>`GET /accounting/reports/balance-sheet` | `accounting.reports` | Strict `tenant_id` | **COMPLETE** | Full Trial Balance, Income Statement, Balance Sheet computed directly from journal items. Fiscal period open/closed validation. |
| **Voiding & Contra Reversals** | `/accounting.tsx`<br>`AccountingAppSuite` | `POST /accounting/journal-entries/:id/void` | `admin`, `finance_manager` | Strict `tenant_id` | **COMPLETE** | Wave 3 Step 3.7 contra-entry voiding engine. Atomic ledger reversal with audit tracking. |
| **Products & Multi-Warehouse Stock** | `/products.tsx`<br>`Products` | `GET /products`<br>`POST /products`<br>`GET /products/warehouses` | `inventory.products.view` | Strict `tenant_id` | **COMPLETE** | Product SKU, barcode, unit, brand, category, reorder thresholds, warehouse-specific quantity tracking (`ProductWarehouse`). |
| **Atomic Stock Transfers** | `/transfers.tsx`<br>`StockTransfersPage` | `GET /transfers`<br>`POST /transfers`<br>`POST /transfers/:id/receive` | `inventory.transfers.manage` | Strict `tenant_id` | **COMPLETE** | Multi-warehouse transfer with in-transit tracking, atomic warehouse stock decrement and increment via `StockMovement`. |
| **Stock Adjustments & Physical Audit** | `/adjustments.tsx`<br>`StockAdjustmentsPage` | `GET /adjustments`<br>`POST /adjustments` | `inventory.adjustments.manage` | Strict `tenant_id` | **COMPLETE** | Quantity adjustments (damage, shrinkage, audit corrections), atomic stock recalculation, automatic adjustment ledger posting. |
| **Purchasing & Supplier AP** | `/purchases.tsx`<br>`PurchasesPage` | `GET /purchases`<br>`POST /purchases`<br>`POST /purchases/:id/receive` | `purchases.view`<br>`purchases.create` | Strict `tenant_id` | **COMPLETE** | PO creation, inward goods receipt, unit cost tracking, supplier payable ledger generation, payment recording. |
| **Supplier Directory** | `/suppliers.tsx`<br>`SuppliersPage` | `GET /suppliers`<br>`POST /suppliers` | `suppliers.view` | Strict `tenant_id` | **COMPLETE** | Supplier master directory, contact info, payment terms, outstanding AP balances. |
| **POS Billing Terminal** | `/pos.tsx`<br>`PointOfSaleTerminal` | `POST /invoices/pos`<br>`GET /invoices/pos/held`<br>`POST /invoices/pos/held` | `pos.terminal.access` | Strict `tenant_id` | **COMPLETE** | High-speed POS billing grid, barcode scan, cart management, split payments, held order queue, thermal receipt generation. |
| **Sales Invoices & Customer AR** | `/invoices.tsx`<br>`InvoicesPage` | `GET /invoices`<br>`POST /invoices`<br>`POST /invoices/:id/payments` | `finance.invoices.view` | Strict `tenant_id` | **COMPLETE** | B2B invoice generation, tax modes (CGST/SGST vs IGST), customer link, payment recording, AR reconciliation. |
| **Sales & Purchase Returns** | `/returns.tsx`<br>`ReturnsManagementPage` | `GET /returns/sales`<br>`POST /returns/sales`<br>`GET /returns/purchases`<br>`POST /returns/purchases` | `sales.returns.manage`<br>`purchases.returns.manage` | Strict `tenant_id` | **COMPLETE** | Wave 3 Step 3.6 returns suite: Credit Notes, Debit Notes, restock toggles, ledger contra-posting. |
| **Employee Directory & Onboarding** | `/employees.tsx`<br>`Employees` | `GET /employees`<br>`POST /employees`<br>`PUT /employees/:id` | `hrm.employees.view`<br>`hrm.employees.create` | Strict `tenant_id` | **COMPLETE** | 3500+ line master directory, 7-tab profile passport dialog, avatar cropper, seat limit validation against active subscription. |
| **Attendance & Biometric Sync** | `/attendance.tsx`<br>`AttendancePage` | `GET /attendance`<br>`POST /attendance/check-in`<br>`GET /biometric/devices` | `hrm.attendance.view` | Strict `tenant_id` | **COMPLETE** | Daily roster, monthly matrix, check-in/out stamps, late arrivals, biometric hardware sync agent integration. |
| **Leave Management** | `/leave.tsx`<br>`Leave` | `GET /leave/requests`<br>`POST /leave/requests`<br>`PUT /leave/requests/:id/approve` | `hrm.leave.view` | Strict `tenant_id` | **PARTIAL** | Leave requests, approvals, and leave types persist to MySQL. However, **Holiday Calendar** uses `localStorage` (no database model). |
| **Payroll Runs & Statutory Forms** | `/payroll.tsx`<br>`PayrollPage` | `GET /payroll/runs`<br>`POST /payroll/runs`<br>`GET /compliance/forms/:type` | `hrm.payroll.view`<br>`hrm.payroll.run` | Strict `tenant_id` | **COMPLETE** | Payroll execution, salary component calculations, payslips, 11 Indian statutory PDF compliance forms (Form 16, 24Q, EPF, ESI). |
| **Exit & Offboarding** | `/offboarding.tsx`<br>`OffboardingPage` | `GET /offboarding`<br>`POST /offboarding` | `hrm.offboarding.view` | Strict `tenant_id` | **COMPLETE** | Resignations, exit interview questions, asset clearance checklist, final settlement transition. |
| **Asset Tracking (Addon)** | `/assets.tsx`<br>`AssetsPage` | `GET /assets`<br>`POST /assets`<br>`POST /assets/:id/assign` | `assets.view`, requires addon | Strict `tenant_id` | **COMPLETE** | Hardware/equipment asset registry, serial numbers, QR code generation, custody assignments, maintenance history. |
| **OKR & Goal Cycles (Addon)** | `/okr.tsx`<br>`OkrPage` | `GET /okr/cycles`<br>`POST /okr/objectives` | `okr.view`, requires addon | Strict `tenant_id` | **COMPLETE** | Quarterly OKR cycles, Objectives, measurable Key Results, progress check-ins. |

---

## 4. Portal 3: Employee Self-Service (ESS) Portal Audit

### 4.1. Feature & Workflow Matrix

| Feature / Screen | Frontend Route & Component | Backend Route / Controller | Role & Permissions | Tenant Scoping | Implementation Status | Detailed Findings & Forensic Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Employee Login Redirection** | `/auth.tsx` | `POST /auth/login` | `employee` | Tenant-scoped | **CRITICAL DEFECT** | Upon login, all users are unconditionally redirected to `/dashboard` (Admin HRM). An employee lacks `hrm.dashboard.view` permission, immediately hitting an **Access Denied screen** (`AccessDenied.tsx`)! |
| **Employee Dashboard** | `/employee-dashboard.tsx`<br>`EmployeeDashboardPage` | `GET /api/attendance`<br>`GET /leave/requests`<br>`GET /leave/types` | `employee` | Tenant-scoped | **COMPLETE** | Dedicated dashboard with punch-in/out timer, shift schedule card, leave application modal, payslip download button, announcement feed. |
| **Punch In / Out Clock** | `/employee-dashboard.tsx` | `POST /attendance/check-in`<br>`POST /attendance/check-out` | `employee` | Strict `employeeId` + `tenantId` | **COMPLETE** | Live elapsed time counter, GPS coordinate capture, status badge toggling. |
| **Leave Application & Quotas** | `/employee-dashboard.tsx` | `POST /leave/requests`<br>`GET /leave/requests` | `employee` | Strict `employeeId` + `tenantId` | **COMPLETE** | Modal to apply for leave (Casual, Sick, Annual), date range picker, automatic business day calculation. |
| **Payslip Downloads** | `/employee-dashboard.tsx` | `GET /payroll/payslips/my` | `employee` | Strict `employeeId` + `tenantId` | **COMPLETE** | Generates / downloads individual monthly payslip PDF with earnings, deductions, and PF/ESI breakdown. |
| **Personal Profile / Passport** | `/employee-details.tsx` | `GET /employees/:id` | `employee` | None (Admin view) | **FRONTEND ONLY / DEFECT** | Route `/employee-details` merely re-exports the entire admin `Employees` directory table! No dedicated personal profile view for an employee. |
| **Employee Dedicated Navigation** | `src/components/dreams-sidebar.tsx` | None | `employee` | None | **DEFECT / LEAK** | Employees see the **entire ERP sidebar** (Products, Ledgers, Accounting, POS, Purchases, Settings, etc.)! There is no role-based sidebar filter or dedicated ESS layout. |
| **My Timesheets** | Missing (`/timesheets`) | Backend endpoints exist in `projects.routes.ts` | `employee` | `tenantId` | **MISSING** | No employee timesheet logging interface exists in the frontend. |
| **My Assigned Tasks** | `/todo.tsx` vs `/projects.tsx` | `GET /projects` | `employee` | Tenant-wide | **PARTIAL** | `/todo.tsx` exists as a personal scratchpad, but does not synchronize with assigned `ProjectTask` items from project management. |
| **Document Vault & Policies** | `/documents.tsx` | `GET /documents` | `employee` | `tenantId` | **PARTIAL** | General document vault exists, but lacks employee-specific e-sign sign-off tracking. |

---

## 5. Portal 4: Client Portal Audit

### 5.1. Feature & Workflow Matrix

| Feature / Screen | Frontend Route & Component | Backend Route / Controller | Role & Permissions | Tenant Scoping | Implementation Status | Detailed Findings & Forensic Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Client Login Redirection** | `/auth.tsx` | `POST /auth/login` | `client` | Tenant-scoped | **CRITICAL DEFECT** | Clients logging in are redirected to `/dashboard` (Admin HRM), which immediately throws an Access Denied error. |
| **Client Dashboard** | `/client-dashboard.tsx`<br>`ClientDashboardPage` | `GET /api/projects`<br>`GET /api/invoices`<br>`GET /api/helpdesk/tickets` | `client` | **INSUFFICIENT ISOLATION** | **CRITICAL DEFECT** | Calls `/api/invoices` which requires `finance.invoices.view`. A client role fails with 403. If granted, `/api/invoices` queries `where: { tenantId }`, **leaking all invoices of all customers**! |
| **Client Navigation Shell** | `src/components/dreams-sidebar.tsx` | None | `client` | None | **DEFECT / LEAK** | A logged-in client is shown the complete Tenant Admin ERP sidebar (POS terminal, Ledgers, HR, Payroll, Settings). No dedicated Client Shell exists. |
| **Public Statement Lookup** | `/portal.tsx`<br>`CustomerPortalStatementPage` | `GET /invoices/public/client/statement?query=...` | Public (Unauthenticated) | Tenant / Customer Query | **COMPLETE WITH MOCK FALLBACK** | Public lookup by email/phone/invoice number. Successfully calls real API, but if 404 is returned, renders hardcoded fallback demo data for "Apex Enterprise Client". |
| **Public Invoice Viewer & Payment** | `/portal.invoices.$id.tsx`<br>`ClientInvoicePortalPage` | `GET /invoices/public/:id`<br>`POST /invoices/public/:id/pay` | Public (Token / ID) | Strict Invoice ID | **COMPLETE** | Clean customer-facing invoice review, line items, print/PDF button, direct Razorpay / UPI simulated payment flow that transitions invoice status. |
| **Public Proposal & Signing Portal** | `/portal.proposals.$id.tsx`<br>`ClientProposalPortalPage` | `GET /crm/proposals/public/:id`<br>`POST /crm/proposals/public/:id/respond` | Public (Token / ID) | Strict Proposal ID | **COMPLETE** | Formal quotation preview, digital signature dialog, accept/decline action, updates proposal status in MySQL. |
| **Dedicated Client Project Details** | Missing (`/portal/projects/:id`) | `GET /api/projects/:id` | `client` | Tenant-wide | **MISSING** | No dedicated client milestone tracking or project deliverables download screen. |

---

## 6. Synthesis & High-Priority Portal Remediation Items

1. **Fix Auth Redirection Logic (`src/routes/auth.tsx`)**:
   - Role `super_admin` -> redirect to `/super`
   - Role `client` -> redirect to `/client-dashboard`
   - Role `employee` -> redirect to `/employee-dashboard`
   - Role `tenant_admin` / `admin` / `manager` -> redirect to `/dashboard`
2. **Implement Client-Scoped Backend APIs**:
   - Create `GET /api/client/invoices`, `GET /api/client/projects`, `GET /api/client/tickets` that strictly query by `customerId` linked to `req.user.userId`.
3. **Dedicated Shells for Employee & Client**:
   - Conditionally render a compact, role-appropriate sidebar in `DreamsSidebar` or separate portal layout routes (`/_authenticated/_employee` and `/_authenticated/_client`) to prevent ERP navigation leaks.
4. **Wire Super Admin Telemetry & Transactions**:
   - Replace `SAMPLE_TELEMETRY` and `INITIAL_TRANSACTIONS` with real MySQL queries against `TenantSubscription` and `PaymentGatewayTransaction`.
