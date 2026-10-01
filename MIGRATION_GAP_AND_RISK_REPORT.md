# Migration Gap & Risk Report
**Phase 0 — Complete Gaps, Risks, and Architectural Debt**
**Audit Date:** 2026-09-30

---

## 1. Executive Summary

| Metric | Count |
|--------|------:|
| Total HTML screens evaluated | ~155 |
| COMPLETE (UI + API + Live DB) | ~83 (53%) |
| PARTIAL (screen exists, missing elements) | ~11 (7%) |
| MISSING (no React route exists) | ~19 (12%) |
| UI_ONLY (static/placeholder data still) | ~40 (26%) |
| Backend modules using CMS JSON blobs instead of relational tables | **8 modules** |

> [!CAUTION]
> **The biggest risk is not missing screens — it is the CMS JSON blob architecture.**
> 8 modules store business data as serialized JSON in `prisma.cmsPage` rows instead of
> first-class relational tables. This breaks foreign-key integrity, concurrent writes,
> tenant isolation enforcement at the DB layer, and financial precision.

---

## 2. Critical Architectural Risks

### Risk A — CMS JSON Blob Storage (CRITICAL)
**Severity:** 🔴 CRITICAL  
**Affected Modules:** CRM (Leads, Deals, Contacts), Inventory (Products v2), Sales, Proposals, Recurring Invoices, Budgets, Asset Requests  
**Description:** Backend stores business records as serialized JSON blobs in `prisma.cmsPage` rows using slug keys like `system-crm-leads-${tenantId}`. This means:
- No foreign key enforcement → data corruption possible
- No concurrent write safety → race conditions on multi-user tenants
- No indexed search → O(n) full table scan per query
- No tenant isolation at DB level → blobs only filtered by slug pattern matching
- Financial precision depends on JSON string parsing → rounding errors possible

**Required Fix:** Migrate each module to first-class Prisma relational models with proper `tenant_id` foreign keys and indexed columns. This is backend work that must precede full Phase 2 API integration for these modules.

**Migration Effort:** High (2-3 weeks per module, 8 modules = 4-6 weeks)

---

### Risk B — Missing Indian Statutory Compliance Screens (HIGH)
**Severity:** 🟠 HIGH  
**Affected Screens:** `provident-fund.html`, PF/ESI contribution tracking  
**Description:** The PF (Provident Fund) management screen (`ui-2/provident-fund.html`) has no React implementation. This is a statutory legal requirement for Indian employers.  
**Impact:** Payroll runs include PF/ESI calculations in the backend but the frontend has no dedicated management UI.  
**Required Fix:** Implement `/payroll-pf` route using `ui-2/provident-fund.html` as reference.

---

### Risk C — Overtime Tracking Gap (HIGH)
**Severity:** 🟠 HIGH  
**Affected Screens:** `ui-2/overtime.html`  
**Description:** No React route exists for overtime recording and approval. Overtime is a core payroll input — missing this creates payroll inaccuracies.  
**Required Fix:** Implement `/overtime` route using `ui-2/overtime.html` as reference.

---

### Risk D — CRM Hierarchy Incomplete (HIGH)
**Severity:** 🟠 HIGH  
**Affected Screens:** `clients.html`, `companies.html`  
**Description:** CRM contacts exist but the parent entities (Clients and Companies) have no dedicated React routes. This breaks the contact hierarchy: `Company → Client Contact → Deal → Invoice`.  
**Required Fix:** Implement `/clients` and `/companies` routes using `ui-2/clients.html` and `ui-2/companies.html`.

---

### Risk E — Multi-Level Leave Approval UI Gap (HIGH)
**Severity:** 🟠 HIGH  
**Affected Screen:** `/leave`  
**Description:** The backend supports Manager → HR → Finance multi-level leave approval chains. The React UI only shows single-tier approval. This means HR cannot act on leaves escalated from managers.  
**Required Fix:** Add approval tier display and action buttons to the leave management page.

---

### Risk F — Global Task Kanban Missing (RESOLVED)
**Severity:** 🟢 RESOLVED  
**Affected Screen:** `ui-2/task-board.html`  
**Resolution:** Implemented `/task-board` with exact HTML visual parity from `ui-2/task-board.html`. Features 6 Kanban columns (`To Do`, `Pending`, `Inprogress`, `On-hold`, `Review`, `Completed`), project team avatar stacks, real-time task count KPIs, priority pills (`All`, `High`, `Medium`, `Low`), project filter dropdown, sort controls, CSV export, "+ Add Board" modal, "+ Add Task" modal, card movement controls, edit task dialog, and delete confirmation. Fully integrated with backend MySQL Prisma (`ProjectTask`, `Project`), enforced request-scoped multi-tenant isolation, and verified with 7 automated end-to-end integration tests.

---

### Risk G — Recurring Invoices Not Implemented (RESOLVED)
**Severity:** 🟢 RESOLVED  
**Affected Screen:** `ui/recurring-invoices.html`  
**Resolution:** Implemented `/recurring-invoices` with full HTML-to-React UI parity, MySQL Prisma persistence (`RecurringInvoice`, `RecurringInvoiceItem`), automatic invoice generation engine (`generateInvoiceFromRecurringSchedule`), idempotency duplicate prevention, and integration with system cronjob scheduler (`recurring_invoice_generation_cron`). 100% verified with automated test suite.

---

### Risk H — WFH Request Workflow Missing (MEDIUM)
**Severity:** 🟡 MEDIUM  
**Affected Screen:** `ui-2/work-from-home.html`  
**Description:** Work From Home approval workflow is not implemented. Remote-first or hybrid organizations require this.  
**Required Fix:** Implement `/wfh-requests` route.

---

### Risk I — HR Lifecycle Screens Missing (MEDIUM)
**Severity:** 🟡 MEDIUM  
**Affected Screens:** `probation-management.html`, `promotion.html`  
**Description:** Probation period tracking and promotion record management screens are absent. These are standard HR lifecycle events.  
**Required Fix:** Implement `/probation` and `/promotions` routes.

---

### Risk J — Backup / Restore Not Live (LOW-MEDIUM)
**Severity:** 🟡 MEDIUM  
**Affected Screen:** `/super/backup`  
**Description:** The backup page records metadata but does not perform actual `mysqldump` streaming or MySQL restore import. In a production SaaS, this is a data safety risk.  
**Required Fix:** Wire backend to `mysqldump` binary with streaming download; implement import upload endpoint.

---

## 3. Frontend-Specific Risks

### Risk K — Large Monolithic Route Files
Several route files exceed 1,500 lines:
| File | Lines | Risk |
|------|------:|------|
| `employees.tsx` | ~2,100 | Hard to maintain, slow HMR |
| `products.tsx` | ~1,970 | Component extraction needed |
| `pos.tsx` | ~1,430 | Offline state management missing |
| `payroll.tsx` | ~1,400 | Complex tax logic in UI layer |
| `attendance.tsx` | ~1,250 | Biometric sync logic mixed with UI |

**Recommendation:** Extract shared modals and dialog components into `src/components/` sub-directories progressively.

---

### Risk L — Static Data Still Present in Some Screens
Several lower-priority screens were scaffolded with static/placeholder data and have not been fully API-integrated:
| Screen | Route | Static Data Risk |
|--------|-------|-----------------|
| IT Admin Dashboard | `/it-admin-dashboard` | KPI cards static |
| AI Hiring Forecast | Missing | N/A |
| Payroll Dashboard | `/payroll-dashboard` | Some summary cards static |
| Recruitment Dashboard | `/recruitment-dashboard` | Pipeline chart partially static |

---

### Risk M — Mobile Responsive Gaps
| Screen | Issue |
|--------|-------|
| Accounting (`/accounting`) | Dense financial tables require horizontal scroll |
| POS Terminal (`/pos`) | Cart sidebar overlaps product grid on tablet |
| Payroll (`/payroll`) | Payslip table requires scroll on mobile |
| Attendance Matrix | 31-column monthly matrix overflows |

---

## 4. Backend-Specific Risks

### Risk N — Missing Prisma Models for MISSING Screens
The following MISSING screens will require new Prisma models before Phase 2 API integration:

| Screen | Required New Models |
|--------|-------------------|
| Overtime Tracking | `OvertimeRequest`, `OvertimeApproval` |
| WFH Requests | `WFHRequest`, `WFHApproval` |
| Probation Management | `ProbationRecord`, `ProbationReview` |
| Promotion Records | `PromotionRecord` |
| Provident Fund | `PFContribution`, `ESIContribution` |
| Certification Tracking | `EmployeeCertification` |
| Recurring Invoices | `RecurringInvoice`, `RecurringInvoiceItem` |
| Marketing Campaigns | `Campaign`, `CampaignContact` |
| Campus Hiring | `CampusEvent`, `CampusApplication` |
| Referrals | `JobReferral` |

---

### Risk O — WebSocket Tenant Isolation
Real-time notifications via Socket.io must enforce `tenantId` room isolation. Risk exists if a socket event is broadcast to `io.emit()` instead of `io.to(tenantRoom).emit()`.

**Required Verification:** Audit all `server/src/socket.ts` event emissions for tenant room scoping before Phase 3 testing.

---

## 5. Phase 1 Migration Checklist (Pre-requisites)

Before implementing any new screen from the MISSING list:

- [ ] Inspect the complete HTML source file (layout, CSS, JS interactions, static data)
- [ ] Check if a backend route exists in `server/src/routes/`
- [ ] Check if a Prisma model exists in `server/prisma/schema.prisma`
- [ ] Check if the data is stored in CMS JSON blob or relational table
- [ ] Map all form fields to Prisma model fields
- [ ] Identify tenant isolation requirements (`tenant_id` foreign key)
- [ ] Identify RBAC requirements (which roles can access)
- [ ] Identify any add-on entitlement requirements (`requireAddon`)
- [ ] Implement React UI matching HTML visual parity
- [ ] Use only static data in Phase 1 (no API calls)
- [ ] Run `npx tsc --noEmit` — must pass with 0 errors
- [ ] Visual compare HTML vs React (same viewport, same data)
- [ ] Present for UI approval before Phase 2

---

## 6. Recommended First Migration Target

**Recommended:** `ui-2/overtime.html` → `/overtime`

**Justification:**
1. High business priority (payroll accuracy)
2. Clearly bounded scope (single list view + create/approve modal)
3. Has a clear HTML reference in `ui-2/overtime.html`
4. Connects to existing `attendance.routes.ts` backend
5. Simple enough to validate the Phase 0→1→2 migration pipeline
6. Serves as a template for similar HR workflow screens (WFH, Probation, Promotions)

**Alternative First Target:** `ui-2/clients.html` → `/clients`
- If CRM is higher business priority, implement Client Directory first
- Connects to existing `crm.routes.ts` or `customers.routes.ts`
- Unblocks Company and Call History screens

---

## 7. Approval Gates Summary

| Gate | Condition | Status |
|------|-----------|--------|
| Phase 0 Complete | Audit documents created | ✅ **COMPLETE** |
| HTML Inventory Done | All HTML files cataloged | ✅ **COMPLETE** |
| Screen Mapping Done | All screens mapped to routes | ✅ **COMPLETE** |
| API Mapping Done | See `BACKEND_TO_FRONTEND_API_MAPPING.md` | ✅ **EXISTS** |
| Risk Report Done | This document | ✅ **COMPLETE** |
| **Phase 1 Start Approval** | User approves first target screen | ⏳ **PENDING** |

---

*End of MIGRATION_GAP_AND_RISK_REPORT.md — Phase 0*
