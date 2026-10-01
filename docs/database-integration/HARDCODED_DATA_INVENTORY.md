# HARDCODED DATA INVENTORY
## Catalog of All Static, Mock, Dummy, and In-Memory Business Records Identified

---

## 1. Inventory Summary

This catalog documents every unintended static array, mock fallback, in-memory object, hardcoded currency figure, and legacy `.html` link discovered in the codebase.

---

## 2. Detailed Itemization of Mock & Hardcoded Data

### 2.1 Todo Tracker (`src/routes/_authenticated/_app/todo.tsx`)
- **Location**: Lines 70–111.
- **Identified Mock Data**:
  - `INITIAL_TODOS`: Hardcoded array of 4 mock tasks ("Review monthly payroll tax deductions & register", "Conduct candidate technical round...", "Audit company hardware asset register...", "Draft updated Work From Home policy").
  - `localStorage.getItem("hrms_todos_${tenantId}")`: Unsafe client-side storage with zero multi-device synchronization or backend audit trail.
- **Required Remediation**:
  - Implement `WorkspaceTodo` model in Prisma.
  - Implement `/api/todos` CRUD router.
  - Connect UI via TanStack `useQuery` and `useMutation`.

### 2.2 Workspace Notes (`src/routes/_authenticated/_app/notes.tsx`)
- **Location**: Lines 74–108.
- **Identified Mock Data**:
  - `INITIAL_NOTES`: Hardcoded array of 3 mock notes ("HR Onboarding Protocol 2026", "Monthly Payroll Run Checkpoints", "Sprint Retrospective Notes").
  - `localStorage.getItem("hrms_notes_${tenantId}")`: Browser-only storage without relational persistence.
- **Required Remediation**:
  - Implement `WorkspaceNote` model in Prisma.
  - Implement `/api/notes` CRUD router.
  - Connect UI via TanStack `useQuery` and `useMutation`.

### 2.3 Calendar Events (`src/routes/_authenticated/_app/calendar.tsx`)
- **Location**: Lines 146–166.
- **Identified Mock Data**:
  - `localStorage.getItem("hrms_calendar_events_${tenantId}")`: Client-side storage for calendar appointments.
- **Required Remediation**:
  - Implement `CalendarEvent` model in Prisma.
  - Implement `/api/calendar/events` CRUD router.
  - Connect UI via TanStack `useQuery` and `useMutation`.

### 2.4 Static Mock Dashboards (Hardcoded $ Values & Tables)
1. **`src/routes/_authenticated/_app/crm-dashboard.tsx`**:
   - Hardcoded metrics: `$125,000` (Total Leads), `$154,000` (Deals Closed), `$185,000` (Opportunities), `$210,000` (Total Revenue).
   - Hardcoded lead rows with static names and companies.
   - Dead `.html` links: `leads.html`, `deals.html`, `contacts.html`.
2. **`src/routes/_authenticated/_app/project-dashboard.tsx`**:
   - Hardcoded metrics: `45` (Total Projects), `18` (In Progress), `8` (Pending Review), `19` (Completed).
   - Hardcoded task table and project list.
   - Dead `.html` links: `tasks.html`, `milestones.html`, `departments.html`.
3. **`src/routes/_authenticated/_app/procurement-dashboard.tsx`**:
   - Hardcoded metrics: `$425,000` (Total Spend), `$312,000` (Approved Orders), `$65,000` (Pending Deliveries).
   - Dead `.html` links: `procurement-analytics.html`.
4. **`src/routes/_authenticated/_app/support-dashboard.tsx`**:
   - Hardcoded metrics: `248` (Total Tickets), `18` (Open Tickets), `42` (In Progress), `188` (Resolved).
   - Dead `.html` links: `tickets.html`.
5. **`src/routes/_authenticated/_app/it-admin-dashboard.tsx`**:
   - Hardcoded asset counts (`142` Assigned, `28` In Stock, `6` Under Repair).
   - Hardcoded activity feed.
6. **`src/routes/_authenticated/_app/recruitment-dashboard.tsx`**:
   - Hardcoded stats (`24` Openings, `418` Applications, `38` Shortlisted, `12` Hired).

### 2.5 AI Insights Pages (Static Chart Series)
1. **`src/routes/_authenticated/_app/ai-attendance-insights.tsx`**:
   - Static array `trendSeries` with fixed mock values `[92, 94, 91, 95, 93, 96, 94]`.
2. **`src/routes/_authenticated/_app/ai-payroll-forecast.tsx`**:
   - Static arrays `payrollForecastSeries` and `varianceSeries` with fake month-by-month values.
3. **`src/routes/_authenticated/_app/ai-team-performance-insights.tsx`**:
   - Static array `ppeSeries` with hardcoded scores `[84, 88, 82, 90, 86, 91]`.
4. **`src/routes/_authenticated/_app/learning-analytics.tsx`**:
   - Static array `learnEmployeeSeries` with hardcoded course hours.

---

## 3. Allowed Static Constants (Legitimate Exceptions)
The following static arrays were reviewed and confirmed as legitimate configuration constants:
- **`src/routes/_authenticated/super/roles.tsx`**: `SYSTEM_PERMISSIONS` (Core permission key identifiers).
- **`src/routes/_authenticated/super/settings.tsx`**: `COLOR_PRESETS` (Hex themes).
- **`src/routes/_authenticated/_app/ai-writer.tsx`**: `CREATIVITY_LEVELS`, `LENGTH_OPTIONS`, `CONTENT_TYPES` (AI prompt parameters).
- **`src/routes/_authenticated/_app/custom-fields.tsx`**: `FIELD_TYPES` (Data types: text, number, date, select).
