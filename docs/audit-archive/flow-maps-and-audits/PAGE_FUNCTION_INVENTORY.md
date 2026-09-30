# Frontend Page & Component Functional Inventory

This forensic inventory audits all 124 frontend routes across the 4 application portals.

---

## 1. Inventory Summary by Portal
* **Super Admin Platform**: 22 Pages (`src/routes/_authenticated/super/*`)
* **Tenant / Vendor Admin Portal**: 66 Pages (`src/routes/_authenticated/_app/*`)
* **Employee Self-Service (ESS)**: 1 Dedicated Hub (`/employee-dashboard`)
* **Client External Portal**: 3 Pages (`/portal`, `/client-dashboard`, public share)
* **Public & Authentication**: 32 Pages (Login, Sign-up, Store, Public Add-ons, Landing)

---

## 2. Page-by-Page Technical Matrix

### 2.1. Super Admin Pages
1. **`/super` (Dashboard)**:
   * Component: `src/routes/_authenticated/super/index.tsx`
   * Purpose: Platform-wide telemetry, MRR, tenant count, error rates.
   * State: `useQuery(["super-stats"])` fetching `GET /api/super/stats`.
   * Actions: Date range picker, Refresh telemetry, Quick tenant search.
2. **`/super/tenants`**:
   * Component: `src/routes/_authenticated/super/tenants.tsx`
   * Purpose: Organization workspace directory and lifecycle orchestration.
   * Actions: "Create Organization" modal, "Suspend Tenant", "Adjust Plan Quota", "Impersonate".
   * Handlers: Calls `POST /api/super/tenants`, `PUT /api/super/tenants/:id`, `POST /api/super/impersonate/:id`.
3. **`/super/plans`**:
   * Component: `src/routes/_authenticated/super/plans.tsx`
   * Purpose: SaaS subscription plan definition, monthly/annual pricing, feature entitlements.
   * Actions: "Add Plan" modal, "Save Plan Changes", "Toggle Add-on Gate".
4. **`/super/api-docs`**:
   * Component: `src/routes/_authenticated/super/api-docs.tsx`
   * Purpose: Super Admin REST API catalog, Token matrix, Live execution console.
   * Actions: "Generate Token", "Execute Live Request", "Copy cURL", "Export Endpoint Manifest".

### 2.2. Tenant / Vendor Admin Pages
1. **`/dashboard`**:
   * Component: `src/routes/_authenticated/_app/dashboard.tsx`
   * Purpose: Executive operational hub.
   * Handlers: `useQuery(["dashboard-stats"])` reading `GET /api/dashboard/stats`.
2. **`/employees`**:
   * Component: `src/routes/_authenticated/_app/employees.tsx`
   * Purpose: Full personnel lifecycle management.
   * Actions: "Add Employee" wizard (Personal Info -> Salary Structure -> Bank Details -> Documents).
   * Handlers: `POST /api/employees` with atomic database transaction.
3. **`/attendance`**:
   * Component: `src/routes/_authenticated/_app/attendance.tsx`
   * Purpose: Real-time workforce punch records and daily status summaries.
   * Actions: "Punch In/Out" modal, "Manual Overtime Entry", "Export Attendance CSV".
4. **`/payroll`**:
   * Component: `src/routes/_authenticated/_app/payroll.tsx`
   * Purpose: Monthly compensation processing, statutory tax calculation, bank export.
   * Actions: "Compute Payroll Draft", "Finalize & Lock Payroll", "Download Bank NEFT File".
5. **`/pos`**:
   * Component: `src/routes/_authenticated/_app/pos.tsx`
   * Purpose: Retail counter barcode checkout terminal.
   * Actions: Barcode scanner input, Split tender modal (Cash/Card/UPI), Thermal receipt print.
   * Hardware Integration: QZ-Tray WebSocket bridge for raw ESC/POS 80mm printing.
6. **`/accounting`**:
   * Component: `src/routes/_authenticated/_app/accounting.tsx`
   * Purpose: Double-entry general ledger, Chart of Accounts, Journal entries.
   * Actions: "New Journal Entry" (enforces Debits == Credits), "Add Account", "Export P&L".
