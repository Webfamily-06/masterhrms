# Dashboard Data Integration & Realtime API Verification Audit

**Document Reference:** `DASHBOARD_DATA_INTEGRATION_AUDIT.md`  
**Audit Timestamp:** 2026-09-29T11:30:00+05:30  
**Scope:** Forensic Verification of Dashboard Cards, Charts, Tables, and Data Pipelines (Real MySQL vs. Mock Data)  

---

## 1. Executive Summary

A critical constitutional requirement is ensuring that all dashboard cards, charts, feeds, and indicators reflect real, tenant-scoped database records from MySQL rather than hardcoded mock fixtures.

Our audit inspected the complete data lifecycle:
`Frontend Component` -> `useQuery Hook & Query Key` -> `api.get HTTP Request` -> `Express Router Middleware` -> `Prisma ORM Query` -> `MySQL Database Information Schema` -> `Data Transformation` -> `UI Rendering`.

### High-Level Dashboard Reality Scorecard

| Dashboard | Portal | Data Source | Tenant Scoping | Stale Time / Refetch | Reality Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin Command Center** (`/super`) | Super Admin | MySQL (`super.routes.ts`) | Platform Global | 60s / Window Focus | **100% REAL PERSISTED DATA** |
| **HRM Main Dashboard** (`/dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 15s Polling Interval | **100% REAL PERSISTED DATA** |
| **POS Dashboard** (`/pos-dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 30s Polling Interval | **100% REAL PERSISTED DATA** |
| **Inventory Dashboard** (`/inventory-dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 30s Polling Interval | **100% REAL PERSISTED DATA** |
| **Finance Dashboard** (`/finance-dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 30s Polling Interval | **100% REAL PERSISTED DATA** |
| **Sales CRM Dashboard** (`/crm-dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 30s Polling Interval | **100% REAL PERSISTED DATA** |
| **Project Dashboard** (`/project-dashboard`) | Tenant Admin | MySQL (`dashboard.routes.ts`) | Strict `tenant_id` | 30s Polling Interval | **100% REAL PERSISTED DATA** |
| **Employee Self-Service** (`/employee-dashboard`) | Employee | MySQL (Composite APIs) | Strict `employeeId` | Dynamic Refetch | **100% REAL PERSISTED DATA** |
| **Client Portal Dashboard** (`/client-dashboard`) | Client | MySQL (Admin APIs) | **UNSCOPED / LEAK RISK** | Dynamic Refetch | **DATABASE BACKED BUT INSECURE** |
| **Super Admin Platform Telemetry** (`/super/analytics`) | Super Admin | Local Static State | None | None | **0% MOCKED (`SAMPLE_TELEMETRY`)** |
| **Super Admin Transactions** (`/super/transactions`) | Super Admin | Local Static State | None | None | **0% MOCKED (`INITIAL_TRANSACTIONS`)** |
| **Public Customer Statement** (`/portal`) | Public / Client | MySQL with Demo Fallback | Customer Query | Dynamic Refetch | **REAL DATA WITH MOCK FALLBACK** |

---

## 2. In-Depth Verification by Portal & Dashboard

### 2.1. Super Admin Command Center (`src/routes/_authenticated/super/index.tsx`)

#### A. Data Pipeline & Query Keys
- **Query Key:** `["super-realtime-stats"]`
- **API Endpoint:** `Promise.all([api.get("/super/stats"), api.get("/super/tenants"), api.get("/cms/addons"), api.get("/cms/pages/system-platform-settings")])`
- **Backend Controller:** [server/src/routes/super.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/super.routes.ts) (`lines 23–85`)

#### B. Trace to MySQL Database
```typescript
// server/src/routes/super.routes.ts lines 27-44:
const [totalTenants, totalUsers, activeSubscriptions, recentTenants] = await Promise.all([
  prisma.tenant.count(),
  prisma.profile.count(),
  prisma.tenantSubscription.count({ where: { status: "active" } }),
  prisma.tenant.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { subscription: true } })
]);
```
- **Total Tenants Card:** Renders `stats.totalTenants` directly from `SELECT COUNT(*) FROM tenants`.
- **Total Users Card:** Renders `stats.totalUsers` directly from `SELECT COUNT(*) FROM profiles`.
- **Active Subscriptions:** Evaluates active tenants against `subscription_plans`.
- **Tenant Directory Table:** Direct mapped array of database `tenants` with active employee counts.
- **Verdict:** **100% REAL PERSISTED DATA**.

---

### 2.2. Tenant Admin HRM Dashboard (`src/routes/_authenticated/_app/dashboard.tsx`)

#### A. Data Pipeline & Query Keys
- **Query Key:** `['dashboard-hrm-realtime-data']`
- **API Endpoint:** `GET /dashboard/hrm`
- **Backend Controller:** [server/src/routes/dashboard.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/dashboard.routes.ts) (`lines 135–220`)
- **Polling Frequency:** 15,000ms (15s automatic background invalidation).

#### B. Trace to MySQL Database
```typescript
// server/src/routes/dashboard.routes.ts lines 145-180:
const [totalWorkforce, newThisMonth, todayAttendance, onLeaveToday, departments, salaryAgg] = await Promise.all([
  prisma.employee.count({ where: { tenantId } }),
  prisma.employee.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
  prisma.attendance.findMany({ where: { tenantId, date: todayUtc } }),
  prisma.leaveRequest.count({ where: { tenantId, status: "approved", startDate: { lte: todayUtc }, endDate: { gte: todayUtc } } }),
  prisma.department.findMany({ where: { tenantId }, include: { _count: { select: { employees: true } } } }),
  prisma.employee.aggregate({ where: { tenantId }, _sum: { salary: true }, _avg: { salary: true } }),
]);
```
- **Workforce KPI:** Returns exact `COUNT(id)` from `employees` where `tenant_id = :tenantId`.
- **Attendance Rate Donut Chart:** `(presentCount / totalWorkforce) * 100` dynamically calculated from today's punches in `attendances`.
- **Department Distribution Chart:** Dynamic series built from `departments` and linked `employees`.
- **Total Payroll & Average Salary:** `salaryAgg._sum.salary` and `salaryAgg._avg.salary` from MySQL decimal values.
- **Export Functionality:** `handleExport()` dynamically serializes live state into CSV.
- **Verdict:** **100% REAL PERSISTED DATA**.

---

### 2.3. Point of Sale & Inventory Dashboards

#### A. POS Dashboard (`src/routes/_authenticated/_app/pos-dashboard.tsx`)
- **Query Key:** `['dashboard-pos-realtime-data']`
- **API Endpoint:** `GET /api/dashboard/pos`
- **Backend Controller:** [server/src/routes/dashboard.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/dashboard.routes.ts) (`lines 225–310`)
- **Database Tables Queried:** `sales` (where `type = 'pos'`), `cash_registers`, `register_shifts`.
- **Displayed Metrics:** Today's Cash/Card/UPI totals, active cashier shifts, recent receipts.
- **Verdict:** **100% REAL PERSISTED DATA**.

#### B. Inventory Dashboard (`src/routes/_authenticated/_app/inventory-dashboard.tsx`)
- **Query Key:** `['dashboard-inventory-realtime-data']`
- **API Endpoint:** `GET /api/dashboard/inventory`
- **Backend Controller:** [server/src/routes/dashboard.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/dashboard.routes.ts) (`lines 315–400`)
- **Database Tables Queried:** `products`, `product_warehouses`, `stock_movements`, `warehouses`.
- **Displayed Metrics:** Total SKU count, inventory asset valuation (`SUM(quantity * cost)`), low stock warnings (`quantity <= alertThreshold`), warehouse utilization.
- **Verdict:** **100% REAL PERSISTED DATA**.

---

### 2.4. Finance & Sales CRM Dashboards

#### A. Finance Dashboard (`src/routes/_authenticated/_app/finance-dashboard.tsx`)
- **Query Key:** `['dashboard-finance-realtime-data']`
- **API Endpoint:** `GET /api/dashboard/finance`
- **Backend Controller:** [server/src/routes/dashboard.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/dashboard.routes.ts) (`lines 405–510`)
- **Database Tables Queried:** `journal_items`, `chart_of_accounts`, `sales`, `purchases`.
- **Displayed Metrics:** Net profit trend, operating cash flow, customer AR aging, vendor AP aging.
- **Verdict:** **100% REAL PERSISTED DATA**.

#### B. Sales CRM Dashboard (`src/routes/_authenticated/_app/crm-dashboard.tsx`)
- **Query Key:** `['dashboard-sales-crm-realtime-data']`
- **API Endpoint:** `GET /api/dashboard/sales-crm`
- **Backend Controller:** [server/src/routes/dashboard.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/dashboard.routes.ts) (`lines 515–600`)
- **Database Tables Queried:** `crm_leads`, `crm_proposals`, `sales`, `customers`.
- **Displayed Metrics:** Funnel velocity, lead conversion rate, pipeline value by stage (`new`, `qualified`, `proposal`, `won`, `lost`).
- **Verdict:** **100% REAL PERSISTED DATA**.

---

### 2.5. Employee Self-Service Dashboard (`src/routes/_authenticated/_app/employee-dashboard.tsx`)

#### A. Data Pipeline & Query Keys
- **Attendance Log Query Key:** `["my-attendance"]` -> `GET /api/attendance`
- **Leave Requests Query Key:** `["my-leaves"]` -> `GET /api/leave/requests`
- **Payslips Query Key:** `["my-payslips"]` -> `GET /api/payroll/payslips/my`
- **Announcements Query Key:** `["company-announcements"]` -> `GET /api/announcements`

#### B. Data Scoping & Personal Isolation
- The queries return real database rows from `attendances`, `leave_requests`, and `payslips`.
- Mutations (`POST /attendance/check-in`, `POST /leave/requests`) persist immediately and invalidate React Query caches.
- **Verdict:** **100% REAL PERSISTED DATA**.

---

### 2.6. Client Portal Dashboard (`src/routes/_authenticated/_app/client-dashboard.tsx`)

#### A. Data Pipeline & Scoping Failure
- **Projects Query:** `api.get("/api/projects")`
  - **Flaw:** Calls the tenant-wide project route. Returns all projects in the tenant without filtering by client organization.
- **Invoices Query:** `api.get("/api/invoices")`
  - **Flaw:** Requires `finance.invoices.view` permission. A client role triggers a 403 Forbidden. If bypassed, returns ALL sales invoices across the entire enterprise.
- **Support Tickets Query:** `api.get("/api/helpdesk/tickets")`
  - **Flaw:** Tickets are not strictly filtered by `clientId`.
- **Verdict:** **DATABASE BACKED BUT CRITICAL TENANT/CLIENT SCOPING VULNERABILITY**.

---

### 2.7. Identified Mocked & Synthetic Dashboards

#### A. Super Admin Platform Telemetry (`src/routes/_authenticated/super/analytics.tsx`)
- Lines 61–118 declare `SAMPLE_TELEMETRY`:
  ```typescript
  const SAMPLE_TELEMETRY: TenantTelemetry[] = [
    { id: "t-1", name: "ACME Technologies Pvt Ltd", storageUsedGb: 34.2, ... },
    { id: "t-2", name: "Globex Global Logistics", storageUsedGb: 22.8, ... },
    { id: "t-3", name: "Initech Enterprise Software", storageUsedGb: 9.4, ... },
    { id: "t-4", name: "Cyberdyne Systems", storageUsedGb: 12.1, ... }
  ];
  ```
- **Finding:** While the component queries `GET /super/tenants`, it assigns `useState(SAMPLE_TELEMETRY)` and renders static fake metrics.
- **Verdict:** **100% MOCKED**.

#### B. Super Admin Platform Transactions (`src/routes/_authenticated/super/transactions.tsx`)
- Lines 64–130 declare `INITIAL_TRANSACTIONS`:
  ```typescript
  const INITIAL_TRANSACTIONS: PlatformTransaction[] = [
    { id: "tx-101", transactionNo: "TXN-2026-9041", tenantName: "ACME Technologies", amount: 59999, ... },
    { id: "tx-102", transactionNo: "TXN-2026-9042", tenantName: "Globex Global", amount: 4999, ... }
  ];
  ```
- **Finding:** The page does not query any transaction endpoint.
- **Verdict:** **100% MOCKED**.

#### C. Public Client Statement (`src/routes/portal.tsx`)
- Lines 64–100 contain hardcoded fallback mock data:
  ```typescript
  // Fallback realistic demo statement if DB query returns 404
  return {
    customer: { name: "Apex Enterprise Client", email: "accounts@apextech.com", ... },
    company: { name: "TSV Global Solutions Pvt Ltd" },
    summary: { totalInvoiced: 135900, totalPaid: 85000, totalOutstanding: 50900 },
    invoices: [ { id: "inv-2026-001", invoiceNo: "INV-2026-001", grandTotal: 50900, ... } ]
  };
  ```
- **Verdict:** **PARTIAL / MOCK FALLBACK DETECTED**.
