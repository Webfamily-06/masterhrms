# WORKSPACE DATABASE AUDIT
## Comprehensive Workspace-Wide Audit of Data Persistence, Models, and APIs

---

## 1. Executive Summary

This audit establishes the baseline data persistence state across the entire Master HRMS & ERP workspace, covering:
- **206 Frontend Routes** (`src/routes/**/*.tsx`)
- **57 Backend API Routers** (`server/src/routes/*.ts`)
- **158 Prisma Relational Models** (`server/prisma/schema.prisma`)
- **MySQL/MariaDB Relational Database Schema** (`master_hrms`)

### Core Findings:
1. **Core Relational Engine Strength**:
   - The primary business domains (Employee Directory, Biometric Ingestion, Attendance, Leave Management, Payroll DAG Engine, Bank Disbursement, Statutory ECR/ESIC, Invoicing, Inventory, CRM, Accounting/GL) are backed by 158 robust relational Prisma models.
2. **Identified In-Memory / LocalStorage Business Records**:
   - **Todo Tracker (`/todo`)**: Persisted only in browser `localStorage` with a fallback `INITIAL_TODOS` array of 4 hardcoded items. No Prisma model or backend API existed.
   - **Workspace Notes (`/notes`)**: Persisted only in browser `localStorage` with a fallback `INITIAL_NOTES` array of 3 hardcoded items. No Prisma model or backend API existed.
   - **Calendar Events (`/calendar`)**: Stored events in browser `localStorage` (`hrms_calendar_events_${tenantId}`).
3. **Identified Static Mock Dashboards & Chart Series**:
   - **6 Dashboards** (`crm-dashboard.tsx`, `it-admin-dashboard.tsx`, `procurement-dashboard.tsx`, `project-dashboard.tsx`, `recruitment-dashboard.tsx`, `support-dashboard.tsx`) contained static hardcoded currency values (e.g. `$125,000`, `$154,000`), hardcoded tables, and dead template links (`.html`).
   - **4 AI Insights Pages** (`ai-attendance-insights.tsx`, `ai-payroll-forecast.tsx`, `ai-team-performance-insights.tsx`, `learning-analytics.tsx`) rendered hardcoded mock series rather than querying real aggregated attendance, payroll, OKR, and course records.

---

## 2. Inventory of Subsystems & Data Persistence State

| Business Module | Primary Frontend Pages | Backend API Router | Prisma Relational Model(s) | Persistence State | Audit Finding |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Employee Directory** | `/employees`, `/employee-details` | `employees.routes.ts` | `Employee`, `Department`, `Designation`, `Branch` | **DB-Backed** | Full CRUD, multi-tenant. |
| **Attendance & Biometrics** | `/attendance`, `/biometric` | `attendance.routes.ts`, `biometric.routes.ts` | `Attendance`, `BiometricDevice`, `BiometricPunchLog`, `BiometricEmployeeMapping` | **DB-Backed** | Push webhooks, deduplication. |
| **Leave & Holidays** | `/leave`, `/holidays` | `leave.routes.ts` | `LeaveRequest`, `LeaveType` | **DB-Backed** | Approval workflows, balance tracking. |
| **Advanced Payroll (Phase 1 & 2)** | `/payroll`, `/payroll-dashboard` | `payroll.routes.ts`, `bank-disbursement.routes.ts`, `statutory-returns.routes.ts` | `PayrollRun`, `Payslip`, `BankDisbursementBatch`, `StatutoryReturnFiling` | **DB-Backed** | Pure Decimal DAG, ICICI/HDFC/SBI, ECR 2.0. |
| **Reimbursements & FBP** | `/expenses`, `/payroll` | `expenses.routes.ts`, `fbp.routes.ts` | `ExpenseClaim`, `ExpenseCategory`, `FbpDeclaration` | **DB-Backed** | Two-tier approval, OCR, payslip injection. |
| **Invoicing & Sales POS** | `/invoices`, `/pos`, `/sales-dashboard` | `invoices.routes.ts`, `sales.routes.ts` | `Sale`, `SaleDetail`, `SalePayment`, `Customer` | **DB-Backed** | Realtime ledger posting. |
| **Inventory & Warehouses** | `/products`, `/transfers`, `/adjustments` | `products.routes.ts`, `transfers.routes.ts`, `adjustments.routes.ts` | `Product`, `Warehouse`, `StockMovement`, `ProductWarehouse` | **DB-Backed** | Pessimistic locking, multi-warehouse. |
| **Purchasing & Procurement** | `/purchases`, `/suppliers`, `/procurement-dashboard` | `purchases.routes.ts`, `suppliers.routes.ts` | `Purchase`, `PurchaseDetail`, `Supplier` | **Partial** | Purchases & Suppliers are DB-backed; `/procurement-dashboard` had static HTML cards. |
| **CRM & Leads** | `/pipeline`, `/proposals`, `/crm-dashboard` | `crm.routes.ts`, `dashboard.routes.ts` | `CrmLead`, `CrmProposal`, `CrmContact` | **Partial** | Leads & Proposals DB-backed; `/crm-dashboard` had static HTML with fake stats. |
| **Projects & Task Board** | `/projects`, `/tasks`, `/task-board`, `/project-dashboard` | `projects.routes.ts` | `Project`, `ProjectTask` | **Partial** | Projects & Tasks DB-backed; `/project-dashboard` had static HTML cards. |
| **Helpdesk & Support** | `/helpdesk`, `/support-dashboard` | `helpdesk.routes.ts` | `HelpdeskTicket`, `HelpdeskComment` | **Partial** | Tickets DB-backed; `/support-dashboard` had static HTML cards. |
| **IT Asset Management** | `/assets`, `/it-admin-dashboard` | `assets.routes.ts` | `Asset`, `AssetCategory`, `AssetAssignment` | **Partial** | Assets DB-backed; `/it-admin-dashboard` had static cards. |
| **Recruitment & Hiring** | `/recruitment`, `/recruitment-dashboard` | `recruitment.routes.ts` | `JobPosting`, `JobCandidate` | **Partial** | Postings & Candidates DB-backed; `/recruitment-dashboard` had static cards. |
| **Todo Tracker** | `/todo` | *None* (Missing) | *None* (Missing) | **Local/Mock** | Relied on `INITIAL_TODOS` and `localStorage`. |
| **Workspace Notes** | `/notes` | *None* (Missing) | *None* (Missing) | **Local/Mock** | Relied on `INITIAL_NOTES` and `localStorage`. |
| **Calendar Events** | `/calendar` | *None* (Missing) | *None* (Missing) | **Local/Mock** | Relied on `localStorage`. |
| **AI Insights Suite** | `/ai-attendance-insights`, `/ai-payroll-forecast`, `/ai-team-performance-insights`, `/learning-analytics` | *None* (Missing) | `Attendance`, `PayrollRun`, `OkrObjective`, `CourseEnrollment` | **Mock Series** | Rendered static mock chart series arrays. |

---

## 3. Database Integrity & Tenant Isolation Verification
- Database engine: MySQL / MariaDB (`master_hrms`).
- All 158 existing models feature `tenantId` indexing and composite foreign keys.
- Application layer tenant proxy (`prisma-proxy.facade.ts`) enforces fail-closed behavior for tenant-isolated models.
- New models must be integrated into `server/src/config/tenant-models.config.ts`.
