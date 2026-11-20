# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 04: Employee Self-Service (ESS) Discovery

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Employee Self-Service (ESS) Portal, Personal Dashboard & Requests  
**Date:** November 19, 2026  
**Reference Target:** WorkDo HRMS Employee Portal  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Module Overview & Functional Scope

The Employee Self-Service (ESS) subsystem empowers employees to manage their personal employment profile, review today's shift and attendance, submit leaves and regularizations, download payslips, acknowledge company announcements, and submit profile change requests for manager/HR verification.

In MASTERHRMS:
- Frontend ESS Root: Mounted under `/me/*`
  - Dashboard: `/me/dashboard.tsx` ([dashboard.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/me/dashboard.tsx))
  - Profile & Requests: `/me/profile.tsx` ([profile.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/me/profile.tsx)) & `/me/profile.change-requests.tsx` ([profile.change-requests.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/me/profile.change-requests.tsx))
  - Payslips & Tax: `/me/payroll/payslips.tsx` & `/me/payroll/tax.tsx`
  - Helpdesk & Tickets: `/me/helpdesk.tsx`
- Backend API Router: `server/src/routes/employee-self-service.routes.ts` (mounted under `/api/me` and `/api/v1/me`).

---

### 2. ESS Dashboard Architecture (`GET /api/me/dashboard`)

The ESS dashboard synthesizes live operational data for the authenticated employee:
1. **Attendance Today**: Real-time status (`NOT_CHECKED_IN`, `present`, `half_day`, `completed`), check-in timestamp, check-out timestamp, and total hours worked.
2. **Assigned Shift**: Current shift roster lookup, shift name, mandatory shift window (`startTime` to `endTime`).
3. **KPI Counters**:
   - `awardsThisYear`: Company recognitions earned.
   - `activeWarnings`: Active disciplinary warnings.
   - `pendingLeavesCount`: Applications currently in review.
4. **Targeted Announcements Carousel**: Filtered by tenant eligibility (`all_company`, `department`, `branch`), tracking employee read status (`views`) and digital sign-off (`acknowledgements`).
5. **Pending Requests Drawer**: Recent leave applications and attendance regularizations.

---

### 3. Profile Change Request Pipeline (Compound Request Centre)

To prevent unauthorized tampering with payroll and statutory data, direct edits to sensitive employee fields are gated through a verified workflow:
- **Prisma Model**: `ProfileChangeRequest`.
- **Allowed Categories**:
  - `contact_details`: Phone, personal email, address.
  - `banking_info`: Bank name, branch, account number, IFSC code.
  - `emergency_contacts`: Contact person, relationship, telephone.
- **Workflow State Machine**:
  `DRAFT` → `PENDING` → (`CORRECTION_REQUESTED` ↔ `RESUBMITTED`) → `APPROVED` / `REJECTED`.
- **Atomic Authoritative Sync**:
  Upon manager or HR approval, a Prisma `$transaction` simultaneously updates the `Employee` record, updates request status to `APPROVED`, records the resolution timestamp and actor ID, and emits an audit trail entry.

---

### 4. Backend Endpoints Inventory

| Endpoint | Method | Guard | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/me/dashboard` | `GET` | `requireAuth` | Aggregates daily attendance, shift, announcements, and metrics. | **VERIFIED** |
| `/api/me/profile` | `GET` | `requireAuth` | Retrieves full 360 employee profile for the authenticated user. | **VERIFIED** |
| `/api/me/profile` | `PUT` | `requireAuth` | Direct update for non-sensitive personal fields. | **VERIFIED** |
| `/api/me/profile/change-requests` | `GET`, `POST` | `requireAuth` | Lists active requests or submits a new change request with old-value snapshot. | **VERIFIED** |
| `/api/me/payslips` | `GET` | `requireAuth` | Lists historical monthly payslips. | **VERIFIED** |
| `/api/me/payslips/:id/download` | `GET` | `requireAuth` | Streams digitally rendered PDF payslip. | **VERIFIED** |
| `/api/me/tickets` | `GET`, `POST` | `requireAuth` | Employee IT/Admin helpdesk ticket submission and conversation trail. | **VERIFIED** |

---

### 5. Parity Comparison vs WorkDo HRMS

| Feature | WorkDo HRMS | MASTERHRMS | Parity Status |
| :--- | :--- | :--- | :--- |
| **Personal Dashboard** | Attendance widget & holidays | Present: Attendance status, shift, announcements, KPI cards | **VERIFIED** |
| **Direct Web Clock-in/out** | Button on navbar | Present: Web check-in/out with location & IP logging | **VERIFIED** |
| **Payslip PDF Download** | Download button | Instant signed PDF generation & download | **VERIFIED** |
| **Profile Change Workflow** | Direct edit or support ticket | Strict audit-tracked snapshot change request pipeline | **SUPERIOR TO WORKDO** |
| **Announcement Acknowledgement** | Modal alert | In-line acknowledgement with digital timestamp | **VERIFIED** |

---

### 6. Identified Gaps & Phase 3 Recommendations

1. **Tax Exemption Declarations (P1)**: Section 80C, 80D, HRA rent receipts upload directly in `/me/payroll/tax.tsx` with verification checklist.
2. **Helpdesk Ticket Attachment Preview (P2)**: In-line preview for screenshots attached to employee support tickets.
