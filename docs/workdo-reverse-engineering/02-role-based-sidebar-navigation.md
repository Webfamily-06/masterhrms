# 02 — ROLE-BASED SIDEBAR & NAVIGATION ARCHITECTURE: WORKDO DASH SAAS

**Reference Application**: WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Auditor**: Principal Enterprise Solutions Architect & Reverse Engineering Specialist  
**Evidence Source**: Live DOM Inspection of Radix UI Collapsible Sidebar (`data-sidebar="sidebar"`)  
**Verification Level**: **VERIFIED**

---

## 1. Sidebar UI Component Architecture

The sidebar in WorkDo Dash SaaS is built using **Radix UI Collapsible Primitive** styled with **Tailwind CSS**:
- **Sidebar Container**: `<aside data-sidebar="sidebar" class="group/sidebar ...">`
- **Main Scrollable List**: `<ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-1">`
- **Menu Items (`<li>`)**:
  - **Direct Nav Links**: `<a href="/..." class="peer/menu-button flex w-full items-center gap-2 ...">`
  - **Collapsible Triggers**: `<button type="button" aria-controls="radix-:r..." aria-expanded="true/false" data-sidebar="menu-button">`
  - **Nested Submenus**: `<ul data-sidebar="menu-sub" class="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l ...">`
- **Active State Styling**: `bg-sidebar-accent text-sidebar-accent-foreground font-semibold` with border indicator.
- **Badges**:
  - `PREMIUM` (purple pill badge for Add-ons Manager)
  - `FREE` (gray/green badge for AI Advisor, Smart Reports, Notice Board)
  - `NEW` (emerald badge for AI Agent, Applications)

---

## 2. Navigation Trees by Role

### A. Role: HR Manager / HR Officer (`hr`)

```text
HRM Dashboard (Landing: /hrm/dashboard)
├── Dashboard
│   ├── HRM Dashboard (/hrm/dashboard)
│   ├── Recruitment Dashboard (/recruitment/dashboard)
│   └── Procurement Dashboard (/procurement/dashboard)
├── HRM
│   ├── Employees (/hrm/employees)
│   ├── Attendance [Collapsible]
│   │   ├── Attendances (/hrm/attendances)
│   │   └── Shifts (/hrm/shifts)
│   ├── Leave Management [Collapsible]
│   │   ├── Leave Applications (/hrm/leave-applications)
│   │   ├── Leave Balance (/hrm/leave-balance)
│   │   ├── Leave Types (/hrm/leave-types)
│   │   └── Holidays (/hrm/holidays)
│   ├── Payroll [Collapsible]
│   │   ├── Payslip (/hrm/payrolls)
│   │   └── Set Salary (/hrm/set-salary)
│   ├── Documents (/hrm/documents)
│   ├── Announcements (/hrm/announcements)
│   ├── Events (/hrm/events)
│   ├── Recognition [Collapsible]
│   │   └── Awards (/hrm/awards)
│   ├── Employee Issues [Collapsible]
│   │   ├── Complaints (/hrm/complaints)
│   │   └── Warnings (/hrm/warnings)
│   ├── Career Changes [Collapsible]
│   │   ├── Promotions (/hrm/promotions)
│   │   ├── Transfers (/hrm/employee-transfers)
│   │   ├── Resignations (/hrm/resignations)
│   │   └── Terminations (/hrm/terminations)
│   ├── Policies [Collapsible]
│   │   ├── Company Policies (/hrm/company-policies)
│   │   └── Acknowledgments (/hrm/acknowledgments)
│   └── System Setup (/hrm/branches)
│       ├── Branches
│       ├── Departments
│       ├── Designations
│       ├── Document Types
│       ├── Award Types
│       ├── Termination Types
│       ├── Warning Types
│       ├── Complaint Types
│       ├── Holiday Types
│       ├── Document Categories
│       ├── Announcement Categories
│       ├── Event Types
│       ├── Allowance Types
│       ├── Deduction Types
│       ├── Loan Types
│       ├── Working Days
│       └── Ip Restricts
├── Recruitment
│   ├── Job Postings (/recruitment/job-postings)
│   ├── Candidates (/recruitment/candidates)
│   ├── Interviews (/recruitment/interviews)
│   ├── Interview Feedback (/recruitment/interview-feedbacks)
│   ├── Candidate Assessments (/recruitment/candidate-assessments)
│   ├── Offers (/recruitment/offers)
│   ├── Candidate Onboarding (/recruitment/candidate-onboardings)
│   └── Configuration (/recruitment/job-types)
├── Procurement
│   ├── RFxes (/procurement/rfxes)
│   ├── RFx Applicants (/procurement/r-fx-applicants)
│   ├── RFx Applications (/procurement/rfx-applications)
│   ├── Interview Schedules (/procurement/interview-schedules)
│   ├── Vendor On-Boardings (/procurement/vendor-on-boardings)
│   └── System Setup (/procurement/r-fx-categories)
├── Digital Certificate
│   ├── Certificate Templates (/digital-certificate/certificate-templates)
│   └── Certificates (/digital-certificate/digital-certificates)
├── Media Library (/media-library)
└── Messenger (/messenger)
```

---

### B. Role: Employee / Staff (`staff`)

```text
Employee Self-Service Portal (Landing: /dashboard)
├── Dashboard (/dashboard)
├── My Attendance
│   ├── Clock In / Clock Out Action
│   └── Monthly Attendance History
├── My Leaves
│   ├── Apply Leave Request
│   └── My Leave Balance
├── My Payslips
│   ├── Monthly Payslip History
│   └── Download Payslip PDF
├── Company Notice Board & Events
│   ├── Announcements (/hrm/announcements)
│   └── Event Calendar (/hrm/events)
└── Messenger (/messenger)
```

---

### C. Role: Super Admin (`superadmin`)

```text
Platform Super-Admin Console (Landing: /dashboard)
├── Core Platform
│   ├── Dashboard (/dashboard)
│   ├── Companies (Users) (/users)
│   └── Add-ons Marketplace (/add-ons/explore)
├── Analytics & Telemetry
│   ├── Google Analytics Overview (/google-analytics)
│   ├── Traffic Analysis
│   └── User Engagement
├── WHMCS & Billing
│   ├── System Overview (/whmcs/system)
│   ├── WHMCS Orders (/whmcs/orders)
│   ├── WHMCS Promotions (/whmcs/promotions)
│   ├── WHMCS Clients (/whmcs/clients)
│   ├── WHMCS Products (/whmcs/products)
│   └── WHMCS Support Tickets (/whmcs/support-tickets)
├── Helpdesk & Support Desk
│   ├── Today's Tickets (/helpdesk-ticket/today)
│   ├── All Tickets (/helpdesk-tickets)
│   └── Ticket Categories (/helpdesk-categories)
├── Subscription & Revenue Engine
│   ├── Subscription Plans (/plans)
│   ├── Discount Coupons (/coupons)
│   ├── Bank Transfer Requests (/bank-transfer)
│   └── Order Invoices (/orders)
├── Content & Public CMS
│   ├── Landing Page Builder (/landing-page)
│   ├── Marketplace Settings (/marketplace/settings)
│   ├── Custom Legal Pages (/custom-pages)
│   ├── Newsletter Subscribers (/newsletter-subscribers)
│   ├── Email Notification Templates (/email-templates)
│   ├── In-App Notification Templates (/notification-templates)
│   ├── Navigation Menu Builder (/side-menu-builder)
│   └── Media Library (/media-library)
└── Governance & Settings
    ├── Platform Settings (/settings)
    ├── Backup & Restore (/backup-restore)
    └── Login Audit History (/menu-redirect/2)
```

---

### D. Role: Company Admin (`company`)

```text
Company Enterprise Management (Landing: /account/dashboard)
├── Executive Dashboards (Project, Account, HRM, POS, CRM, Sales)
├── User & Access Management
│   ├── Roles & Permissions (/roles)
│   └── Company Users (/users)
├── Core HRM & Workforce Suite (Full Employee Lifecycle)
├── Accounting & Double Entry
│   ├── Customers, Vendors, Banking, Plaid Transactions
│   ├── Chart of Accounts, Debit/Credit Notes, Journal Entries
│   └── Financial Reports (Balance Sheet, Profit & Loss, Trial Balance)
├── Sales & Procurement
│   ├── Sales Invoices, Purchase Invoices, Warehouses, Transfers
│   └── Products & Services Catalog
├── Project Management
│   ├── Projects, Milestones, Task Kanban, Gantt Charts, Bugs
│   └── Project Templates & Payment Tracking
├── CRM & Sales Pipeline
│   ├── Pipelines, Leads, Deals, Opportunity Stages
│   └── Custom Forms Builder
├── Specialized Verticals (Over 40 Optional Add-on Suites)
└── Company Settings (Currencies, Brand, Email, Webhooks, Integrations)
```

---

## 3. Comparison with MASTERHRMS Current Sidebar

| Feature / Pattern | WorkDo Dash SaaS | MASTERHRMS Current State | Architectural Alignment Plan |
|---|---|---|---|
| **Collapsible Nested Submenus** | Radix UI Collapsible (`aria-expanded`) | Custom accordion in `sidebar.tsx` | Retain TanStack Router Link hierarchy with Radix Collapsible |
| **Dynamic Role-Based Scoping** | Injected via `auth.user.permissions` props | Dynamic filter via `useAuth().hasRole()` | Enforce identical route lists in `src/components/layout/sidebar.tsx` |
| **Add-on Badge Indicators** | `PREMIUM`, `FREE`, `NEW` pill badges | Currently clean flat icons | Add subtle status badges for Addon Marketplace items |
| **User Quick-Switch / Impersonate** | Modal on User Card | Dedicated Super-Admin Impersonation Banner | Replicate for Company-to-Employee mode with floating return dock |
