# MASTERHRMS — SIDEBAR & NAVIGATION ARCHITECTURE AUDIT

**Document Target:** Navigation Menus, Role-Based Access, Active/Collapsed States & Mobile Drawer  
**Date of Audit:** November 3, 2026  
**Auditor:** Antigravity Advanced Agentic Engineering Team  
**Audit Scope:** Full Application Navigation System (`src/components/dreams-sidebar.tsx`, `src/components/navigation/*`, `src/nav/*`, `src/routes/_authenticated/_app/route.tsx`)  
**Status:** COMPLETE NAVIGATION AUDIT

---

## 1. NAVIGATION ARCHITECTURE OVERVIEW

MasterHRMS features a dual navigation system resulting from an incomplete architectural transition between legacy ERP navigation and modern portal-based navigation:

1. **Active Shell Sidebar:** [`src/components/dreams-sidebar.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/dreams-sidebar.tsx) (2,508 lines)  
   - This component is mounted inside the main application shell ([`src/routes/_authenticated/_app/route.tsx:162`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/route.tsx#L162)).
   - It contains a massive legacy implementation featuring CRM, Sales, Invoicing, Accounting, Recruitment, and HRMS menus with mixed imperative DOM manipulation (`document.body.classList.toggle`).
2. **Modular Portal Navigation:** [`src/components/navigation/portal-sidebar.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/navigation/portal-sidebar.tsx) and navigation data schemas in [`src/nav/hr-sidebar.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/nav/hr-sidebar.ts) and [`src/nav/employee-sidebar.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/nav/employee-sidebar.ts).
   - Represents the intended modern architecture separating **HR Administrator Portal** (7 functional sections) from **Employee Self Service Portal** (11 personal sections).
   - Currently **disconnected** from the active route tree shell, leaving the monolithic `DreamsSidebar` in production.

---

## 2. NAVIGATION DATA SCHEMAS & PORTAL STRUCTURE

### 2.1. HR Administrator Navigation (`src/nav/hr-sidebar.ts`)

Configured with 7 authoritative administrative sections:

```typescript
export interface NavItem {
  id: string;
  title: string;
  path?: string;
  icon?: LucideIcon;
  badge?: string | number;
  roles?: string[];
  permission?: { module: string; action: string };
  children?: NavItem[];
}
```

| Section Title | Purpose & Target Routes | Role & Permission Filtering |
|---|---|---|
| **Main** | Admin Dashboard (`/`), Analytics (`/dashboard/analytics`), Operations | Super Admin, HR Admin |
| **Employee** | Employee Directory (`/employees`), Lifecycle, Org Chart, Documents | Role-restricted (`module: "employees", action: "view"`) |
| **Attendance & Leaves** | Attendance Tracking (`/attendance`), Biometrics, Shift Roster, Leave Management | Role-restricted (`module: "attendance", action: "view"`) |
| **Payroll** | Salary Processing (`/payroll`), Statutory, Form 16, Reimbursements | Restricted to Finance & HR Super Admins |
| **Performance** | Appraisals, OKRs, Feedback Reviews (`/performance`) | Manager, HR Admin |
| **Administration** | Company Structure, Branch Management, Role & Permission RBAC | Super Admin Only |
| **Settings** | System Configuration, Notifications, Integrations, Audit Logs | Super Admin Only |

### 2.2. Employee Self Service Navigation (`src/nav/employee-sidebar.ts`)

Configured with 11 personal employee sections:
- **My Workspace:** Dashboard, Announcements, Tasks
- **Profile:** My Profile, Emergency Contacts, Documents, Qualifications
- **Attendance:** Punch In/Out, Monthly Timesheets, Regularization Requests
- **Leaves:** Balance Overview, Apply Leave, Leave History
- **Claims & Expenses:** Reimbursements, Travel Claims, Advance Requests
- **Performance & Goals:** My OKRs, Self-Appraisal, Reviews
- **Learning & Growth:** Training Programs, Certifications
- **Projects & Tasks:** Assigned Tasks, Timesheet Logging
- **Documents:** Payslips, Form 16, Appointment Letters, Policies
- **Assets:** Assigned Laptops, Devices, Acknowledgements
- **Help & Support:** Internal Helpdesk, HR Grievances

---

## 3. SIDEBAR STATES & RESPONSIVE BEHAVIOR

### 3.1. Desktop Display Modes (Width ≥ 1024px)

1. **Full Expanded Mode (`250px` width):**
   - Authoritative width defined in [`src/styles.css:91`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L91):
     `width: 250px; position: fixed; top: 0; bottom: 0; left: 0; z-index: 1000;`
   - Content canvas receives `margin-left: 250px` (or `padding-left: 250px`).
   - Accordion submenus expand vertically inline with smooth chevron rotation.
2. **Mini-Rail Mode (`72px` width):**
   - Activated by toggle button in header or system state (`mini-sidebar` class).
   - Text labels and section headers are visually hidden (`opacity: 0` or `display: none`).
   - Icons remain centered. Submenus open as floating hover flyouts.
3. **Full-View Canvas Mode (`⌘B` / `Ctrl+B`):**
   - Implemented in [`src/routes/_authenticated/_app/route.tsx:55-82`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/_app/route.tsx#L55-L82):
     ```typescript
     const [fullView, setFullView] = useState(false);
     useEffect(() => {
       const handleKeyDown = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === "b") {
           e.preventDefault();
           setFullView(prev => !prev);
         }
       };
       window.addEventListener("keydown", handleKeyDown);
       return () => window.removeEventListener("keydown", handleKeyDown);
     }, []);
     ```
   - When `fullView === true`, the sidebar is completely unmounted or hidden (`display: none`), expanding `.main-content` to 100% viewport width.

### 3.2. Mobile Slide-Nav Drawer (Width < 1024px)

- In [`src/styles.css:101-118`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/styles.css#L101-L118):
  - Desktop sidebar hidden via `.sidebar { display: none; }`.
  - When `.main-wrapper.slide-nav` is toggled:
    - Drawer slides in from left: `position: fixed; width: 275px; z-index: 100000; background: var(--card);`
    - Backdrop overlay activates: `position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99990;`
- **Dismissal Mechanism:**
  - Clicking anywhere on the backdrop overlay triggers removal of `.slide-nav`.
  - In `AppShell` (`src/routes/_authenticated/_app/route.tsx`), route navigation automatically cleans up `.slide-nav`, ensuring the mobile drawer closes on navigation.

---

## 4. NAVIGATION DEFECTS & ARCHITECTURAL GAPS

### 4.1. Two Parallel Sidebar Codebases (`GAP-UI-010`)
- **Severity:** High (Technical Debt & Maintainability)
- **Finding:**
  The production application shell continues to load `DreamsSidebar` (a 2,508-line legacy file) instead of the clean, modular, typed `PortalSidebar` (`src/components/navigation/portal-sidebar.tsx`).
- **Consequence:**
  - Route additions require manual editing of the 2,508-line file.
  - Stale ERP navigation nodes (e.g., invoices, deals, projects) continue to render for HR users even when irrelevant to HRMS operations.

### 4.2. Stale Navigation Links & Redirects
- **Finding:**
  Within `DreamsSidebar`, several nested links point to legacy ERP paths (e.g., `/deals`, `/estimates`, `/sales-invoices`).
- **Behavior:**
  Clicking these links causes client-side route fallback to the root dashboard (`/`) or displays blank layout canvases, confusing users.

### 4.3. Imperative DOM Manipulation in Navigation
- **Finding:**
  `DreamsSidebar` utilizes direct `document.body.classList.toggle("mini-sidebar")` and `document.querySelector(".sidebar")?.classList.add(...)` calls rather than React state and context providers.
- **Consequence:**
  In SSR or fast navigation transitions, sidebar collapsed state becomes desynchronized with local storage preferences.

---

## 5. REMEDIATION PLAN

1. **Retire `DreamsSidebar`:** Swap `DreamsSidebar` in `src/routes/_authenticated/_app/route.tsx` with `PortalSidebar`.
2. **Wire Navigation Schemas:** Connect `hr-sidebar.ts` and `employee-sidebar.ts` through a unified `useNavigation()` hook driven by TanStack Router active state and user session RBAC.
3. **Purge Non-HRMS Navigation Nodes:** Remove deprecated ERP routes (`deals`, `estimates`, `pos`, etc.) from the primary HRMS navigation tree.
4. **Transition to React Context:** Replace all imperative `document.body.classList` mutations with a centralized `NavigationProvider` managing `{ isCollapsed, isMobileOpen, currentPortal }`.

