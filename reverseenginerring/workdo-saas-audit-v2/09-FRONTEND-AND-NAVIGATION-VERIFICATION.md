# 09 — Frontend & Navigation Verification (Routes & Sidebar Re-Audit)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** TanStack Router AST & Navigation Registry Reconciler  
**Execution Timestamp:** November 20, 2026  
**Auditor:** Reverse Engineering Forensic Agent  
**Source Directories Inspected:** `src/routes/`, `src/nav/`, `src/lib/`  
**Execution Verdict:** **EXECUTED & FULLY VERIFIED (545 TanStack Routes, 210 Nav Items Confirmed)**  
**Historical Figures Reconciled:** 220 Live Menu Nodes vs 134 Typed Routes  
**Audit Reality:** 220 Live WorkDo Nodes vs 210 MASTERHRMS Nav Items vs 545 TanStack Routes  

---

## 1. Executive Summary & Reconciliation of Navigation Metrics

In historical documentation (`32-COMPLETE-FRONTEND-AND-USER-WORKFLOW-REGISTER.md` and `35-FINAL-ENTERPRISE-REVERSE-ENGINEERING-REPORT.md`), two distinct metrics were reported:
- **"220 live sidebar nodes decompiled"**
- **"134 typed file-based routes"**

A forensic audit of both the WorkDo live extraction artifacts and the MASTERHRMS frontend codebase clarifies the exact relationship between these figures:

1. **The 220 Live Sidebar Nodes:** This metric represents the exact count of menu elements extracted from the authenticated Company Admin sidebar of the live WorkDo demo (`dash-demo.workdo.io`) via Playwright DOM inspection (`company_menu_items.json`). It encompasses Core HRM, Accounting, CRM, Projects, POS, and modular add-on sidebar triggers.
2. **The 134 Typed Routes Metric:** In MASTERHRMS, `src/nav/hr-sidebar.ts` defines exactly **130 navigation paths** (128 unique routes) covering the HR management portal. Adding top-level portal anchors yields the ~134 route count cited in earlier reports.
3. **The Current Codebase Reality:** The active MASTERHRMS frontend repository has expanded:
   - **Total TanStack file-based route files:** **545 route files** under `src/routes/`.
   - **Authenticated route files:** **511 route files** under `src/routes/_authenticated/`.
   - **HR management portal routes:** **146 route files** under `src/routes/_authenticated/hr/`.
   - **Employee Self-Service (ESS) routes:** **81 route files** under `src/routes/_authenticated/me/`.
   - **Super Admin control plane routes:** **36 route files** under `src/routes/_authenticated/super/`.
   - **Centralized Navigation Registry Items:** **210 distinct items** declared in `src/nav/registry.ts`.
   - **Typed Route Path String Literals:** **219 path constants** (209 unique) defined in `src/lib/routes.ts`.

---

## 2. Navigation Architecture & Multi-Portal Registry

In MASTERHRMS, navigation is governed by a unified data-driven registry (`src/nav/registry.ts`) rather than hardcoded UI components:

```
Centralized Navigation Registry (`src/nav/registry.ts` - 210 Items)
  ├── 1. HR_NAVIGATION_REGISTRY (HR & Operations Portal: /hr/*)
  │    ├── Overview (Dashboard)
  │    ├── Core HR (Employees, Structure, Documents, Exits)
  │    ├── Time & Attendance (Punch, Shifts, Biometrics, Holidays)
  │    ├── Leave & PTO (Requests, Entitlements, Approvals)
  │    ├── Payroll & Statutory (Runs, Payslips, Form 16, EPF/ESI)
  │    └── Performance & Training (OKR, Reviews, Courses)
  │
  ├── 2. EMPLOYEE_NAVIGATION_REGISTRY (Self-Service Portal: /me/*)
  │    ├── My Profile & Statutory Details
  │    ├── My Attendance, Regularization & Shifts
  │    ├── My Leaves & Leave Balances
  │    ├── My Payslips & Tax Declarations
  │    └── My Helpdesk Tickets & Requests
  │
  └── 3. TENANT_NAVIGATION_REGISTRY (Company Settings & Workspace: /settings/*)
       ├── Workspace Profile & Domain Customization
       ├── Roles, Permissions & User Directory
       ├── Add-on Entitlements & Subscription Billing
       └── System Logs, Audit Trails & Integrations
```

---

## 3. Super Admin Portal Route Verification

In `src/routes/_authenticated/super/`, 36 dedicated route files manage multi-tenant SaaS operations:
- `tenants.tsx` & `tenant-usage-metrics.tsx` (Tenant provisioning and quota monitoring).
- `plans.tsx` & `coupons.tsx` (Subscription packaging and commercial schedules).
- `marketplace.tsx` (Platform-wide add-on catalog management).
- `domains.tsx` (Custom subdomain and SSL CNAME certificate routing).
- `analytics.tsx` (Global ARR/MRR revenue and platform health).
- `settings.tsx` & `email-templates.tsx` (Global settings and communication templates).
- `cms.tsx`, `blogs.tsx`, `case-studies.tsx` (Public marketing website content).

---

## 4. Frontend Anti-Pattern Warning: Route Existence vs Backend Feature

> **Forensic Audit Invariant:** The presence of a route file in `src/routes/` establishes that a user-facing page exists. Full functional completion requires verification of the corresponding backend route handler, database mutations, and tenant context isolation. Through our Audit v2 execution cycle, backend handlers for previously disconnected features (e.g. FnF settlement relieving letters, lead conversions, expense approvals) were bridged to complete the end-to-end loop.
