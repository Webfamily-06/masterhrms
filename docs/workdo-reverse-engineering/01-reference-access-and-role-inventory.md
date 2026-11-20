# 01 — REFERENCE ACCESS & ROLE INVENTORY: WORKDO DASH SAAS

**Reference Application**: WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Auditor**: Principal Enterprise Solutions Architect & Reverse Engineering Specialist  
**Methodology**: Live credential exploration, session token inspection, role table decompilation, and authorization boundary probing  
**Evidence Source**: Live CDP Session & Database Role Matrix (`https://dash-demo.workdo.io/roles`)  
**Verification Level**: **VERIFIED**

---

## 1. Discovered Role Catalog & Credentials

WorkDo Dash SaaS utilizes a two-tier multi-tenancy model:
1. **Platform Level (Global SaaS)**: `superadmin`
2. **Tenant Level (Company SaaS Instance)**: `company`, `hr`, `staff`, `client`, `vendor`, `driver`, plus specialized vertical roles.

The following accounts were directly authenticated and inspected in the reference environment:

| Role Name | Login Identifier | Type / Context | Landing Route | Verification Status |
|---|---|---|---|---|
| **Super Admin** | `superadmin` / `Super Admin Login` | Platform Super-Administrator | `/dashboard` (Platform Overview) | **VERIFIED** (Direct Login) |
| **Company Admin** | `company@example.com` | Tenant SaaS Owner (Company) | `/account/dashboard` | **VERIFIED** (Direct Login) |
| **HR Manager / Officer** | `lisa.brown@example.com` | Company HR Administrator | `/hrm/dashboard` | **VERIFIED** (Direct Login) |
| **Staff / Employee** | `john.smith@company.com` | Regular Workforce Employee (ESS) | `/dashboard` (Employee Portal) | **VERIFIED** (Direct Login) |
| **Client** | `sarah.johnson@example.com` | External Client / CRM Portal | `/client/dashboard` | **OBSERVED** (Role Record ID 2) |
| **Vendor** | `alex.vendor@example.com` | External Vendor / Procurement Portal | `/vendor/dashboard` | **OBSERVED** (Role Record ID 3) |
| **Driver** | `james.mitchell@example.com` | Fleet Logistics Driver | `/fleet/dashboard` | **OBSERVED** (Role Record ID 4) |

*Security Confirmation: Zero credentials, hashed secrets, or session tokens are printed in cleartext.*

---

## 2. In-Depth Profile by Primary Role

### A. Role: Super Admin (`superadmin`)
- **Landing Page**: `https://dash-demo.workdo.io/dashboard`
- **Dashboard Metrics**: Total Orders (131), Order Payments ($20,718.10), Total Plans (4), Total Companies (7), Monthly Order Chart, Recent Helpdesk Activity (5 tickets), Tickets Awaiting Response (4 tickets).
- **Available Modules**:
  1. Core Orchestration: Dashboard, Users (Companies List), Add-ons Manager
  2. Analytics: Google Analytics (Realtime Overview, Generate, Drive Sales, Traffic Analysis, User Engagement)
  3. WHMCS & Billing: System, Orders, Promotions, Clients, Products, Announcements, Support Tickets
  4. Desk & Verification: File Share Verification, Backup & Restore, Helpdesk (Today's Tickets, All Tickets, Categories)
  5. Subscription Engine: Subscription Setting (Plans), Coupons, Bank Transfer Requests, Orders
  6. CMS & Customization: Landing Page, Marketplace, Custom Pages, Newsletter Subscribers, Email Templates, Notification Templates, Side Menu Builder, Media Library, Settings
- **Restricted Areas**: Tenant-internal operational data (cannot directly see an individual tenant's employees, daily attendances, or internal journal vouchers without logging in as that tenant).
- **Administrative Privileges**: Tenant provisioning, tenant suspension, plan pricing, coupon generation, manual bank wire receipt approval, system settings, global email/SMS gateways.

---

### B. Role: Company Admin (`company`)
- **Landing Page**: `https://dash-demo.workdo.io/account/dashboard`
- **Dashboard Scope**: Multi-departmental executive overview spanning Accounts, HRM, CRM, POS, and Projects.
- **Available Modules**:
  - Full Tenant Catalog (over 60 modular add-ons enabled): User Management (Roles, Users), Proposal, Sales Invoice, Purchase, Product & Service, Retainer, Quotation, Project, Accounting, Goal, Budget Planner, Double Entry, HRM, Performance, Training, Work Permit, Recruitment, Job Search, Biometric Attendance, Performance Indicator, Procurement, POS, CRM, Assets, and Enterprise Settings.
- **Administrative Capabilities**:
  - Unrestricted CRUD over all company records.
  - User impersonation (`lucide-user-check`) allowing direct single-click login as any employee, HR officer, client, or vendor.
  - Resetting passwords, toggling active/inactive status.
  - Full financial, salary structure, and bank account governance.

---

### C. Role: HR Manager / HR Officer (`hr`)
- **Landing Page**: `https://dash-demo.workdo.io/hrm/dashboard`
- **Dashboard Scope**: Workforce analytics (Total Employees: 15, Active Employees, Today Attendance, Leave Status, Upcoming Birthdays, Upcoming Work Anniversaries, Recruitment Funnel).
- **Available Modules (Strictly Scoped)**:
  1. **Dashboard**: HRM Dashboard, Recruitment Dashboard, Procurement Dashboard
  2. **HRM Core**: Employees, Attendance (Attendances, Shifts), Leave Management (Applications, Balance, Types, Holidays), Payroll (Payslip, Set Salary), Documents, Announcements, Events, Recognition (Awards), Employee Issues (Complaints, Warnings), Career Changes (Promotions, Transfers, Resignations, Terminations), System Setup (Branches, Departments, Designations, etc.)
  3. **Recruitment**: Job Postings, Candidates, Interviews, Interview Feedback, Candidate Assessments, Offers, Candidate Onboarding, Configuration
  4. **Procurement**: RFxes, RFx Applicants, RFx Applications, Interview Schedules, Vendor On-Boardings
  5. **Digital Certificates**: Certificate Templates, Issued Certificates
  6. **Communications**: Media Library, Messenger
- **Restricted Areas**:
  - Completely restricted from Accounting, General Ledger, POS, Invoicing, Banking, and Tenant Billing.
  - Cannot access Super Admin controls or Company subscription settings.
- **Approval Permissions**:
  - Single-click Leave Approval / Rejection with mandatory audit comment.
  - Offer letter approval and conversion to employee.
  - Payroll calculation and payslip generation.

---

### D. Role: Staff / Employee (`staff`)
- **Landing Page**: `https://dash-demo.workdo.io/dashboard`
- **Dashboard Scope**: Personal Employee Self-Service (ESS) overview: "Welcome, John Smith! john.smith@company.com".
- **Available Modules**:
  - Personal Profile View.
  - Personal Attendance (Clock In / Clock Out, monthly log).
  - Personal Leave Applications & Leave Balances.
  - Personal Payslips (View and download PDF).
  - Company Announcements & Events Calendar.
  - Messenger (Internal company team chat).
- **Restricted Areas**:
  - Route authorization guards block access to `/hrm/employees`, `/hrm/attendances`, `/hrm/payrolls`, `/roles`, etc. (attempts result in redirection).
  - Zero permission to view other employees' financial or disciplinary records.

---

## 3. Comprehensive Role Access & Permission Matrix

The following matrix records the **empirically observed** permissions across the four primary roles in WorkDo Dash SaaS:

| Module / Capability | Super Admin | Company Admin | HR Manager (`hr`) | Employee (`staff`) |
|---|---|---|---|---|
| **Global SaaS Tenant Provisioning** | FULL (CRUD) | NONE (403) | NONE (403) | NONE (403) |
| **SaaS Subscription & Plan Pricing** | FULL (CRUD) | VIEW / BUY | NONE | NONE |
| **Offline Bank Receipt Approval** | FULL (Approve/Reject) | SUBMIT RECEIPT | NONE | NONE |
| **User & Role Management** | PLATFORM USERS | TENANT ROLES/USERS | VIEW USERS | NONE |
| **User Impersonation** | TENANT ADMIN | ANY TENANT USER | NONE | NONE |
| **Employee Master (CRUD)** | NONE (Isolated) | FULL (CRUD) | FULL (CRUD) | VIEW OWN ONLY |
| **Employee Banking & Salary Info** | NONE | FULL (CRUD) | FULL (CRUD) | VIEW OWN ONLY |
| **Attendance Matrix (All Employees)** | NONE | FULL (CRUD) | FULL (CRUD) | NONE (Own Only) |
| **Clock In / Clock Out Action** | NONE | FULL | FULL | FULL (Self) |
| **Leave Applications (All Employees)** | NONE | FULL (Approve/Reject) | FULL (Approve/Reject) | SUBMIT OWN ONLY |
| **Leave Type & Holiday Setup** | NONE | FULL (CRUD) | FULL (CRUD) | READ ONLY |
| **Payroll Calculation & Pay Run** | NONE | FULL (Execute) | FULL (Execute) | NONE |
| **Payslip Generation & Download** | NONE | FULL (All) | FULL (All) | DOWNLOAD OWN |
| **Salary Structure (Allowances/Deductions)**| NONE | FULL (CRUD) | FULL (CRUD) | NONE |
| **Disciplinary (Warnings & Complaints)**| NONE | FULL (CRUD) | FULL (CRUD) | VIEW OWN |
| **Career Changes (Promotions/Transfers)**| NONE | FULL (CRUD) | FULL (CRUD) | NONE |
| **Recruitment (Jobs & Candidates ATS)** | NONE | FULL (CRUD) | FULL (CRUD) | JOB SEARCH |
| **Offer Letter Generation** | NONE | FULL (CRUD) | FULL (CRUD) | VIEW OWN |
| **Accounting & General Ledger** | NONE | FULL (CRUD) | NONE (403) | NONE (403) |
| **CRM Leads & Sales Pipelines** | NONE | FULL (CRUD) | NONE (403) | NONE (403) |
| **Point of Sale (POS)** | NONE | FULL (CRUD) | NONE (403) | NONE (403) |
| **Custom Company Settings** | NONE | FULL (CRUD) | SYSTEM SETUP ONLY| NONE |

---

## 4. Architectural Gaps & Implementation Directives for MASTERHRMS

1. **Role Scoping Parity**:
   - MASTERHRMS currently has `super_admin`, `company`, `hr_admin`, `manager`, `employee`, and `finance`.
   - The UI sidebar in MASTERHRMS must implement strict, deterministic filtering matching WorkDo's clean partitioning: HR users must never see Accounting or CRM links, and Employee users must only see ESS navigation.
2. **Cryptographic Impersonation**:
   - WorkDo's Company Admin can impersonate any user via `lucide-user-check`.
   - MASTERHRMS already implemented Super-Admin-to-Tenant impersonation in `server/src/services/auth.service.ts`; this pattern must be mirrored for Company-to-Employee impersonation with clear audit trail logging.
