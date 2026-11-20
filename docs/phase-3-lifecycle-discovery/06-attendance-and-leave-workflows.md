# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 06: Attendance & Leave Self-Service Workflows Discovery

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Attendance Punch, Regularization, Leave Management & Comp-off Engine  
**Date:** November 19, 2026  
**Reference Target:** WorkDo HRMS Attendance & Leave Module  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Module Overview & Functional Scope

The Attendance and Leave subsystem handles daily workforce time tracking, exception handling, and time-off administration.

In MASTERHRMS:
- Frontend Routes:
  - Employee Clock-in & Roster: `/me/attendance/requests.tsx` & `/me/attendance/regularizations.tsx`
  - Leave Application & Ledger: `/me/leave/applications.tsx`, `/me/leave/balance.tsx`
  - Encashment & Comp-off: `/me/leave/encashment-compoff.tsx`
  - HR Attendance Management: `/hr/attendance/*` (Live roster, monthly matrix, shift rosters)
  - HR Leave Management: `/hr/leave/*` (Leave policies, year-end lapse, approval queue)
- Backend API Routers:
  - `server/src/routes/me-attendance.routes.ts` & `hr-attendance.routes.ts`
  - `server/src/routes/me-leave.routes.ts`, `hr-leave.routes.ts`, `hr-leave-encashment-compoff.routes.ts`
  - Services: `AttendanceService`, `LeaveService`, `CompOffService`

---

### 2. Realtime Web Clock-in & Geolocation Architecture

The web clock-in engine is built with strict idempotency and tamper resistance:
- **Endpoint**: `POST /api/me/attendance/punch` protected by `enforceIdempotency`.
- **Authoritative Timestamping**: The check-in and check-out timestamps are generated strictly by the server clock in UTC, preventing client-side device time tampering.
- **Geolocation & IP Tracking**: Captures optional GPS coordinates (`latitude`, `longitude`), network client IP address (`x-forwarded-for`), and browser user-agent.
- **Lock-out Protection**: If the payroll month is locked by HR (`/api/hr/attendance/month-lock`), punches are rejected with `HTTP 423 Locked`.
- **Status Calculation**:
  - Elapsed work seconds tracked in real-time.
  - Automatically identifies half-day or completed day status based on policy hours threshold.

---

### 3. Dry-Run Leave Engine & Ledger Integrity

Leave applications in MASTERHRMS use a predictive calculation engine prior to submission:
- **Dry-Run Endpoint**: `POST /api/me/leave/applications/dry-run`.
- **Calculated Rules**:
  1. **Holiday & Weekend Exclusions**: Automatically inspects company `Holiday` calendar and standard weekend policy to omit non-working days from leave deduction.
  2. **Sandwich Policy**: If enabled by tenant policy, weekends bracketed between leave days are included in deduction.
  3. **Notice Period Verification**: Ensures requests meet minimum advance notice rules unless emergency leave type is selected.
  4. **Balance Reservation**: Upon submission, balances are placed in `RESERVED` status until approved or rejected.

---

### 4. Comp-off & Leave Encashment Subsystem

MASTERHRMS includes a dedicated Indian-statutory-ready Comp-off and Encashment engine:
- **Comp-off Earning**: Employees working on designated weekly offs or holidays submit proof to earn compensatory off credits.
- **Comp-off Expiry**: Credits carry an expiration horizon (e.g. 60 or 90 days).
- **Leave Encashment Batching**:
  - Eligibility calculator: Computes earned leave encashment entitlement above minimum statutory threshold.
  - Daily rate formula: Derived from basic salary component.
  - Payroll Integration: Encashment batches transition from `approved` → `processed_payroll` → `paid`.

---

### 5. Backend Endpoints Inventory

| Endpoint | Method | Guard | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/me/attendance/status` | `GET` | `requireAuth` | Returns active clock-in state, elapsed seconds, shift details. | **VERIFIED** |
| `/api/me/attendance/punch` | `POST` | `requireAuth`, `enforceIdempotency` | Authoritative check-in/out with location & IP. | **VERIFIED** |
| `/api/me/attendance/records` | `GET` | `requireAuth` | Monthly attendance calendar grid with daily punch logs. | **VERIFIED** |
| `/api/me/attendance/regularizations` | `GET`, `POST` | `requireAuth` | Submits missing check-in/out regularization request. | **VERIFIED** |
| `/api/me/leave/applications/dry-run` | `POST` | `requireAuth` | Simulates leave deduction, checks sandwich & notice rules. | **VERIFIED** |
| `/api/me/leave/applications` | `POST` | `requireAuth` | Submits official leave application with document attachment. | **VERIFIED** |
| `/api/me/leave/balance` | `GET` | `requireAuth` | Comprehensive leave ledger across all leave types. | **VERIFIED** |
| `/api/me/leave/encashment-compoff/*` | Multiple | `requireAuth` | Preview, submit, and track comp-off & encashment requests. | **VERIFIED** |

---

### 6. Parity Comparison vs WorkDo HRMS

| Feature | WorkDo HRMS | MASTERHRMS | Parity Status |
| :--- | :--- | :--- | :--- |
| **Web Clock-in** | Navbar button | In-page widget + navbar with live timer | **VERIFIED** |
| **Attendance Regularization** | Basic edit request | Formal regularization workflow with reason & audit | **VERIFIED** |
| **Leave Balance Ledger** | Simple number | Full ledger with opening, accrued, taken, reserved | **SUPERIOR TO WORKDO** |
| **Comp-off Management** | Not natively supported | Dedicated FIFO comp-off expiration & usage engine | **SUPERIOR TO WORKDO** |
| **Leave Encashment** | Manual payroll adjustment | Automated formula, approval & payroll integration | **SUPERIOR TO WORKDO** |

---

### 7. Identified Gaps & Phase 3 Recommendations

1. **Facial Recognition / Selfie Punch (P2)**: WorkDo demo provides an optional camera selfie capture upon check-in. MASTERHRMS has location/IP but can add optional camera selfie snapshot upload to `AttendanceRecord`.
2. **Attendance Shift Roster Visual Swapping (P2)**: Drag-and-drop UI for swapping shifts between peers on the frontend calendar.
