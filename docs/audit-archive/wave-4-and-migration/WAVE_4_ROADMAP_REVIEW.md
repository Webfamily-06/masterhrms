# PHASE C · WAVE 4 — AUTHORITATIVE ROADMAP REVIEW
## Strategic & Technical Architecture for CRM Sales Funnel & Taskly Project Management

**Document Reference:** `WAVE_4_ROADMAP_REVIEW.md`  
**Audit Date:** 2026-09-29  
**Authoritative Sources:**
- [LARAVEL_MIGRATION_ROADMAP.md](file:///Users/apple/Documents/hrms/LARAVEL_MIGRATION_ROADMAP.md) (`lines 29, 68–72`)
- [PHASE_B_MIGRATION_WAVE_PLAN.md](file:///Users/apple/Documents/hrms/PHASE_B_MIGRATION_WAVE_PLAN.md) (`lines 75–81`)
- [PHASE_0_ENTERPRISE_ARCHITECTURE_BLUEPRINT.md](file:///Users/apple/Documents/hrms/PHASE_0_ENTERPRISE_ARCHITECTURE_BLUEPRINT.md)

---

## 1. Title & High-Level Objectives

- **Authoritative Title:** **Wave 4: CRM & Taskly Project Management** (alternatively cited as *CRM Sales Funnel & Taskly Project Management*).
- **Core Business Objectives:**
  1. **CRM Pipeline & Sales Funnel:** Provide visual Kanban stage progression for prospective client leads and deal values, tracking communication logs and contact details.
  2. **Custom Sales Proposals & Conversion Pipeline:** Enable drafting, sending, and public client approval/signing of professional proposals, with automated one-click conversion into formal Wave 3 Sales Invoices.
  3. **Taskly Project Management:** Deliver comprehensive project planning, tracking budgets, milestones, and task assignment.
  4. **Interactive Task Kanban & Visual Scheduling:** Provide responsive drag-and-drop task stage progression (`todo`, `in_progress`, `review`, `done`), priority queues, and Gantt chart timelines.
  5. **Defect & Bug Tracking:** Track project bugs, severity classifications, and developer resolution lifecycles.
  6. **Milestone & Timesheet Billing:** Convert logged project timesheets and completed milestones directly into Wave 3 Sales Invoices with automated tax and SAC code calculations.

---

## 2. Dependencies & Prerequisites

- **Wave 1 Framework Dependency:** Centralized authentication (`requireAuth`), tenant isolation (`resolveTenantContext`), role-based permissions (`crm.*`, `projects.*`), and audit logging.
- **Wave 2 HRMS Dependency:** Employee directory (`Employee`, `User`) for project team assignments, task assignees, and lead ownership.
- **Wave 3 Financial & Invoicing Dependency:** Product catalog (`Product`, `TaxRate`), Customer master (`Customer`), and Sales Invoicing engine (`Sale`, `SaleDetail`, `autoPostSaleToLedger`) for proposal-to-invoice and milestone billing conversions.
- **Prerequisite Clean-Up (Step 4.0):**
  - Fix the 2 TypeScript errors in [server/src/routes/projects.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/projects.routes.ts) (remove invalid `unitPrice` field and update invoice status reference).
  - Register `PurchasePayment` in [tenant-models.config.ts](file:///Users/apple/Documents/hrms/server/src/config/tenant-models.config.ts).
  - Synchronize migration `20260928000002_step_3_6_returns_credit_debit_notes` in `_prisma_migrations`.

---

## 3. Database Architecture & Expected Schema Evolution

### Current Wave 4 Models in [server/prisma/schema.prisma](file:///Users/apple/Documents/hrms/server/prisma/schema.prisma):
1. `CrmLead`: Captures leads with `contactName`, `email`, `phone`, `stage` (`new`, `contacted`, `qualified`, `proposal`, `won`, `lost`), `value`, `priority`, `source`, `notes`, `assignedTo`.
2. `CrmProposal`: Captures proposals with `proposalNo`, `title`, `clientName`, `clientEmail`, `status` (`draft`, `sent`, `accepted`, `declined`), `amount`, `validUntil`, `items` (JSON), `terms`.
3. `Project`: Captures projects with `name`, `description`, `status` (`in_progress`, `completed`, `on_hold`), `budget`, `progress`, `startDate`, `dueDate`, `clientName`.
4. `ProjectTask`: Captures tasks linked to `Project` with `title`, `description`, `status` (`todo`, `in_progress`, `review`, `done`), `priority`, `assignedTo`, `dueDate`.

### Required Architectural Extensions for Full Wave 4 Parity:
To match Laravel WorkDo CRM & Taskly parity without schema churn, the following relational additions are planned:
- `CrmPipeline` & `CrmStage`: Enable custom customizable stages per tenant (currently hardcoded enum strings in `CrmLead`).
- `ProjectMilestone`: Support milestone billing tied to deliverables (`title`, `cost`, `status`, `dueDate`).
- `ProjectBug`: Dedicated bug tracking model (`projectId`, `title`, `severity`, `status`, `assignedTo`).
- `ProjectTimesheet`: Billable hours logging per employee and task (`hours`, `date`, `hourlyRate`, `isBilled`, `invoiceId`).

---

## 4. API & Backend Architecture

Target Backend Routers:
1. [server/src/routes/crm.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/crm.routes.ts):
   - `GET /api/crm/leads` & `POST /api/crm/leads` (Kanban retrieval & lead creation)
   - `PATCH /api/crm/leads/:id/stage` (Drag-and-drop Kanban movement)
   - `GET /api/crm/proposals` & `POST /api/crm/proposals` (Proposal builder)
   - `POST /api/crm/proposals/:id/convert-to-invoice` (Converts accepted proposal into a Wave 3 `Sale` record with sequential invoice numbering, line items, and automated GL ledger posting via `autoPostSaleToLedger`)
   - `GET /api/crm/proposals/public/:id` & `POST /api/crm/proposals/public/:id/sign` (Public client approval portal without auth)
2. [server/src/routes/projects.routes.ts](file:///Users/apple/Documents/hrms/server/src/routes/projects.routes.ts):
   - `GET /api/projects` & `POST /api/projects` (Project master CRUD)
   - `GET /api/projects/:id/tasks` & `POST /api/projects/:id/tasks` (Task creation)
   - `PATCH /api/projects/tasks/:id/status` (Task Kanban column reordering)
   - `POST /api/projects/:id/generate-invoice` (Timesheet & milestone billing conversion)
   - `GET /api/projects/:id/bugs` & `POST /api/projects/:id/bugs` (Bug tracking queue)

---

## 5. Frontend Architecture & Target Views

Target UI Routes in `src/routes/`:
- [src/routes/_authenticated/_app/crm.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/crm.tsx) & [crm-dashboard.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/crm-dashboard.tsx):
  - Visual Kanban board for Leads and Deals with drag-and-drop column transitions.
  - Lead conversion modal into Customer or Proposal.
- [src/routes/_authenticated/_app/proposals.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/proposals.tsx):
  - Line-item proposal builder with live tax calculations.
  - "Convert to Invoice" action button triggering Wave 3 sales invoice generation.
- [src/routes/portal.proposals.$id.tsx](file:///Users/apple/Documents/hrms/src/routes/portal.proposals.$id.tsx):
  - Clean, unauthenticated customer-facing portal to review terms, download PDF, and digitally accept/sign proposals.
- [src/routes/_authenticated/_app/projects.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/projects.tsx) & [project-dashboard.tsx](file:///Users/apple/Documents/hrms/src/routes/_authenticated/_app/project-dashboard.tsx):
  - Interactive project detail passport: Overview, Task Kanban board, Gantt chart view, Bug tracker, and Timesheets.
  - Milestone invoice generation dialog.

---

## 6. Testing & Acceptance Criteria

1. **Lead Stage Transitions:** Dragging a lead from "Qualified" to "Won" updates `stage` in MySQL and maintains tenant isolation.
2. **Proposal to Invoice Conversion:**
   - Accepting a proposal and converting it creates a new `Sale` in Wave 3 with `type: "invoice"`.
   - All line items, quantities, prices, taxes, and customer links carry over identically.
   - Automatically invokes `autoPostSaleToLedger`, creating a balanced journal entry in General Ledger.
3. **Task Kanban Drag-and-Drop:** Task status updates atomically (`todo` -> `in_progress` -> `done`).
4. **Milestone Billing:** Creating an invoice from project timesheets/milestones correctly links to the customer and prevents double-billing for the same logged hours.
5. **Cross-Tenant Security:** Tenant B cannot view or move leads, proposals, projects, or tasks of Tenant A.
6. **Automated Test Gate:** 100% pass rate in a new dedicated test suite: `server/src/tests/wave4-crm-projects.test.ts`.

---

## 7. Analysis of Conflicts with Wave 3 Residuals

| Wave 3 Residual Item | Interaction with Wave 4 Scope | Resolution Strategy |
|---|---|---|
| **Customer Credit Limits** | Wave 4 Proposal conversion creates invoices without credit limit checking. | Add a credit limit validation check during proposal-to-invoice conversion. |
| **Fire-and-Forget GL Posting** | Project and proposal invoices rely on `autoPostSaleToLedger`. | Inherits existing Wave 3 pattern; robust error logging maintained; outbox queue deferred to Wave 5. |
| **TypeScript Errors in `projects.routes.ts`** | Exists in current codebase (lines 410 and 438). | Addressed immediately in Step 4.0 before writing any new Wave 4 endpoints. |
