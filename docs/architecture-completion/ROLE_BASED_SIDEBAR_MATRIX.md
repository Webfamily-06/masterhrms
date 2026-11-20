# Role-Based Sidebar Navigation Matrix: MASTERHRMS

**Document Reference:** `DOC-ARCH-SIDEBAR-004`  
**Portal Implementations:** `/super/*`, `/tenant/*`, `/hr/*`, `/me/*`  
**Navigation Engine:** `src/lib/navigation-registry.ts` & `src/components/navigation/portal-sidebar.tsx`  

---

## 1. Portal Navigation Architecture

MASTERHRMS uses a dynamic, portal-scoped navigation engine driven by centralized registries:
- `TENANT_NAVIGATION_REGISTRY` in `src/nav/registry.ts` (for `/tenant/*`)
- `NAVIGATION_REGISTRY` in `src/lib/navigation-registry.ts` (for `/hr/*`, `/me/*`, and `/super/*`)

Navigation visibility is resolved using four strict verification gates:
1. **Portal Boundary Gate:** Items matching only the active portal context (`super`, `tenant`, `hr`, `me`).
2. **Entitlement / Module Gate:** Ensures tenant has subscribed to and enabled the associated addon.
3. **Role Authorization Gate:** Verifies token role matches authorized role whitelist.
4. **Permission Gate:** Evaluates user permission codes before rendering menu items.

---

## 2. Complete Navigation Matrix by Role & Portal

### A. Platform Super Admin Portal (`/super/*`)
*Accessible exclusively to `admin@masterhrms.com` with `super_admin` role via `/super-06`.*

| Section | Menu Item Label | Target Route | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Platform** | Overview Dashboard | `/super` | `super_admin` | Global platform KPIs, ARR, MRR, tenant counts |
| | Tenant Companies | `/super/tenants` | `super_admin` | Multi-tenant organization directory & provisioning |
| | Subscription Plans | `/super/plans` | `super_admin` | SaaS tier pricing, employee caps, feature flags |
| | Addon Marketplace | `/super/addons` | `super_admin` | Catalog of 30+ enterprise addons & pricing |
| | Order & Billing History| `/super/orders` | `super_admin` | Invoices, gateway payment transactions |
| **System** | Payment Gateways | `/super/gateways` | `super_admin` | Stripe, PayPal, Razorpay credentials |
| | Global Settings | `/super/settings` | `super_admin` | Email SMTP, branding, Turnstile keys |
| | Security & Audit Logs | `/super/audit-logs` | `super_admin` | Immutable platform activity records |

---

### B. Tenant Administrator Portal (`/tenant/*`)
*Accessible to `tenantadmin@masterhrms.com` with `tenant_admin` / `Workspace Admin` role in `tenant-default-001`.*

| Section | Menu Item Label | Target Route | Type | Submenu Pages / Description |
| :--- | :--- | :--- | :---: | :--- |
| **Workspace** | **Dashboard** | `/tenant/dashboard` | Collapsible | **10 Modular Executive Dashboards:**<br>1. *Tenant Overview:* `/tenant/dashboard`<br>2. *HRM Dashboard:* `/hrm-dashboard`<br>3. *CRM & Deals Dashboard:* `/crm-dashboard`<br>4. *Finance Dashboard:* `/finance-dashboard`<br>5. *Project Dashboard:* `/project-dashboard`<br>6. *POS Dashboard:* `/pos-dashboard`<br>7. *Inventory Dashboard:* `/inventory-dashboard`<br>8. *Payroll Dashboard:* `/payroll-dashboard`<br>9. *Recruitment Dashboard:* `/recruitment-dashboard`<br>10. *Help Desk Dashboard:* `/help-desk-dashboard` |
| | **Calendar** | `/tenant/calendar` | Direct Link | Corporate calendar, holidays, company events |
| | **Todo** | `/tenant/todo` | Direct Link | Workspace task lists and assignments |
| | **Gantt** | `/tenant/todo/gantt` | Direct Link | Interactive task timeline and Gantt charts |
| | **Chat** | `/tenant/chat` | Collapsible | Personal Chat, Groups, Contacts, Call Logs |
| | **File Manager** | `/apps/file-manager/list-view` | Direct Link | Centralized workspace document and asset storage |
| | **Reports** | `/daily-report` | Collapsible | **10 Core Business Reports (+ Smart BI):**<br>1. *Daily Report:* `/daily-report`<br>2. *Attendance Report:* `/attendance-report`<br>3. *Employee Report:* `/employee-report`<br>4. *Leave Report:* `/leave-report`<br>5. *Payroll & Payslip Report:* `/payslip-report`<br>6. *Expenses Report:* `/expenses-report`<br>7. *Sales Invoice Report:* `/invoice-report`<br>8. *Payment Report:* `/payment-report`<br>9. *Project Progress Report:* `/project-report`<br>10. *Support Ticket Report:* `/ticket-reports`<br>11. *Smart BI Reports:* `/smart-reports` |
| | **Company Profile** | `/tenant/company-profile` | Direct Link | Legal company entity, GST/PAN, registered address |
| | **Organization Structure**| `/hr/organization/branches` | Collapsible | Branches, Departments, Designations |
| | **Users** | `/tenant/users` | Direct Link | Workspace employee accounts & logins |
| | **Roles and Permissions**| `/tenant/roles` | Direct Link | Custom role definitions & access matrices |
| | **Addon Store & Integrations** | `/tenant/modules` | Direct Link | Modern 4-column module store with drawer configuration |
| **Subscription** | **Plan and Usage** | `/tenant/subscription` | Direct Link | Active SaaS plan, user tier limits, upgrades |
| | **Billing and Invoices** | `/tenant/billing` | Direct Link | Workspace payment history & PDF receipts |
| **Configuration**| **Branding** | `/tenant/branding` | Direct Link | Custom logos (light/dark), favicons, corporate theme colors |
| | **Settings** | `/tenant/settings` | Direct Link | Global workspace settings, currency, timezones, date formats |
| | **Domain** | `/tenant/domain` | Direct Link | Custom domain configuration and CNAME/DNS verification |
| | **Integrations** | `/tenant/integrations` | Direct Link | Third-party services, webhooks, and API keys |
| | **Biometric Hardware Hub**| `/biometric-sync` | Collapsible | Terminals, Cloud ADMS, Employee Mapping, Logs, Diagnostics |
| | **Data** | `/tenant/data` | Direct Link | Data export, database backups, and data hygiene |
| | **Audit Logs** | `/tenant/audit-logs` | Direct Link | Immutable workspace administrative action logs |
| | **Support** | `/tenant/support` | Direct Link | Helpdesk tickets, knowledge base, technical support |
| **Cross-Portal**| **HR Management Portal** | `/hr/dashboard` | Direct Link | Quick-switch into the HR operational management portal |
| | **My Employee Portal** | `/me/dashboard` | Direct Link | Quick-switch into employee self-service view |

---

### C. HR Operations Portal (`/hr/*`)
*Accessible to `hr@masterhrms.com` with `hr_admin` / `HR Manager` role in `tenant-default-001`.*

| Section | Menu Item Label | Target Route | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Overview** | HR Dashboard | `/hr/dashboard` | `hr.view` | Department heads, headcount, daily attendance |
| | Master Calendar | `/hr/calendar` | `calendar.view` | Company holidays, leave approvals, shifts |
| | Operations Chat | `/hr/chat` | `chat.view` | Internal team communication channels |
| **Workforce** | Employee Directory | `/hr/employees` | `hr.employees.read` | Complete employee records, designations, branches |
| | Attendance & Logs | `/hr/attendance` | `hr.attendance.manage` | Daily punches, biometric sync, overtime |
| | Leave Approvals | `/hr/leaves` | `hr.leaves.manage` | Leave balance approval queue, vacation policies |
| **Financials**| Payroll Management | `/hr/payroll` | `hr.payroll.calculate` | Salary calculation, allowances, deductions |
| | Statutory & Tax Forms | `/hr/payroll/forms` | `hr.payroll.statutory` | Form 16, Form 24Q, EPF ECR, ESI returns |
| **Talent** | Recruitment / ATS | `/hr/recruitment` | `recruitment.manage` | Job postings, candidates, interview pipeline |
| | Performance Appraisals| `/hr/performance` | `performance.manage`| OKRs, goal tracking, review cycles |
| **Lifecycle** | Exits & Offboarding | `/hr/lifecycle/exits`| `hr.lifecycle.manage`| Resignations, clearance, Relieving Letter gen |
| **Config** | HR Settings | `/hr/settings` | `hr.settings.manage` | Leave types, document types, salary structures |

---

### D. Employee Self-Service Portal (`/me/*`)
*Accessible to `employee@masterhrms.com` with `employee` role in `tenant-default-001`.*

| Section | Menu Item Label | Target Route | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Self-Service**| My Dashboard | `/me/dashboard` | `me.profile.view` | Personal attendance summary, pending tasks |
| | My Profile | `/me/profile` | `me.profile.view` | Personal documents, bank details, emergency info |
| | Clock In / Out | `/me/attendance` | `me.attendance.punch`| Web time-clock, punch history, regularizations |
| | Leave Requests | `/me/leaves` | `me.leaves.request` | Leave balance check, apply for PTO/sick leave |
| **Finance** | Payslips | `/me/payroll/payslips` | `me.payslips.download` | Download monthly salary pay slips |
| | Tax & Statutory Forms | `/me/payroll/statutory-forms` | `me.tax_forms.download` | Download personal Form 16 and tax computations |
| **Lifecycle** | Exit & Resignation | `/me/lifecycle/exit` | `me.exit.submit` | Submit resignation, view Relieving Letter PDF |
| **Collab** | Tasks & To-Do | `/me/todo` | `todo.view` | Personal task lists, Gantt charts |
| | Calendar | `/me/calendar` | `calendar.view` | Personal schedule, approved leaves, holidays |
| | Chat | `/me/chat` | `chat.view` | Peer-to-peer workspace chat |

---

## 3. Cross-Portal Leakage Elimination Rules

To enforce strict visual and architectural isolation across portals:

1. **No Super Admin items in Tenant/HR/Employee Sidebars:**
   - Super admin routes (`/super/*`) are only registered in `NAVIGATION_REGISTRY` with `portal: "sa"`.
   - On tenant domains, `_authenticated/route.tsx` throws `notFound()` (404) for any `/super/*` path.
2. **No Tenant Admin items in HR or Employee Sidebars:**
   - Items such as `/tenant/settings`, `/tenant/modules`, `/tenant/users`, and `/tenant/roles` are strictly bound to `portal: "tenant"`.
   - Even if an HR user manually inputs `/tenant/settings`, the `_authenticated/tenant.tsx` route guard redirects to `/403`.
3. **No HR Operational Management items in Employee Sidebar:**
   - Employee portal is limited strictly to personal `me.*` self-service routes.
   - The Employee role cannot view other employees' records, leave approval queues, or payroll calculation runs.
