# MASTERHRMS — PHASE 5 (P4): ROLE RESPONSIBILITY & NAVIGATION AUDIT
**Document ID:** `docs/hrms-audit/P4_ROLE_RESPONSIBILITY_AND_NAVIGATION_AUDIT.md`  
**Phase:** Phase 5 — Final HRMS Consolidation & Implementation (P4)  
**Status:** AUDIT COMPLETE — 7 PERSONAS VERIFIED  
**Timestamp:** 2026-11-03T16:46:00+05:30  

---

## 1. THE 7 CANONICAL PERSONAS & RESPONSIBILITY MAPPING

MASTERHRMS strictly enforces role-based access control (RBAC) across 7 distinct personas.

| # | Persona | Role Name in Code | Access Scope | Portal Root | Core Capabilities |
|---|---|---|---|---|---|
| **1** | **Super Admin** | `super_admin` | Global / Cross-Tenant Platform | `/super/*` | Platform oversight, tenant provisioning, system configurations, storage management. |
| **2** | **Tenant Admin** | `tenant_admin`, `admin`, `Workspace Admin` | Dedicated Tenant Workspace | `/tenant/*`, `/hr/*` | Workspace settings, subscription/billing, user role assignments, audit logs. |
| **3** | **HR Admin** | `hr_admin` | Full Workforce Operations | `/hr/*` | Employee creation/editing, payroll runs, statutory filings, global leave/attendance management. |
| **4** | **HR Manager** | `hr_manager` | People Operations & Talent | `/hr/*` | Recruitment pipelines, onboarding tasks, training programs, performance reviews, asset distribution. |
| **5** | **Department Manager** | `manager`, `department_manager` | Subordinate Team Scoped | `/me/*`, `/manager/*` | Subordinate leave approvals, attendance regularization reviews, shift swap approvals, expense reviews. |
| **6** | **Team Lead** | `team_lead` | Workgroup Scoped | `/me/*` | Daily roster review, shift inspection, peer performance assessments. |
| **7** | **Employee** | `employee` | Strictly Self-Scoped (ESS) | `/me/*` | View own profile, apply for leave, clock attendance punches, download personal payslips, manage own assets. |

---

## 2. API ENDPOINT AUTHORIZATION MATRIX

| Endpoint | Method | Allowed Personas | Prohibited Personas | Action on Violation |
|---|---|---|---|---|
| `/api/super/*` | ALL | `super_admin` | 2, 3, 4, 5, 6, 7 | 403 Forbidden / 404 Not Found |
| `/api/payroll/runs` | GET, POST | `super_admin`, `tenant_admin`, `hr_admin`, `hr_manager` | 5, 6, 7 | 403 Forbidden |
| `/api/payroll/statutory/filings` | GET, POST | `super_admin`, `tenant_admin`, `hr_admin`, `hr_manager` | 5, 6, 7 | 403 Forbidden |
| `/api/employees` | POST | `super_admin`, `tenant_admin`, `hr_admin` | 4, 5, 6, 7 | 403 Forbidden |
| `/api/employees/:id` | PUT | `super_admin`, `tenant_admin`, `hr_admin` | 4, 5, 6, 7 | 403 Forbidden |
| `/api/attendance/reconcile` | POST | `super_admin`, `tenant_admin`, `hr_admin` | 4, 5, 6, 7 | 403 Forbidden |
| `/api/attendance/regularize` | POST | All authenticated (Self-Only for 5, 6, 7) | Cross-employee for 5, 6, 7 | 403 Forbidden (BOLA Block) |
| `/api/leave/requests` | POST | All authenticated (Self-Only for 5, 6, 7) | Cross-employee for 5, 6, 7 | 403 Forbidden (BOLA Block) |
| `/api/leave/requests/:id/status` | PATCH | `super_admin`, `tenant_admin`, `hr_admin`, `manager` (Subordinate-Only) | 6, 7; Non-subordinate for 5 | 403 Forbidden |
| `/api/me/*` | GET, PUT | All authenticated (Self-Scoped) | N/A | 200 OK |

---

## 3. NAVIGATION REGISTRY & SIDEBAR AUDIT

### 3.1 Duplicate Path Elimination
- **TanStack Central Registry (`src/lib/navigation-registry.ts`):**
  - Total items: 49
  - Duplicate paths: **0**
- **CMS HR Sidebar (`CMS/src/nav/hr-sidebar.ts`):**
  - Total paths: 120
  - Duplicate paths: **0**
- **CMS Employee Sidebar (`CMS/src/nav/employee-sidebar.ts`):**
  - Total paths: 61
  - Duplicate paths: **0**

### 3.2 Role-Based Navigation Filtering Evidence
When `getNavigationForPortal("me", { roles: ["employee"] })` is executed:
- All `/hr/*` administration links (e.g. `/hr/payroll`, `/hr/employees`, `/hr/statutory`) are **strictly excluded**.
- Only authorized self-service links (`/me/dashboard`, `/me/attendance`, `/me/leaves`, `/me/payroll`, `/me/assets`, `/me/profile`) are rendered.
- Mobile and desktop sidebar views maintain identical route entitlements with sticky touch targets (minimum 44px).

---

## 4. REGRESSION VERIFICATION RESULTS

- All 4 navigation tests in `server/src/tests/phase5-p4-consolidation.test.ts` (Section 4) **PASSED**.
- All 3 role responsibility mapping tests in Section 3 **PASSED**.
- Zero route collisions or broken deep links identified.

