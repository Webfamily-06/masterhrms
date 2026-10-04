# Wave 4 Frontend Dependency & Portal Architecture Matrix

**Document Reference:** `WAVE_4_FRONTEND_DEPENDENCY_MATRIX.md`  
**Audit Timestamp:** 2026-09-29T11:50:00+05:30  
**Scope:** Architectural Decomposition of all Wave 4 Implementation Steps (4.0 to 4.7) Across Portals, APIs, UI Views, and Preconditions  

---

## 1. Wave 4 Roadmap Structure & Step Breakdown

Wave 4 covers **CRM Sales Funnel & Taskly Project Management**, establishing deep bi-directional links with Wave 2 (Employees, Users) and Wave 3 (Customer Directory, Product Catalog, Tax Rates, B2B Invoices, and General Ledger Auto-Posting).

```
Wave 4.0 (Cleanup & Readiness)
   │
   ├─► Wave 4.1 (CRM Lead Pipeline & Deal Stages)
   │      │
   │      └─► Wave 4.2 (Proposals, Public Portal, Signing & Invoice Conversion)
   │
   └─► Wave 4.3 (Project Master, Milestones & Team Allocation)
          │
          ├─► Wave 4.4 (Task Kanban & Gantt / Timeline)
          │
          ├─► Wave 4.5 (Defect & Bug Tracking Queue)
          │
          └─► Wave 4.6 (Timesheets & Milestone Billing Engine)
                 │
                 └─► Wave 4.7 (Dedicated Automated Tests & Parity Lock)
```

---

## 2. Step-by-Step Dependency & Portal Architecture

---

### Step 4.0: Repository Cleanup, Parity Audit & Baseline Readiness
- **Objective:** Clean obsolete artifacts, establish strict four-portal baseline, resolve compiler issues.
- **Portals Involved:** Super Admin, Tenant Admin, Employee, Client.
- **Required Backend Work:** Zero code modifications during audit; verify test suite (139/139 assertions passing).
- **Required Frontend Work:** Perform repository cleanup after user consent; fix portal authentication routing (`src/routes/auth.tsx`).
- **Dependencies:** Waves 1, 2, and 3 regression lock.
- **Acceptance Criteria:** Backend compilation 0 errors; Frontend build clean; Audit reports delivered.

---

### Step 4.1: CRM Lead Pipeline & Custom Deal Stages
- **Objective:** Visual Kanban stage progression for prospective client leads and deal values, tracking communication logs and contact details.
- **Portals Involved:**
  - **Tenant Admin:** Full pipeline configuration, lead management, drag-and-drop stage updates.
- **Required Backend Functionality:**
  - `CrmLead` model (existing in Prisma) + `CrmPipeline` / `CrmStage` for customizable stages.
  - Endpoints: `GET /api/crm/leads`, `POST /api/crm/leads`, `PATCH /api/crm/leads/:id/stage`, `POST /api/crm/leads/:id/convert`.
- **Required Frontend Views:**
  - Enhance `src/routes/_authenticated/_app/crm.tsx` with customizable pipeline selector and drag-and-drop Kanban.
  - `src/routes/_authenticated/_app/crm-dashboard.tsx`: Connect funnel conversion rate charts to live MySQL data.
- **RBAC & Scoping:** `crm.leads.view`, `crm.leads.create`, `crm.leads.manage`; strict `tenant_id` isolation.
- **Dependencies:** Wave 2 Employee Directory (for `assignedTo` sales reps).

---

### Step 4.2: Proposals, Public Client Portal, Digital Signing & Invoice Conversion
- **Objective:** Draft and send quotations; public client digital signing; automated one-click conversion to Wave 3 Sales Invoice.
- **Portals Involved:**
  - **Tenant Admin:** Proposal line-item builder with tax rates, convert-to-invoice action.
  - **Client Portal (Public):** Review terms, download PDF, accept/decline with digital signature name.
- **Required Backend Functionality:**
  - `CrmProposal` model (existing in Prisma).
  - Endpoints: `GET /api/crm/proposals`, `POST /api/crm/proposals`, `GET /api/crm/proposals/public/:id`, `POST /api/crm/proposals/public/:id/respond`, `POST /api/crm/proposals/:id/convert`.
  - Transaction: Converting proposal creates `Sale` record, calls `autoPostSaleToLedger` (balanced GL debit/credit).
- **Required Frontend Views:**
  - `src/routes/_authenticated/_app/proposals.tsx`: Complete line-item quotation builder.
  - `src/routes/portal.proposals.$id.tsx`: Public client digital acceptance view (already implemented, needs integration verification).
- **RBAC & Scoping:** Admin: `crm.proposals.manage`; Public: Token-scoped unauthenticated access.
- **Dependencies:** Wave 3 Invoicing (`Sale`, `SaleDetail`), Tax Rates (`TaxRate`), GL Auto-Posting (`autoPostSaleToLedger`).

---

### Step 4.3: Project Master, Milestones & Team Allocation
- **Objective:** Deliver comprehensive project planning, tracking budgets, milestones, and employee team assignments.
- **Portals Involved:**
  - **Tenant Admin:** Project master directory, budget planning, client binding, milestone definitions.
  - **Client Portal:** Client view of active projects and deliverable milestones.
- **Required Backend Functionality:**
  - `Project` model (existing) + `ProjectMilestone` (`title`, `cost`, `status`, `dueDate`).
  - Endpoints: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id/milestones`, `POST /api/projects/:id/milestones`.
  - Add client-scoped route: `GET /api/client/projects` (filters by authenticated client ID).
- **Required Frontend Views:**
  - `src/routes/_authenticated/_app/projects.tsx`: Project overview tab, milestone list with progress bars.
  - `src/routes/_authenticated/_app/client-dashboard.tsx`: Connect projects table to client-scoped API.
- **RBAC & Scoping:** Admin: `projects.view`, `projects.create`; Client: `client.projects.view`; strict `tenant_id`.
- **Dependencies:** Wave 2 Employee Directory (for team allocation); Wave 3 Customer Master (`Customer`).

---

### Step 4.4: Task Kanban & Visual Scheduling (Gantt / Timeline)
- **Objective:** Responsive drag-and-drop task stage progression (`todo`, `in_progress`, `review`, `done`), priority queues, and Gantt chart timeline view.
- **Portals Involved:**
  - **Tenant Admin / Project Team:** Task management, reordering, milestone assignment.
  - **Employee Portal:** "My Assigned Tasks" view.
- **Required Backend Functionality:**
  - `ProjectTask` model (existing).
  - Endpoints: `GET /api/projects/:id/tasks`, `POST /api/projects/:id/tasks`, `PATCH /api/projects/tasks/:id/status`.
- **Required Frontend Views:**
  - Enhance `src/routes/_authenticated/_app/projects.tsx`: Add Gantt chart timeline tab (using SVG / canvas or lightweight timeline renderer).
  - Add "My Tasks" section to `src/routes/_authenticated/_app/employee-dashboard.tsx`.
- **RBAC & Scoping:** `projects.tasks.manage`; strict `tenant_id`.
- **Dependencies:** Step 4.3 Project Master.

---

### Step 4.5: Defect & Bug Tracking Queue
- **Objective:** Track project defects, severity classifications (Low, Medium, High, Critical), reproduction steps, and resolution lifecycle.
- **Portals Involved:**
  - **Tenant Admin / Developer Team:** QA bug reporting and developer assignment.
  - **Client Portal:** Report issue directly to project manager.
- **Required Backend Functionality:**
  - `ProjectBug` model: `id`, `tenantId`, `projectId`, `title`, `description`, `severity`, `status` (`unconfirmed`, `confirmed`, `in_progress`, `resolved`), `assignedTo`, `reportedBy`.
  - Endpoints: `GET /api/projects/:id/bugs`, `POST /api/projects/:id/bugs`, `PATCH /api/projects/bugs/:id/status`.
- **Required Frontend Views:**
  - `src/routes/_authenticated/_app/projects.tsx`: Dedicated "Bugs & Issues" tab with severity badges.
  - `src/routes/_authenticated/_app/client-dashboard.tsx`: Bug submission modal.
- **RBAC & Scoping:** `projects.bugs.manage`; strict `tenant_id`.
- **Dependencies:** Step 4.3 Project Master.

---

### Step 4.6: Timesheets & Milestone Billing Engine
- **Objective:** Convert logged employee timesheets and completed milestones directly into Wave 3 Sales Invoices with automated tax and SAC code calculations.
- **Portals Involved:**
  - **Tenant Admin / Finance:** Milestone invoice generation, timesheet approval.
  - **Employee Portal:** Weekly / daily timesheet logging interface.
- **Required Backend Functionality:**
  - `ProjectTimesheet` model: `id`, `tenantId`, `projectId`, `taskId`, `employeeId`, `date`, `hours`, `hourlyRate`, `billable`, `isBilled`, `invoiceId`.
  - Endpoints: `GET /api/projects/timesheets`, `POST /api/projects/timesheets`, `POST /api/projects/:id/generate-invoice`.
  - Transaction: Generates Wave 3 `Sale` with sequential invoice number, links to customer, auto-posts journal entry via `autoPostSaleToLedger`.
- **Required Frontend Views:**
  - New route: `src/routes/_authenticated/_app/timesheets.tsx` (Weekly calendar timesheet grid).
  - `src/routes/_authenticated/_app/projects.tsx`: "Generate Milestone Invoice" modal.
- **RBAC & Scoping:** Admin: `projects.billing.manage`; Employee: `projects.timesheets.log`.
- **Dependencies:** Step 4.3 Project Master, Wave 3 Invoicing & GL Engine.

---

### Step 4.7: Dedicated Automated Tests & Parity Lock
- **Objective:** 100% automated regression coverage locking all Wave 4 CRM and Project Management workflows.
- **Target Test File:** `server/src/tests/wave4-crm-projects.test.ts`.
- **Scope of Test Suite:**
  1. Lead creation, Kanban stage transitions, and tenant isolation.
  2. Proposal creation, digital signature acceptance, and automated invoice conversion.
  3. Milestone creation, task drag-and-drop reordering.
  4. Timesheet entry, billable rate computation, and milestone invoice generation with balanced GL ledger entries.
  5. Cross-tenant leakage prevention (Tenant B cannot access Tenant A leads or projects).
- **Gate Requirement:** 100% pass rate across all Wave 1, Wave 2, Wave 3, and Wave 4 suites.
