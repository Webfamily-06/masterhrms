# DATABASE INTEGRATION GAP ANALYSIS

## 1. Context & Objectives

The application-wide audit performed across 206 frontend routes, 57 backend route modules, and 159 Prisma database models revealed that while core Enterprise domains (Employees, Departments, Roles, Leaves, Attendance, Biometrics, Advanced Payroll, Bank Disbursements, and Statutory Returns) are genuinely database-backed, several satellite productivity modules and legacy dashboards contain hardcoded values, mock fallbacks, or browser `localStorage` persistence.

This document details the root causes, file locations, risk profile, and technical remediation for every gap.

---

## 2. Root Cause Analysis of Gaps

1. **Standalone Utility Pages Built as Client-Only SPAs**:
   - `todo.tsx`, `notes.tsx`, and `calendar.tsx` were initially written as client-only components using `localStorage` with mock fallback seed arrays (`INITIAL_TODOS`, `INITIAL_NOTES`).
   - Consequence: Cross-browser, cross-device, and multi-user synchronization fails. Data is lost upon browser cache clearance. No multi-tenant backend auditing.

2. **Legacy HTML Dashboard Templates**:
   - `crm-dashboard.tsx`, `project-dashboard.tsx`, `procurement-dashboard.tsx`, `support-dashboard.tsx`, and `it-admin-dashboard.tsx` were ported from a static HTML dashboard template.
   - Consequence: They retained hardcoded metric numbers (e.g., `$125,000`, `248 tickets`) and static `href="leads.html"` links instead of invoking the existing backend aggregation endpoints in `server/src/routes/dashboard.routes.ts` and using TanStack Router `<Link>`.

3. **Static Sample Series in AI & Analytics Dashboards**:
   - `ai-attendance-insights.tsx`, `ai-payroll-forecast.tsx`, `ai-team-performance-insights.tsx`, and `learning-analytics.tsx` contained static chart data series arrays (`trendSeries`, `payrollForecastSeries`, `varianceSeries`).
   - Consequence: Visual graphs did not reflect live tenant data.

---

## 3. Detailed Gap Inventory & Remediation Specifications

### Gap Group A: Browser LocalStorage Productivity Modules

#### 1. Workspace Todos (`src/routes/_authenticated/_app/todo.tsx`)
- **Current Behavior**: Uses `useState` initialized from `localStorage.getItem("hrms_todos")` or `INITIAL_TODOS` (4 static mock items).
- **Security & Multi-Tenant Risk**: High. Records are unencrypted in browser storage; no tenant isolation or database persistence.
- **Required Backend**:
  - Model: `WorkspaceTodo` in Prisma schema.
  - Endpoints:
    - `GET /api/todos`: List all todos for current user and tenant.
    - `POST /api/todos`: Create a new todo.
    - `PUT /api/todos/:id`: Update completion status, title, description, priority, tag, or due date.
    - `DELETE /api/todos/:id`: Delete todo.
- **Required Frontend**:
  - Replace `localStorage` with `@tanstack/react-query` (`useQuery`, `useMutation`).
  - Eliminate `INITIAL_TODOS`. Show genuine empty state when 0 todos exist.

#### 2. Workspace Notes (`src/routes/_authenticated/_app/notes.tsx`)
- **Current Behavior**: Uses `useState` initialized from `localStorage.getItem("hrms_notes")` or `INITIAL_NOTES` (3 static mock items).
- **Security & Multi-Tenant Risk**: High. Sensitive company notes stored in plain text in browser cache.
- **Required Backend**:
  - Model: `WorkspaceNote` in Prisma schema.
  - Endpoints:
    - `GET /api/notes`: List all notes for current user and tenant.
    - `POST /api/notes`: Create note.
    - `PUT /api/notes/:id`: Update note content, title, pin status, star status, trash status, color.
    - `DELETE /api/notes/:id`: Permanent delete.
- **Required Frontend**:
  - Connect to `/api/notes` using React Query.
  - Eliminate `INITIAL_NOTES`.

#### 3. Calendar Events (`src/routes/_authenticated/_app/calendar.tsx`)
- **Current Behavior**: Uses `localStorage.getItem(\`hrms_calendar_events_\${tenantId}\`)` with static initial events.
- **Security & Multi-Tenant Risk**: High. Events are not queryable by server, calendar invites cannot be synced.
- **Required Backend**:
  - Model: `CalendarEvent` in Prisma schema.
  - Endpoints:
    - `GET /api/calendar/events`: Query events by month/date range.
    - `POST /api/calendar/events`: Create event.
    - `PUT /api/calendar/events/:id`: Update event.
    - `DELETE /api/calendar/events/:id`: Remove event.
- **Required Frontend**:
  - Connect to `/api/calendar/events` using React Query.

---

### Gap Group B: Legacy HTML Dashboards

#### 1. CRM Dashboard (`src/routes/_authenticated/_app/crm-dashboard.tsx`)
- **Current Behavior**: Displays hardcoded cards (`$125,000` pipeline, `$154,000` revenue) and dead links (`href="leads.html"`, `href="deals.html"`).
- **Remediation**:
  - Connect to `/api/dashboard/sales-crm` which aggregates `CrmLead` and `CrmDeal`.
  - Replace `href="*.html"` with TanStack `<Link to="/crm/leads">` and `<Link to="/crm/deals">`.
  - Display actual database sums and counts.

#### 2. Project Dashboard (`src/routes/_authenticated/_app/project-dashboard.tsx`)
- **Current Behavior**: Hardcoded project counts, dead links (`tasks.html`, `milestones.html`).
- **Remediation**:
  - Connect to `/api/dashboard/projects` which aggregates `Project` and `ProjectTask`.
  - Replace `href="*.html"` with `<Link to="/projects">` and `<Link to="/tasks">`.

#### 3. Procurement Dashboard (`src/routes/_authenticated/_app/procurement-dashboard.tsx`)
- **Current Behavior**: Hardcoded `$425,000` spend, dead links (`procurement-analytics.html`).
- **Remediation**:
  - Add `/api/dashboard/procurement` endpoint aggregating `PurchaseOrder` and `Supplier`.
  - Connect dashboard to fetch live figures.

#### 4. Support Dashboard (`src/routes/_authenticated/_app/support-dashboard.tsx`)
- **Current Behavior**: Hardcoded `248 tickets`, dead links (`tickets.html`).
- **Remediation**:
  - Add `/api/dashboard/support` endpoint aggregating `HelpdeskTicket` counts by status and priority.
  - Connect dashboard to fetch live ticket counts and replace dead links with `<Link to="/helpdesk/tickets">`.

#### 5. IT Admin Dashboard (`src/routes/_authenticated/_app/it-admin-dashboard.tsx`)
- **Current Behavior**: Hardcoded asset cards, dead links (`assets.html`).
- **Remediation**:
  - Add `/api/dashboard/it-admin` endpoint aggregating `Asset` and `AssetAssignment`.
  - Connect dashboard to fetch live asset statistics.

#### 6. Recruitment Dashboard (`src/routes/_authenticated/_app/recruitment-dashboard.tsx`)
- **Current Behavior**: Hardcoded pipeline metrics, dead links (`jobs.html`, `candidates.html`).
- **Remediation**:
  - Add `/api/dashboard/recruitment` endpoint aggregating `JobOpening` and `JobCandidate`.
  - Connect dashboard to fetch live recruitment data.

---

### Gap Group C: AI Insights & Analytics Static Series

#### 1. AI Attendance Insights (`src/routes/_authenticated/_app/ai-attendance-insights.tsx`)
- **Current Behavior**: Static `trendSeries` array.
- **Remediation**: Query `/api/attendance` for the last 30 days and dynamically compute the actual daily attendance, late arrival, and absence rates.

#### 2. AI Payroll Forecast (`src/routes/_authenticated/_app/ai-payroll-forecast.tsx`)
- **Current Behavior**: Static `payrollForecastSeries` and `varianceSeries`.
- **Remediation**: Query `/api/payroll/runs` and `/api/payroll/payslips` to aggregate historical payroll disbursement totals over the last 6 months and project the next month's forecast.

#### 3. AI Team Performance Insights (`src/routes/_authenticated/_app/ai-team-performance-insights.tsx`)
- **Current Behavior**: Static `ppeSeries`.
- **Remediation**: Query `/api/performance/reviews` and `/api/okr/objectives` to aggregate average ratings and objective completion percentages.

#### 4. Learning Analytics (`src/routes/_authenticated/_app/learning-analytics.tsx`)
- **Current Behavior**: Static `learnEmployeeSeries`.
- **Remediation**: Query `/api/lms/enrollments` and `/api/lms/courses` to compute real course completion rates.

---

## 4. Tenant Isolation & Security Impact

All new endpoints must enforce tenant isolation by:
1. Deriving `tenantId` strictly from the authenticated JWT session (`req.user.tenantId`).
2. Scoping all database queries through Prisma with explicit `where: { tenantId }` or utilizing the Prisma tenant proxy.
3. Rejecting unauthorized access if an entity does not belong to the user's tenant (returning HTTP 404/403).
4. Ensuring that cross-tenant data leakage is impossible.
