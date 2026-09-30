# Backend-to-Frontend API Mapping & Integration Audit

**Document Reference:** `BACKEND_TO_FRONTEND_API_MAPPING.md`  
**Audit Timestamp:** 2026-09-29T11:25:00+05:30  
**Scope:** Exhaustive Mapping of all 45 Backend Routers to Frontend Components, Portals, RBAC, and Integration Status  
**Standard Status Values:** `COMPLETE` | `PARTIAL` | `BACKEND ONLY` | `FRONTEND ONLY` | `MOCKED` | `MISSING` | `NEEDS VERIFICATION`  

---

## 1. Core Architecture & API Routing Topology

The backend Express application mounts 45 distinct routers with centralized middleware execution:
`Client Request` -> `requireAuth` -> `resolveTenantContext` -> `requirePermission / requireRole` -> `Prisma MySQL Transaction / Auto-Scoping` -> `Audit Activity Log` -> `Client Response`.

---

## 2. Comprehensive Module Mapping Directory

### 2.1. Super Admin & Platform Orchestration

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/super/stats`<br>`server/src/routes/super.routes.ts` | `/super/index.tsx`<br>`SuperOverview` | Super Admin<br>`super_admin` | Page Mount / 60s Polling | Req: Bearer token<br>Res: `{ totalTenants, totalUsers, mrr, storageGb }` | 4 Top KPI Cards | Skeletons; Toast on network error | **COMPLETE** |
| `GET /api/super/tenants`<br>`server/src/routes/super.routes.ts` | `/super/tenants.tsx`<br>`TenantsAdminStudio` | Super Admin<br>`super_admin` | Page Mount / Search Filter | Req: `?search=...`<br>Res: `Tenant[]` with counts | Paginated table of tenants with badges | Loading spinner; toast error | **COMPLETE** |
| `POST /api/super/tenants`<br>`server/src/routes/super.routes.ts` | `/super/tenants.tsx`<br>`CreateTenantDialog` | Super Admin<br>`super_admin` | Click "Provision Workspace" | Req: `{ name, slug, planId? }`<br>Res: `Tenant` | Inserts new tenant row | Toast "Tenant provisioned"; inline error | **COMPLETE** |
| `POST /api/super/impersonate/:id`<br>`server/src/routes/super.routes.ts` | `/super/index.tsx`, `/super/tenants.tsx` | Super Admin<br>`super_admin` | Click "Impersonate" | Req: Empty body<br>Res: `{ token, tenant }` | Sets token, redirects to `/dashboard`, shows amber banner | Toast "Logged into tenant"; error toast | **COMPLETE** |
| `POST /api/super/leave-impersonation`<br>`server/src/routes/super.routes.ts` | `/_authenticated/_app/route.tsx`<br>`AppShell` | Impersonating Super Admin | Click "Exit Impersonation" | Req: None<br>Res: `{ token }` | Restores super admin token, redirects `/super` | Toast "Returned to Super Admin" | **COMPLETE** |
| `GET /api/super/plans`<br>`server/src/routes/super.routes.ts` | `/super/plans.tsx`<br>`PlansMonetizationAdmin` | Super Admin<br>`super_admin` | Page Mount | Req: None<br>Res: `SubscriptionPlan[]` | Pricing cards and plan table | Empty state with "Add Plan" button | **COMPLETE** |
| `GET /api/super/roles`<br>`server/src/routes/super.routes.ts` | `/super/roles.tsx`<br>`RolesAdminStudio` | Super Admin<br>`super_admin` | Page Mount | Req: None<br>Res: `WorkspaceRole[]`, `Permission[]` | RBAC Matrix with permission toggles | Loading spinner; toast on save | **COMPLETE** |
| `None` (Expected: `GET /api/super/transactions`) | `/super/transactions.tsx`<br>`SuperTransactionsPage` | Super Admin<br>`super_admin` | Page Mount | None (Local state `INITIAL_TRANSACTIONS`) | Static table of 5 demo transactions | Mock filter; no real mutations | **MOCKED** |
| `None` (Expected: `GET /api/super/domains`) | `/super/domains.tsx`<br>`SuperDomainsPage` | Super Admin<br>`super_admin` | Page Mount | None (Local state `INITIAL_DOMAINS`) | Static table of 3 demo domains | Local state mutation only | **MOCKED** |

---

### 2.2. Authentication, Users & Tenant Context

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login`<br>`server/src/routes/auth.routes.ts` | `/auth.tsx`<br>`AuthPage` | All Portals<br>Unauthenticated | Submit Login Form | Req: `{ email, password }`<br>Res: `{ token, user }` or `{ requires2FA, mfaToken }` | Redirects to dashboard (unconditional) | Inline error, toast notification | **PARTIAL** (Redirect fails to differentiate 4 portals) |
| `POST /api/auth/verify-2fa`<br>`server/src/routes/auth.routes.ts` | `/verify-2fa.tsx`<br>`Verify2faPage` | All Portals | Submit 6-digit OTP | Req: `{ mfaToken, code }`<br>Res: `{ token, user }` | Authenticated session established | Resend countdown timer; toast on invalid code | **COMPLETE** |
| `GET /api/auth/me`<br>`server/src/routes/auth.routes.ts` | `src/lib/session.ts`<br>`useCurrentProfile` | Authenticated<br>All Portals | Query on load / token change | Req: Bearer token<br>Res: `{ id, email, fullName, tenant_id, roles, permissions }` | User avatar, active company, sidebar permissions | Dispatches 401 redirect if token invalid | **COMPLETE** |
| `GET /api/users`<br>`server/src/routes/workspace.routes.ts` | `/users.tsx`<br>`UsersAndRolesPage` | Tenant Admin<br>`admin` | Page Mount | Req: None<br>Res: `User[]` in tenant | Table of organization users with roles | Loading skeleton, invite user modal | **COMPLETE** |

---

### 2.3. Accounting, General Ledger & Financial Reports

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/accounting/dashboard`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.view` | Tab: "Overview" | Req: None<br>Res: `{ totalAssets, totalLiabilities, totalEquity, netIncome, recentEntries }` | 4 metric cards, Cash Flow chart | Shimmer loading; retry button | **COMPLETE** |
| `GET /api/accounting/accounts`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.view` | Tab: "Chart of Accounts" | Req: `?type=all`<br>Res: `ChartOfAccount[]` (auto-seeds 17 accounts) | Searchable accounts list with balances | Add account dialog; edit modal | **COMPLETE** |
| `POST /api/accounting/journal-entries`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`NewJournalDialog` | Tenant Admin / Finance<br>`accounting.create` | Submit Journal Entry | Req: `{ entryDate, reference, description, items: [...] }`<br>Res: `JournalEntry` | Adds entry to table; checks debit == credit | Validates open fiscal period; toast confirmation | **COMPLETE** |
| `POST /api/accounting/journal-entries/:id/void`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.void` | Click "Void Entry" | Req: `{ reason }`<br>Res: `{ voidEntry, contraEntry }` | Appends "VOIDED" badge; creates contra entry | Dialog confirmation; period validation | **COMPLETE** |
| `GET /api/accounting/reports/trial-balance`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.reports` | Tab: "Trial Balance" | Req: `?fiscalYearId=...`<br>Res: `{ rows: [...], totalDebit, totalCredit, isBalanced }` | Tabular trial balance with balanced indicator | Export CSV / PDF button | **COMPLETE** |
| `GET /api/accounting/reports/profit-loss`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.reports` | Tab: "Profit & Loss" | Req: `?startDate=...&endDate=...`<br>Res: `{ revenues: [...], expenses: [...], netIncome }` | Statement of Profit & Loss | Dynamic currency formatting | **COMPLETE** |
| `GET /api/accounting/reports/balance-sheet`<br>`server/src/routes/accounting.routes.ts` | `/accounting.tsx`<br>`AccountingAppSuite` | Tenant Admin / Finance<br>`accounting.reports` | Tab: "Balance Sheet" | Req: `?asOfDate=...`<br>Res: `{ assets, liabilities, equity, totalLiabilitiesAndEquity }` | Standard Balance Sheet with equation match | Export button | **COMPLETE** |

---

### 2.4. Inventory, Products, Transfers & Adjustments

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/products`<br>`server/src/routes/products.routes.ts` | `/products.tsx`<br>`Products` | Tenant Admin<br>`inventory.products.view` | Page Mount / Search | Req: `?search=...`<br>Res: `Product[]` with warehouses | Product grid / table with stock badges | Barcode scan, low stock alert banner | **COMPLETE** |
| `POST /api/products`<br>`server/src/routes/products.routes.ts` | `/products.tsx`<br>`NewProductModal` | Tenant Admin<br>`inventory.products.create` | Submit Add Product Form | Req: `{ name, sku, barcode, cost, price, initialStock, warehouseId }`<br>Res: `Product` | Appends to product catalog | Validates unique SKU; toast confirmation | **COMPLETE** |
| `GET /api/transfers`<br>`server/src/routes/transfers.routes.ts` | `/transfers.tsx`<br>`StockTransfersPage` | Tenant Admin<br>`inventory.transfers.manage` | Page Mount | Req: None<br>Res: `StockTransfer[]` | Table of transfers with status badges | New transfer dialog | **COMPLETE** |
| `POST /api/transfers`<br>`server/src/routes/transfers.routes.ts` | `/transfers.tsx`<br>`NewTransferModal` | Tenant Admin<br>`inventory.transfers.manage` | Submit Stock Transfer | Req: `{ fromWarehouseId, toWarehouseId, items: [...] }`<br>Res: `StockTransfer` | Creates transfer in "IN_TRANSIT" status | Validates sufficient source stock; toast error | **COMPLETE** |
| `POST /api/transfers/:id/receive`<br>`server/src/routes/transfers.routes.ts` | `/transfers.tsx`<br>`StockTransfersPage` | Tenant Admin<br>`inventory.transfers.manage` | Click "Receive Transfer" | Req: None<br>Res: `StockTransfer` (status: "COMPLETED") | Increments destination stock via `StockMovement` | Disables button; toast "Stock received" | **COMPLETE** |
| `GET /api/adjustments`<br>`server/src/routes/adjustments.routes.ts` | `/adjustments.tsx`<br>`StockAdjustmentsPage` | Tenant Admin<br>`inventory.adjustments.manage` | Page Mount | Req: None<br>Res: `StockAdjustment[]` | Audit table with reasons and quantity diffs | New adjustment dialog | **COMPLETE** |
| `POST /api/adjustments`<br>`server/src/routes/adjustments.routes.ts` | `/adjustments.tsx`<br>`NewAdjustmentModal` | Tenant Admin<br>`inventory.adjustments.manage` | Submit Adjustment Form | Req: `{ warehouseId, reason, items: [...] }`<br>Res: `StockAdjustment` | Recomputes physical stock, creates movements | Toast "Adjustment recorded and posted" | **COMPLETE** |

---

### 2.5. Purchases, Procurement & Suppliers

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/purchases`<br>`server/src/routes/purchases.routes.ts` | `/purchases.tsx`<br>`PurchasesPage` | Tenant Admin<br>`purchases.view` | Page Mount | Req: None<br>Res: `Purchase[]` with supplier & details | PO list, total amount, payment/received status | Shimmer loading; search bar | **COMPLETE** |
| `POST /api/purchases`<br>`server/src/routes/purchases.routes.ts` | `/purchases.tsx`<br>`NewPurchaseModal` | Tenant Admin<br>`purchases.create` | Submit Purchase Order | Req: `{ supplierId, warehouseId, items: [...] }`<br>Res: `Purchase` | Adds PO; generates AP ledger entry | Toast confirmation; validation errors | **COMPLETE** |
| `POST /api/purchases/:id/receive`<br>`server/src/routes/purchases.routes.ts` | `/purchases.tsx`<br>`PurchasesPage` | Tenant Admin<br>`purchases.receive` | Click "Goods Receipt (Inward)" | Req: None<br>Res: `Purchase` (status: "received") | Updates stock atomically in warehouse | Toast "Inventory incremented" | **COMPLETE** |
| `POST /api/purchases/:id/payments`<br>`server/src/routes/purchases.routes.ts` | `/purchases.tsx`<br>`PurchasePaymentModal` | Tenant Admin<br>`purchases.pay` | Submit Supplier Payment | Req: `{ amount, paymentMethod, reference }`<br>Res: `PurchasePayment` | Updates paid amount, reduces AP balance | Decrements AP account; toast confirmation | **COMPLETE** |
| `GET /api/suppliers`<br>`server/src/routes/suppliers.routes.ts` | `/suppliers.tsx`<br>`SuppliersPage` | Tenant Admin<br>`suppliers.view` | Page Mount | Req: None<br>Res: `Supplier[]` | Directory of suppliers, phone, email, AP | Search filter; add supplier modal | **COMPLETE** |

---

### 2.6. Sales, POS Terminal, Invoices & Returns

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/invoices/pos`<br>`server/src/routes/invoices.routes.ts` | `/pos.tsx`<br>`PointOfSaleTerminal` | Cashier / Tenant Admin<br>`pos.terminal.access` | Complete Checkout | Req: `{ items, total, customerId, paymentMode }`<br>Res: `{ id, receiptNo, total }` | Generates receipt dialog; prints thermal ticket | Atomic stock check; 409 on insufficient stock | **COMPLETE** |
| `GET /api/invoices`<br>`server/src/routes/invoices.routes.ts` | `/invoices.tsx`<br>`InvoicesPage` | Tenant Admin<br>`finance.invoices.view` | Page Mount | Req: None<br>Res: `Sale[]` formatted as invoices | Invoices table, due dates, customer names, status | Filter by status; export CSV | **COMPLETE** |
| `POST /api/invoices`<br>`server/src/routes/invoices.routes.ts` | `/invoices.tsx`<br>`NewInvoiceModal` | Tenant Admin<br>`finance.invoices.create` | Submit B2B Invoice | Req: `{ customerId, lines, taxMode, dueDate }`<br>Res: `Sale` | Appends invoice, auto-posts GL entry | Toast confirmation; invalid lines flagged | **COMPLETE** |
| `GET /api/invoices/public/:id`<br>`server/src/routes/invoices.routes.ts` | `/portal.invoices.$id.tsx`<br>`ClientInvoicePortalPage` | Client / Public<br>Unauthenticated | Open Shared Invoice Link | Req: None<br>Res: `Sale` with details & payments | Clean customer invoice, PDF/Print, Pay button | 404 state if invoice not found | **COMPLETE** |
| `POST /api/invoices/public/:id/pay`<br>`server/src/routes/invoices.routes.ts` | `/portal.invoices.$id.tsx`<br>`ClientInvoicePortalPage` | Client / Public<br>Unauthenticated | Click "Pay Now via Gateway" | Req: `{ paymentMethod, transactionId }`<br>Res: `{ success, payment }` | Updates invoice status to "paid" | Toast "Payment confirmed! Receipt updated" | **COMPLETE** |
| `GET /api/invoices/public/client/statement`<br>`server/src/routes/invoices.routes.ts` | `/portal.tsx`<br>`CustomerPortalStatementPage` | Client / Public<br>Unauthenticated | Search Phone/Email/Invoice | Req: `?query=...`<br>Res: `{ customer, invoices, summary }` | Statement of Account table with balances | Fallback demo data if DB returns 404 | **COMPLETE** (Has mock fallback) |
| `GET /api/returns/sales`<br>`server/src/routes/returns.routes.ts` | `/returns.tsx`<br>`ReturnsManagementPage` | Tenant Admin<br>`sales.returns.manage` | Tab: "Sales Returns" | Req: None<br>Res: `SalesReturn[]` with credit notes | Table of returns, reasons, refunded amounts | Issue Credit Note button | **COMPLETE** |
| `POST /api/returns/sales`<br>`server/src/routes/returns.routes.ts` | `/returns.tsx`<br>`NewSalesReturnModal` | Tenant Admin<br>`sales.returns.manage` | Submit Return Form | Req: `{ saleId, customerId, items, restock }`<br>Res: `SalesReturn` | Creates return, generates Credit Note, restocks | Toast confirmation; GL contra-posting | **COMPLETE** |
| `GET /api/returns/purchases`<br>`server/src/routes/returns.routes.ts` | `/returns.tsx`<br>`ReturnsManagementPage` | Tenant Admin<br>`purchases.returns.manage` | Tab: "Purchase Returns" | Req: None<br>Res: `PurchaseReturn[]` with debit notes | Table of purchase returns to suppliers | Issue Debit Note button | **COMPLETE** |

---

### 2.7. CRM, Deals & Proposals

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/crm/leads`<br>`server/src/routes/crm.routes.ts` | `/crm.tsx`<br>`CRM` | Tenant Admin / Sales<br>`crm.leads.view` | Page Mount | Req: None<br>Res: `CrmLead[]` | Kanban columns (`new`, `qualified`, `proposal`, `won`, `lost`) | Drag and drop card movement | **COMPLETE** |
| `POST /api/crm/leads`<br>`server/src/routes/crm.routes.ts` | `/crm.tsx`<br>`NewLeadModal` | Tenant Admin / Sales<br>`crm.leads.create` | Submit Add Lead | Req: `{ title, contactName, email, value, stage }`<br>Res: `CrmLead` | Appends lead to active pipeline | Toast confirmation; validation errors | **COMPLETE** |
| `POST /api/crm/proposals`<br>`server/src/routes/crm.routes.ts` | `/proposals.tsx`<br>`NewProposalModal` | Tenant Admin / Sales<br>`crm.proposals.create` | Submit Proposal Form | Req: `{ title, clientName, clientEmail, items, amount }`<br>Res: `CrmProposal` | Inserts proposal into master list | Toast confirmation; share link button | **COMPLETE** |
| `POST /api/crm/proposals/:id/convert`<br>`server/src/routes/crm.routes.ts` | `/proposals.tsx`<br>`ProposalsPage` | Tenant Admin / Sales<br>`crm.proposals.convert` | Click "Convert to Invoice" | Req: None<br>Res: `{ sale, invoiceNo }` | Converts proposal to formal Wave 3 invoice | Redirects to `/invoices`; auto-posts ledger | **COMPLETE** |
| `GET /api/crm/proposals/public/:id`<br>`server/src/routes/crm.routes.ts` | `/portal.proposals.$id.tsx`<br>`ClientProposalPortalPage` | Client / Public<br>Unauthenticated | Open Proposal Link | Req: None<br>Res: `{ proposal: CrmProposal }` | Official quotation view with itemized terms | Accept / Decline action buttons | **COMPLETE** |
| `POST /api/crm/proposals/public/:id/respond`<br>`server/src/routes/crm.routes.ts` | `/portal.proposals.$id.tsx`<br>`ClientProposalPortalPage` | Client / Public<br>Unauthenticated | Submit Signature Dialog | Req: `{ action: "accept", signatureName }`<br>Res: `{ message }` | Updates status to "accepted"; locks proposal | Toast "Quotation accepted! Thank you." | **COMPLETE** |

---

### 2.8. Project Management & Taskly

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/projects`<br>`server/src/routes/projects.routes.ts` | `/projects.tsx`<br>`ProjectsPage` | Tenant Admin / Project Team<br>`projects.view` | Page Mount | Req: None<br>Res: `{ projects: Project[], tasks: ProjectTask[] }` | Project overview cards; Task Kanban board | Drag and drop task status update | **COMPLETE** |
| `POST /api/projects`<br>`server/src/routes/projects.routes.ts` | `/projects.tsx`<br>`NewProjectModal` | Tenant Admin<br>`projects.create` | Submit Add Project | Req: `{ name, description, budget, clientName }`<br>Res: `Project` | Adds project to directory | Toast confirmation; validation errors | **COMPLETE** |
| `POST /api/projects/:id/tasks`<br>`server/src/routes/projects.routes.ts` | `/projects.tsx`<br>`NewTaskModal` | Project Team<br>`projects.tasks.create` | Submit Add Task | Req: `{ title, description, priority, assignee, dueDate }`<br>Res: `ProjectTask` | Appends task to Kanban "To Do" column | Toast confirmation | **COMPLETE** |
| `None` (Expected: `/api/projects/:id/milestones`) | `/projects.tsx` | Tenant Admin | Missing | None | Missing Milestone management UI | Planned for Wave 4 Step 4.3 | **MISSING** |
| `None` (Expected: `/api/projects/:id/bugs`) | `/projects.tsx` | Developer / QA | Missing | None | Missing Defect / Bug tracking UI | Planned for Wave 4 Step 4.5 | **MISSING** |
| `None` (Expected: `/api/projects/timesheets`) | Missing (`/timesheets.tsx`) | Employee / Contractor | Missing | None | Missing Timesheet logging UI | Planned for Wave 4 Step 4.6 | **MISSING** |

---

### 2.9. HRMS Core, Attendance, Payroll & Compliance

| Backend Router & Endpoint | Frontend Page & Component | Portal & Role | Triggering UI Action | Request / Response Payload | Data Displayed | Feedback & Error Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/employees`<br>`server/src/routes/employees.routes.ts` | `/employees.tsx`<br>`Employees` | Tenant Admin / HR<br>`hrm.employees.view` | Page Mount | Req: None<br>Res: `Employee[]` with departments & salary | Full employee directory with status badges | Passport drawer; seat limit validation | **COMPLETE** |
| `POST /api/attendance/check-in`<br>`server/src/routes/attendance.routes.ts` | `/employee-dashboard.tsx`<br>`/attendance.tsx` | Employee / HR<br>`hrm.attendance.punch` | Click "Punch In" | Req: `{ latitude?, longitude?, notes? }`<br>Res: `Attendance` | Starts timer, sets status to "present" | Toast "Checked in successfully" | **COMPLETE** |
| `GET /api/leave/requests`<br>`server/src/routes/leave.routes.ts` | `/leave.tsx`<br>`Leave` | HR / Manager<br>`hrm.leave.view` | Page Mount | Req: None<br>Res: `LeaveRequest[]` | Table of pending/approved leave requests | Approve / Reject action buttons | **COMPLETE** |
| `POST /api/payroll/runs`<br>`server/src/routes/payroll.routes.ts` | `/payroll.tsx`<br>`PayrollPage` | HR / Finance<br>`hrm.payroll.run` | Click "Execute Payroll Run" | Req: `{ month, year }`<br>Res: `{ payrollRun, payslipsCount }` | Computes salary components & statutory dues | Progress bar; toast on completion | **COMPLETE** |
| `GET /api/compliance/forms/:type`<br>`server/src/routes/compliance.routes.ts` | `/payroll.tsx`<br>`PayrollPage` | HR / Compliance<br>`hrm.compliance.view` | Click "Download Form 16 / 24Q" | Req: Form code<br>Res: PDF Stream (`verified_statutory_pdfs_v2`) | Downloads verified statutory PDF | Browser download trigger | **COMPLETE** |
| `GET /api/assets`<br>`server/src/routes/assets.routes.ts` | `/assets.tsx`<br>`AssetsPage` | Asset Manager<br>`assets.view` (Addon) | Page Mount | Req: None<br>Res: `Asset[]` | Equipment directory with QR code tags | Print QR dialog; custody assignment | **COMPLETE** |
| `GET /api/okr/cycles`<br>`server/src/routes/okr.routes.ts` | `/okr.tsx`<br>`OkrPage` | Management<br>`okr.view` (Addon) | Page Mount | Req: None<br>Res: `OkrCycle[]` with objectives | Tree view of corporate and team goals | Progress sliders; check-in history | **COMPLETE** |

---

## 3. Disconnected APIs & Architectural Inconsistencies Summary

1. **Missing Backend APIs**:
   - `GET /api/client/invoices` (client-scoped invoice list)
   - `GET /api/client/projects` (client-scoped projects list)
   - `GET /api/client/tickets` (client-scoped ticket list)
   - `GET /api/super/transactions` (real query against `PaymentGatewayTransaction`)
   - `GET /api/super/domains` (custom domain configuration and SSL verification)
   - `GET /api/projects/timesheets` (billable hours tracking)
2. **Missing Frontend Routes**:
   - `/timesheets.tsx` (Timesheet logging and approval screen)
   - `/portal/projects/$id.tsx` (Client project detail and deliverables passport)
   - Dedicated `/employee/profile.tsx` (Dedicated ESS personal passport)
3. **Mocked Frontend Screens**:
   - `/super/transactions.tsx` (Renders `INITIAL_TRANSACTIONS`)
   - `/super/domains.tsx` (Renders `INITIAL_DOMAINS`)
   - `/super/analytics.tsx` (Renders `SAMPLE_TELEMETRY`)
   - `/leave.tsx` (Holiday calendar tab uses `localStorage`, not database)
