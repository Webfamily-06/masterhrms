# MASTERHRMS — ORGANIZATION MASTER DATA INITIAL AUDIT
**Routes:**
- Departments: `/hr/organization/departments`
- Designations: `/hr/organization/designations`
- Branches: `/hr/organization/branches`
**Date: 2026-11-05**

---

## 1. Executive Summary

This preflight audit inspects the current repository state, backend route definitions, frontend component implementations, database schema, and live records across both workspaces (TanStack Start React and Next.js CMS) for the three core HR organization master data pages: Departments, Designations, and Branches.

The preflight establishes that while basic list views and creation/edit dialogs exist, significant functional gaps remain in summary statistics accuracy, table controls (pagination page-size selector, sorting, row selection, bulk actions, status filtering), delete/archive safety, edit uniqueness validation, and UI visual hierarchy.

---

## 2. Git & Working Tree Preflight

- **Current Branch**: `main`
- **Current HEAD Commit**: `9438d3d5` (`fix: complete chat calling and global push notification workflows`)
- **Remote**: `origin` (`https://github.com/Webfamily-06/masterhrms.git`)
- **Working Tree**: Clean (`nothing to commit, working tree clean`)
- **Uncommitted User Changes**: None prior to this task; all ongoing work strictly preserved.

---

## 3. Workspace File Mapping & Architecture

Both workspaces maintain corresponding implementations:

| Entity Route | TanStack Start (Primary Web Client) | Next.js CMS Workspace | Backend API Mount |
| :--- | :--- | :--- | :--- |
| **Departments** (`/hr/organization/departments`) | [`src/routes/_authenticated/hr/organization/departments.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/organization/departments.tsx) | [`CMS/src/app/(workspace)/hr/organization/departments/page.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/(workspace)/hr/organization/departments/page.tsx) | `/api/hr/organization/departments` |
| **Designations** (`/hr/organization/designations`) | [`src/routes/_authenticated/hr/organization/designations.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/organization/designations.tsx) | [`CMS/src/app/(workspace)/hr/organization/designations/page.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/(workspace)/hr/organization/designations/page.tsx) | `/api/hr/organization/designations` |
| **Branches** (`/hr/organization/branches`) | [`src/routes/_authenticated/hr/organization/branches.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/organization/branches.tsx) | [`CMS/src/app/(workspace)/hr/organization/branches/page.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/(workspace)/hr/organization/branches/page.tsx) | `/api/hr/organization/branches` |

### Backend Service Wiring:
- Express Router: [`server/src/routes/organization.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/organization.routes.ts)
- Base Blueprint: [`server/src/blueprints/master-data.blueprint.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/blueprints/master-data.blueprint.ts) (`createMasterDataRouter`)
- Root Mounts:
  - Mounted via `platformFoundationRouter.use("/hr/organization", organizationRouter)` in [`server/src/routes/platform-foundation.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/platform-foundation.routes.ts)
  - Exposed at `/api/hr/organization/*` and `/api/v1/hr/organization/*` in [`server/src/index.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/index.ts).

---

## 4. Live Supabase Database Baseline Audit

Direct query of the connected PostgreSQL database reveals the following authoritative record distribution:

### A. Departments (`public.departments`)
- **Default Tenant (`tenant-default-001`)**: **5 records**
  1. `Engineering` (`909b60c2-3b81-43dd-919e-ff51d0e41797`, branch: `19ff6702...`, status: `active`)
  2. `Human Resources` (`856b3866-baa4-4846-9626-3965cb965d2b`, branch: `19ff6702...`, status: `active`)
  3. `Finance & Accounting` (`51fae104-bbed-4936-90ce-85494003fe59`, branch: `19ff6702...`, status: `active`)
  4. `Product & Design` (`8f7f7836-4a42-4ed6-924f-520b92bba337`, branch: `19ff6702...`, status: `active`)
  5. `Sales & Marketing` (`1edeb656-51ac-43f8-9f13-3db429e15daf`, branch: `19ff6702...`, status: `active`)
- **Isolated E2E Tenant (`tenant_e2e_a_1791569819098`)**: **1 record**
  - `Engineering Test Dept` (`40197a0d-f470-4f28-b0e0-f8599acf1d4d`, branch: `null`, status: `active`)
- **Total in Database**: **6 records** (Must NEVER leak across tenant boundaries).

### B. Designations (`public.designations`)
- **Default Tenant (`tenant-default-001`)**: **10 records**
  1. `Chief Technology Officer`
  2. `Senior Full Stack Engineer`
  3. `Frontend Developer`
  4. `Backend Developer`
  5. `DevOps Architect`
  6. `Product Manager`
  7. `HR Operations Director`
  8. `Financial Controller`
  9. `Sales Account Executive`
  10. `QA Automation Lead`
- **Total across tenants**: **10 records**

### C. Branches (`public.branches`)
- **Default Tenant (`tenant-default-001`)**: **1 record**
  - `TSV Global Solutions ` (Code: `CHN`, id: `19ff6702-2a04-4202-af8d-72153a02fb45`, status: `active`)
- **Total across tenants**: **1 record**

### D. Active Employee & Relation Dependencies
- `employees` referencing Department `Engineering`: **2 employees**
- `employees` referencing Designation `Senior Full Stack Engineer`: **1 employee**
- `employees` referencing Designation `QA Automation Lead`: **1 employee**
- `employees` referencing Branch `TSV Global Solutions `: **2 employees**
- `departments` referencing Branch `TSV Global Solutions `: **5 departments**
- **Critical takeaway**: Hard deletion of active departments, designations, or branches violates foreign key constraints and corrupts employee master data. An archive/deactivate workflow is strictly required.

---

## 5. Preliminary Findings & Defect Categorization

### Defect 1: Client-Side Stat Card Scope Distortion
In all three pages:
```typescript
const activeCount = departments.filter((d: any) => d.status === "active").length;
const inactiveCount = departments.length - activeCount;
```
- **Issue**: `departments` only contains the current paginated page (e.g. 15 items), meaning `activeCount` and `inactiveCount` reflect only the current page instead of the entire tenant-wide organization master dataset!

### Defect 2: Missing Table Controls
- No page size selector (`10`, `25`, `50`, `100`).
- No table column sorting headers (e.g. Sort by Name, Status, Branch/Dept).
- No individual row selection checkboxes.
- No Select All checkbox for current page.
- No bulk actions (Bulk Archive / Bulk Deactivate).
- No status filter dropdown (Active / Inactive / All).

### Defect 3: Missing Delete / Archive Actions in UI
- The action column only contains an "Edit" button. There is no Delete or Archive button.
- Users cannot archive or deactivate obsolete departments, designations, or branches from the UI.

### Defect 4: Missing Update Uniqueness Validation in Backend
- While `POST /` checks `uniqueFields` on creation, `PUT /:id` in `createMasterDataRouter` does not validate uniqueness, allowing accidental renames that cause duplicate department names or branch codes within the tenant.

### Defect 5: Missing Status Field in Create/Edit Dialog
- The modal forms allow editing name, description, and relations, but do not provide a status selector (`active` vs `inactive`), making it impossible to restore an archived entity or set status via the form.

---

## 6. Action Plan for Remediation

1. **Backend Blueprint Enhancement**:
   - Add status filtering (`?status=active|inactive|all`) in `createMasterDataRouter`.
   - Add tenant-wide summary counts (`total`, `active`, `inactive`) in `GET /` response metadata.
   - Add safe archive/deactivate endpoint (`PATCH /:id/archive` or `PUT /:id` status toggle).
   - Add duplicate validation on `PUT /:id`.
   - Add dependent reference check before hard deletion with clean error response.
2. **Frontend UI Upgrade**:
   - Modernize summary cards with consistent visual hierarchy and accurate tenant-wide counts.
   - Implement full table controls: Search, Status Filter, Column Sorting, Page Size Selector (10, 25, 50, 100), Row Checkboxes, Select All, and Bulk Archive.
   - Add Archive/Delete action with confirmation modal and dependency guard.
   - Add Status field in Add/Edit dialog.
3. **Workspace Parity**:
   - Apply identical updates to both `src/` (TanStack) and `CMS/src/` (Next.js).
4. **Empirical Playwright & API Verification**:
   - Verify every CRUD operation, tenant isolation, and responsive layout across real browsers.

