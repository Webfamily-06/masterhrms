# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 01: HR Dashboard & Workforce Management Discovery

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** HR Operations Dashboard & Workforce Analytics  
**Date:** November 19, 2026  
**Reference Target:** WorkDo HRMS SaaS Dashboard (`https://dash-demo.workdo.io/`)  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Module Overview & Functional Scope

The HR Dashboard is the primary operational cockpit for Company Administrators and HR Managers. In WorkDo, this screen delivers real-time attendance rosters, headcount demographics, department distribution, leave approvals, upcoming birthdays/anniversaries, recruitment metrics, and payroll status.

In MASTERHRMS, this operational hub is served via:
- Frontend Route: `/hr/dashboard` and `/hr/index` ([dashboard.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/dashboard.tsx)).
- Backend Aggregators: `/api/dashboard/hrm-hub` and `/api/dashboard/hrm` in [dashboard.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/dashboard.routes.ts#L43-L168).

---

### 2. Architecture & Endpoint Inventory

| Endpoint | Method | Security Guard | Purpose & Aggregation Logic |
| :--- | :--- | :--- | :--- |
| `/api/dashboard/hrm-hub` | `GET` | `requireAuth`, `resolveTenantContext` | Real-time multi-tenant aggregator: total staff, active employees, new joiners this month, today present/absent/late, on-leave today, pending leaves/expenses count, gross payroll estimate, recent hires activity stream. |
| `/api/dashboard/hrm` | `GET` | `requireAuth`, `resolveTenantContext` | Deep analytics aggregator: department-wise headcount distribution, gender ratio, branch distribution, monthly attrition rate, upcoming holidays, upcoming birthdays. |
| `/api/dashboard/recruitment` | `GET` | `requireAuth`, `resolveTenantContext` | Active job postings, total applicants in pipeline, candidate offer conversion rate. |
| `/api/smart-dashboard/overview` | `GET` | `requireAuth`, `resolveTenantContext` | Cross-module executive KPI metrics (workforce, operational, financial). |

---

### 3. Database Models & Metrics Mapping

The dashboard synthesizes data across the following Prisma models:
1. `Employee`: Total headcount (`status: { not: "terminated" }`), active employees (`status: "active"`), new joiners (`createdAt >= startOfMonth`), salary sum for gross payroll.
2. `Attendance`: Today check-ins, late clock-ins (evaluated against shift start time or standard 9:30 AM IST boundary), real-time present roster.
3. `LeaveRequest`: Approved leave overlapping today's UTC boundary, pending requests awaiting approval.
4. `Department` & `Branch`: Grouped headcount aggregation for workforce distribution charts.
5. `PayrollRun`: Status of most recent payroll cycle (`draft`, `approved`, `processed`, `paid`).
6. `Holiday`: Upcoming statutory holidays for the current workspace calendar.

---

### 4. Parity Comparison vs WorkDo HRMS

| Feature Component | WorkDo Reference | MASTERHRMS Implementation | Parity Status | Evidence File |
| :--- | :--- | :--- | :--- | :--- |
| **Realtime Headcount KPI Cards** | Total, Active, Inactive, On-Leave | Present: Total, Active, New This Month, On-Leave Today, Absent Today | **VERIFIED** | `dashboard.routes.ts#L53-L64` |
| **Live Attendance Widget** | Check-in roster with timestamp & status | Present: `todayRoster` array with employee code, name, time, status | **VERIFIED** | `dashboard.routes.ts#L123-L130` |
| **Department Headcount Breakdown** | Pie chart / bar graph by department | Aggregated in `/api/dashboard/hrm` | **VERIFIED** | `dashboard.routes.ts#L220-L240` |
| **Pending Approvals Quick Actions** | Leave, Expense, Regularization badges | Present: `totalPendingApprovals`, `pendingLeaves`, `pendingExpenses` | **VERIFIED** | `dashboard.routes.ts#L121` |
| **Upcoming Events (Birthdays/Holidays)** | Carousel of upcoming events | Present in `/api/dashboard/hrm` returning birthdays & holidays | **VERIFIED** | `dashboard.routes.ts#L250-L280` |
| **Payroll Summary Snapshot** | Net payroll & processed status | Present: `grossPayroll`, `netPayroll`, `payrollStatus` | **VERIFIED** | `dashboard.routes.ts#L118-L160` |

---

### 5. Identified Gaps & Phase 3 Recommendations

1. **Shift-Aware Late Mark Calculation (P1)**: The dashboard currently uses a static 9:30 AM IST boundary (UTC 4:00 AM) to calculate late marks if employee shift is not explicitly queried in the fast aggregator. We should join `Shift` to use the dynamic grace period.
2. **Real-time Pusher Refresh (P2)**: When an employee clocks in or applies for leave, emit a Pusher event so the HR Dashboard updates reactively without manual page reload.
