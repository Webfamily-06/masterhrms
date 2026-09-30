# Backend REST API Architecture & Route Forensic Mapping

## 1. API Architecture Summary
* **Runtime**: Node.js 20 LTS + Express.js 4.x
* **Language**: TypeScript (Strict Mode)
* **Router Files**: 44 Express router files in `server/src/routes/`
* **Total Discovered Endpoints**: 433 Verified Endpoints
* **Authentication**: JWT Bearer Tokens validated by `requireAuth`
* **SSRF-Protected Execution Bridge**: `POST /api/docs/execute`

---

## 2. API Method & Role Distribution

```
Total Endpoints: 433
├── By HTTP Method:
│   ├── GET:    172 endpoints (39.7%)
│   ├── POST:   179 endpoints (41.3%)
│   ├── PUT:     38 endpoints (8.8%)
│   ├── DELETE:  37 endpoints (8.5%)
│   └── PATCH:    7 endpoints (1.6%)
└── By Role Scope:
    ├── Tenant Admin:  420 endpoints
    ├── HR Manager:     82 endpoints
    ├── Accountant:     37 endpoints
    ├── Cashier:        36 endpoints
    ├── Super Admin:    13 endpoints
    └── Employee (ESS):  4 endpoints
```

---

## 3. Module Endpoint Inventory (44 Route Files)

| Route File | Base Path | Endpoints Count | Key Operations | Middleware Applied |
| :--- | :--- | :-: | :--- | :--- |
| **`super.routes.ts`** | `/api/super/*` | 13 | Tenants, Subscriptions, Impersonation, SMTP OTP | `requireAuth`, `requireSuperAdmin` |
| **`auth.routes.ts`** | `/api/auth/*` | 9 | Login, Register, Super Login, Claim Root, 2FA OTP | Public / Rate-limited |
| **`employees.routes.ts`** | `/api/employees/*` | 18 | Directory, Profile, Documents, Salary setup | `requireAuth`, `tenantIsolation` |
| **`attendance.routes.ts`** | `/api/attendance/*` | 14 | Punch in/out, Geofence verify, Daily summaries | `requireAuth`, `tenantIsolation` |
| **`shifts.routes.ts`** | `/api/shifts/*` | 8 | Rostering, Shift assignments, Swap requests | `requireAuth`, `tenantIsolation` |
| **`biometric.routes.ts`** | `/api/biometric/*` | 6 | Device push listener, UDP bridge, Ping status | `requireAuth`, `tenantIsolation` |
| **`leaves.routes.ts`** | `/api/leaves/*` | 12 | Applications, Quota balances, Approval workflow | `requireAuth`, `tenantIsolation` |
| **`payroll.routes.ts`** | `/api/payroll/*` | 16 | Compute run, Finalize lock, Payslips, Bank export| `requireAuth`, `tenantIsolation` |
| **`statutory.routes.ts`** | `/api/statutory/*` | 8 | Form 16, 24Q, EPF, ESI, PT compliance summaries| `requireAuth`, `tenantIsolation` |
| **`expenses.routes.ts`** | `/api/expenses/*` | 10 | Claim creation, Receipt upload, General ledger post | `requireAuth`, `tenantIsolation` |
| **`assets.routes.ts`** | `/api/assets/*` | 11 | Hardware registry, Custody assignment, Return | `requireAuth`, `requireAddon('assets')` |
| **`okrs.routes.ts`** | `/api/okrs/*` | 9 | Objectives, Key results, Confidence check-ins | `requireAuth`, `requireAddon('okr')` |
| **`recruitment.routes.ts`** | `/api/recruitment/*` | 14 | Jobs, Candidates Kanban, Convert to staff | `requireAuth`, `tenantIsolation` |
| **`training.routes.ts`** | `/api/training/*` | 8 | Courses, Enrollments, Progress, Certificates | `requireAuth`, `tenantIsolation` |
| **`offboarding.routes.ts`** | `/api/offboarding/*` | 7 | Resignations, 4-Dept clearance, Relieving doc | `requireAuth`, `tenantIsolation` |
| **`helpdesk.routes.ts`** | `/api/tickets/*` | 12 | Support tickets, Thread messages, Status update | `requireAuth`, `tenantIsolation` |
| **`crm.routes.ts`** | `/api/crm/*` | 15 | Deals Kanban, Contacts, Lead stage transitions | `requireAuth`, `tenantIsolation` |
| **`projects.routes.ts`** | `/api/projects/*` | 16 | Milestone Gantt, Tasks, Timesheet submissions | `requireAuth`, `tenantIsolation` |
| **`pos.routes.ts`** | `/api/pos/*` | 12 | Barcode lookup, Split tender checkout, Receipt | `requireAuth`, `requireAddon('pos')` |
| **`products.routes.ts`** | `/api/products/*` | 18 | Product SKUs, Warehouses, Multi-WH transfers | `requireAuth`, `tenantIsolation` |
| **`accounting.routes.ts`** | `/api/accounting/*` | 19 | Chart of Accounts, Journal entries, Balance sheet | `requireAuth`, `tenantIsolation` |
| **`invoices.routes.ts`** | `/api/invoices/*` | 15 | B2B tax invoices, Purchase bills, Payments | `requireAuth`, `tenantIsolation` |
| **`workflows.routes.ts`** | `/api/workflows/*` | 8 | IF-THEN triggers, Webhook events, Auto alerts | `requireAuth`, `tenantIsolation` |
| **`docs.routes.ts`** | `/api/docs/*` | 4 | System metadata, SSRF-protected execution bridge | `requireAuth` |
*(Includes 20 additional route files covering announcements, chat, documents, Google workspace, WhatsApp alerts, settings, and file uploads).*
