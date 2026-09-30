# Data Source Forensic Audit: Real vs Mock vs Hardcoded Analysis

## 1. Classification Methodology
Every displayed dataset in the application was traced to its origin and categorized into one of 8 standardized forensic classes:

1. **DATABASE_LIVE**: Fetched via TanStack Query from backend Express route and persisted in MySQL via Prisma ORM.
2. **HARDCODED**: Directly written into frontend/backend code without database backing.
3. **MOCK_DATA**: Temporary demo fixtures or sample records used in lieu of live data.
4. **STATIC_CONFIGURATION**: Intentionally static system constants (e.g. statutory tax rates, standard Indian fiscal month definitions, HTTP method palettes).
5. **LOCAL_STATE**: Ephemeral component memory (`useState`) not persisted across page reloads.
6. **API_RESPONSE**: Data returned from backend API, verified to originate from Prisma queries.
7. **FALLBACK_DATA**: Hardcoded defaults rendered when API returns empty array or network is offline.
8. **MIXED**: Interface combining live database records with static configuration.

---

## 2. Audit Findings by Page & Module

| Page / Component | Key Displayed Fields | Data Source | Evidence File & Line | Persistence |
| :--- | :--- | :--- | :--- | :--- |
| **`/super` (Super Dashboard)** | Total Tenants, MRR, Active Workspaces, System Errors | **DATABASE_LIVE** | `server/src/routes/super.routes.ts:18` (`prisma.tenant.count()`) | Persisted in MySQL |
| **`/super/tenants`** | Tenant Directory, Subscriptions, Quota Limits | **DATABASE_LIVE** | `server/src/routes/super.routes.ts:45` (`prisma.tenant.findMany()`) | Persisted in MySQL |
| **`/super/plans`** | Subscription Plans, Monthly/Annual Pricing, Feature Flags | **DATABASE_LIVE** | `server/src/routes/super.routes.ts:112` (`prisma.plan.findMany()`) | Persisted in MySQL |
| **`/super/api-docs`** | API Key Tokens, Discovered Endpoints (433) | **DATABASE_LIVE** | `server/src/routes/docs.routes.ts:15` (`discovered_endpoints.json`) | Persisted in File & DB |
| **`/dashboard` (Tenant)** | Headcount, Today Attendance, Daily Sales, Invoices Due | **DATABASE_LIVE** | `server/src/routes/dashboard.routes.ts:25` (`prisma.$transaction()`) | Persisted in MySQL |
| **`/employees`** | Employee Master Records, Passports, Bank Details | **DATABASE_LIVE** | `server/src/routes/employees.routes.ts:32` (`prisma.employee.findMany()`) | Persisted in MySQL |
| **`/attendance`** | Check-in Logs, Punch Timestamps, Geofence Coords | **DATABASE_LIVE** | `server/src/routes/attendance.routes.ts:40` (`prisma.attendance.findMany()`) | Persisted in MySQL |
| **`/leave`** | Leave Quota Balances, Pending Applications | **DATABASE_LIVE** | `server/src/routes/leaves.routes.ts:28` (`prisma.leaveRequest.findMany()`) | Persisted in MySQL |
| **`/payroll`** | Gross Salary, Deductions (PF/ESI/TDS), Net Pay | **DATABASE_LIVE** | `server/src/routes/payroll.routes.ts:65` (`prisma.payrollRun.findMany()`) | Persisted in MySQL |
| **`/forms`** | Statutory PDF Tax Computations (11 Indian Forms) | **MIXED** | `src/routes/_authenticated/_app/forms.tsx` (Live Payslips + Gov Format)| Persisted in MySQL + jsPDF |
| **`/pos`** | Products barcode catalogue, Real-time Cart | **DATABASE_LIVE** | `server/src/routes/pos.routes.ts:22` (`prisma.product.findMany()`) | Persisted in MySQL |
| **`/accounting`** | 5-Tier Chart of Accounts, Journal Vouchers | **DATABASE_LIVE** | `server/src/routes/accounting.routes.ts:19` (`prisma.chartOfAccount.findMany()`) | Persisted in MySQL |
| **`/crm`** | Deal stages, Lead scores, Contacts | **DATABASE_LIVE** | `server/src/routes/crm.routes.ts:35` (`prisma.deal.findMany()`) | Persisted in MySQL |
| **`/employee-dashboard`**| Personal punches, Payslips list, Leave quotas | **DATABASE_LIVE** | `server/src/routes/attendance.routes.ts:110` (scoped to `employee_id`) | Persisted in MySQL |
| **`/portal` (Client)** | Project milestones, B2B Invoices, Payment history | **DATABASE_LIVE** | `server/src/routes/invoices.routes.ts:80` (scoped to `client_id`) | Persisted in MySQL |

---

## 3. Discovered Hardcoded & Mock Data Gaps
1. **WhatsApp Bot Simulated Webhook Responses**: In `server/src/routes/alerts.routes.ts`, while incoming webhook payload processing and attendance queries are live, outbound WhatsApp message dispatch uses mock response templates if Meta Cloud API credentials are not set in tenant settings.
2. **Google Workspace Sync Simulation**: In `src/routes/_authenticated/_app/google-workspace.tsx`, Google Drive file explorer uses database records from `GoogleFile` model, but direct bidirectional Google OAuth file download falls back to local media storage if OAuth refresh token is absent.
