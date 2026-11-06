# MASTERHRMS — Master Data CRUD & End-to-End Runtime Report

**Date:** November 5, 2026  
**Auditor:** Senior Prisma & PostgreSQL Backend Auditor  
**Scope:** Complete Lifecycle Verification (`Branch`, `Department`, `Designation`)  
**Backend Port:** `4000` (`http://localhost:4000/api`)  
**Frontend Ports:** Next.js CMS (`http://localhost:3000`), TanStack Router Workspace  
**Verification Method:** Direct HTTP REST Requests + Live PostgreSQL Query Auditing + Playwright MCP UI Sessions  

---

## 1. Executive Summary

This report documents the empirical execution of live CRUD lifecycle operations, edge case validations, and Playwright UI tests against the running application and Supabase PostgreSQL instance.

Every operation was validated in dual fashion:
1. **API Protocol Validation:** Verification of HTTP status codes, latency, response bodies, and error formats.
2. **PostgreSQL Physical State Validation:** Direct `SELECT` queries on physical tables (`branches`, `departments`, `designations`) to guarantee data was written and committed to disk, without relying on ORM cache or mock drivers.
3. **Zero Data Leakage:** Pre-test and post-test row count differentials were audited. All test records were strictly quarantined and removed after validation.

---

## 2. Real CRUD Runtime Test Execution Matrix

All operations were executed against active tenant `cmh100000000000000000001` with JWT bearer authentication.

### 2.1 Designation Lifecycle (`designations`)

| Step | Operation | Request Endpoint & Payload | Response Code | DB Verification (`SELECT * FROM designations WHERE id = ...`) | Result |
|:---|:---|:---|:---|:---|:---|
| 1 | **Create** | `POST /api/hr/organization/designations`<br>`{ name: "Cert Test Staff Eng", description: "Audit Desc" }` | `201 Created` | Physical record created; `status = 'active'`, `updated_at IS NOT NULL` | **PASS** |
| 2 | **Read** | `GET /api/hr/organization/designations/:id` | `200 OK` | `name` matches; `status` = `"active"` | **PASS** |
| 3 | **De-activate** | `PUT /api/hr/organization/designations/:id`<br>`{ status: "inactive" }` | `200 OK` | Physical `status` updated to `'inactive'`; `updated_at` bumped | **PASS** |
| 4 | **Activate** | `PUT /api/hr/organization/designations/:id`<br>`{ status: "active" }` | `200 OK` | Physical `status` updated to `'active'`; `updated_at` bumped | **PASS** |
| 5 | **Edit Details** | `PUT /api/hr/organization/designations/:id`<br>`{ name: "Cert Principal Eng", description: "Updated Desc" }` | `200 OK` | Physical `name = 'Cert Principal Eng'`, `description = 'Updated Desc'` | **PASS** |
| 6 | **Delete** | `DELETE /api/hr/organization/designations/:id` | `200 OK` | Record physically removed from `designations` table | **PASS** |

---

### 2.2 Department Lifecycle (`departments`)

| Step | Operation | Request Endpoint & Payload | Response Code | DB Verification (`SELECT * FROM departments WHERE id = ...`) | Result |
|:---|:---|:---|:---|:---|:---|
| 1 | **Create** | `POST /api/hr/organization/departments`<br>`{ name: "Cert QA Ops", description: "Testing Dept" }` | `201 Created` | Physical record created; `status = 'active'`, `created_at IS NOT NULL` | **PASS** |
| 2 | **Read** | `GET /api/hr/organization/departments/:id` | `200 OK` | `name` matches; `status` = `"active"` | **PASS** |
| 3 | **De-activate** | `PUT /api/hr/organization/departments/:id`<br>`{ status: "inactive" }` | `200 OK` | Physical `status` updated to `'inactive'` | **PASS** |
| 4 | **Activate** | `PUT /api/hr/organization/departments/:id`<br>`{ status: "active" }` | `200 OK` | Physical `status` updated to `'active'` | **PASS** |
| 5 | **Edit Details** | `PUT /api/hr/organization/departments/:id`<br>`{ name: "Cert Global QA", description: "Expanded" }` | `200 OK` | Physical `name = 'Cert Global QA'`, `description = 'Expanded'` | **PASS** |
| 6 | **Delete** | `DELETE /api/hr/organization/departments/:id` | `200 OK` | Record physically removed from `departments` table | **PASS** |

---

### 2.3 Branch Lifecycle (`branches`)

| Step | Operation | Request Endpoint & Payload | Response Code | DB Verification (`SELECT * FROM branches WHERE id = ...`) | Result |
|:---|:---|:---|:---|:---|:---|
| 1 | **Create** | `POST /api/hr/organization/branches`<br>`{ name: "Cert London Hub", code: "LON-01" }` | `201 Created` | Physical record created; `status = 'active'`, `code = 'LON-01'`, `updated_at IS NOT NULL` | **PASS** |
| 2 | **Read** | `GET /api/hr/organization/branches/:id` | `200 OK` | `name` matches; `code` matches | **PASS** |
| 3 | **De-activate** | `PUT /api/hr/organization/branches/:id`<br>`{ status: "inactive" }` | `200 OK` | Physical `status` updated to `'inactive'`; `updated_at` bumped | **PASS** |
| 4 | **Activate** | `PUT /api/hr/organization/branches/:id`<br>`{ status: "active" }` | `200 OK` | Physical `status` updated to `'active'`; `updated_at` bumped | **PASS** |
| 5 | **Edit Details** | `PUT /api/hr/organization/branches/:id`<br>`{ name: "Cert Greater London", address: "Central London" }` | `200 OK` | Physical `name = 'Cert Greater London'`, `address = 'Central London'` | **PASS** |
| 6 | **Delete** | `DELETE /api/hr/organization/branches/:id` | `200 OK` | Record physically removed from `branches` table | **PASS** |

---

## 3. Negative Scenarios & Security Edge Cases

| Test Case | Scenario / Attack Vector | Target Entity | Expected HTTP Code | Actual HTTP Code | Verification Evidence |
|:---|:---|:---|:---|:---|:---|
| **Duplicate Name Validation** | Create two departments with identical name `Cert Unique Dept` in same tenant | `Department` | `400 Bad Request` | `400 Bad Request` | Error message: `"Record with this name already exists in this organization"` |
| **Invalid Payload Rejection** | Send update payload with only unmapped fields: `{ updatedBy: "hacker", foo: "bar" }` | `Designation` | `400 Bad Request` | `400 Bad Request` | Error message: `"No valid fields provided for update"`; zero Prisma queries executed |
| **Cross-Tenant Isolation (Update)** | User of Tenant A attempts to update record belonging to Tenant B | `Designation` | `404 Not Found` | `404 Not Found` | Tenant boundary enforced at SQL level (`WHERE id = $1 AND tenant_id = $2`) |
| **Cross-Tenant Isolation (Delete)** | User of Tenant A attempts to delete record belonging to Tenant B | `Department` | `404 Not Found` | `404 Not Found` | Foreign tenant record untouched |
| **Dependency Guard (Delete)** | Attempt to delete Branch that has child Departments attached | `Branch` | `409 Conflict` | `409 Conflict` | Foreign key constraint protected; record preserved |

---

## 4. UI End-to-End Verification via Playwright MCP

The user interface was audited using live Playwright MCP browser automation against `http://localhost:3000`.

### 4.1 Modal & Form Prepopulation
1. **Edit Department Modal:**
   - Clicked `Edit` on row "Engineering".
   - Verified modal opened with header `Edit Department`.
   - Verified form controls prepopulated with existing DB values:
     - Department Name: `"Engineering"`
     - Assigned Branch: `"TSV Global Solutions (CHN)"`
     - Status: `"Active"`
   - Clicked `Cancel`: modal closed without submitting requests.
2. **Edit Branch Modal:**
   - Clicked `Edit` on row "TSV Global Solutions".
   - Verified modal opened with header `Edit Branch Location`.
   - Verified fields prepopulated:
     - Branch Name: `"TSV Global Solutions"`
     - Code: `"CHN"`
     - Phone: `"+91 6383408443"`
     - Email: `"media@tsvhomes.in"`
     - Address: `"Ekkaduthangal ,Chennai"`
   - Clicked `Cancel`: clean dismissal.

### 4.2 Lifecycle Action Dialogs & Badges
1. **De-activate Confirmation Dialog:**
   - Clicked `De-activate` button on "Engineering".
   - Verified alert dialog rendered:
     - Header: `De-activate Department`
     - Confirmation message: `"Are you sure you want to de-activate Engineering? This record will be marked as inactive and will not appear in selection dropdowns for new assignments. Existing associations will be preserved."`
     - Interactive options: `Cancel` and `De-activate`.
   - Dismissed safely using `Cancel`.
2. **Status Badges & Controls:**
   - Verified status column on Designations page correctly reflects state:
     - Active records display active badge with `De-activate` action button.
     - Inactive records (e.g. "Chief Technology Officer") display inactive badge with `Activate` action button.

### 4.3 Responsive Viewport Certification
Automated Playwright sessions captured evidence across three breakpoints:
- **Desktop (1440x900):** Full data table, sidebar navigation, stat summary cards, and multi-column actions.
- **Tablet (768x1024):** Responsive table scroll with compact action buttons.
- **Mobile (375x667):** Stacked stat cards, wrapped headers, mobile action drawer.

Evidence screenshots verified on disk:
- `docs/hrms-audit/evidence/org-master-data/departments_desktop.png`
- `docs/hrms-audit/evidence/org-master-data/departments_add_modal_desktop.png`
- `docs/hrms-audit/evidence/org-master-data/designations_desktop.png`
- `docs/hrms-audit/evidence/org-master-data/branches_desktop.png`

---

## 5. Database Integrity & Zero-Leak Proof

Direct counts were captured in PostgreSQL immediately before and after executing all test suites:

```sql
SELECT 
  (SELECT COUNT(*) FROM branches) AS branch_count,
  (SELECT COUNT(*) FROM departments) AS dept_count,
  (SELECT COUNT(*) FROM designations) AS desig_count;
```

### Empirical Row Count Audit

| Entity | Baseline (Before Test) | Post-Test Count | Net Delta | Data Leakage |
|:---|:---|:---|:---|:---|
| **Branches** | `1` | `1` | **0** | **NONE** |
| **Departments** | `5` | `5` | **0** | **NONE** |
| **Designations** | `10` | `10` | **0** | **NONE** |

**Audit Result:** Zero residual test data was left in production tables. Existing organizational hierarchy remained 100% uncorrupted.

