# Employee Portal (ESS) Flow & Forensic Architecture

## 1. Executive Summary & Security Isolation
The Employee Self-Service (ESS) portal provides workforce members with access to their own attendance records, leave quotas, payroll payslips, expense claims, LMS courses, and assigned company equipment.

* **Route**: `/employee-dashboard` (`src/routes/_authenticated/_app/employee-dashboard.tsx`)
* **Role Guard**: `role: "employee"` (or `tenant_admin`, `hr_manager` in self-service preview mode)
* **Data Boundary**: Strictly isolated to `employee_id` matching the authenticated user's profile. An employee cannot query or view colleagues' personal records, compensation figures, or administrative controls.

---

## 2. Employee Actions & End-to-End API Flow

| User Action | UI Trigger / Component | API Endpoint Called | Backend Operations & Middleware | Database Models Accessed | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clock-In / Clock-Out** | "Punch In" / "Punch Out" button with GPS Geofencing | `POST /api/attendance/punch` | `requireAuth`, verifies GPS coordinates against company office geofence radius. | `Attendance`, `Employee` | DATABASE_LIVE |
| **Apply for Leave** | "Apply Leave" Dialog modal | `POST /api/leaves/apply` | `requireAuth`, validates quota balance > days requested, marks status "PENDING". | `LeaveRequest`, `LeaveBalance` | DATABASE_LIVE |
| **View Leave Quotas** | Leave Balance summary card | `GET /api/leaves/my-balances` | `requireAuth`, returns remaining casual, sick, and earned leave counts. | `LeaveBalance`, `LeaveType` | DATABASE_LIVE |
| **Download Payslip** | "Download Payslip" button on payroll list | `GET /api/payroll/my-payslips` | `requireAuth`, retrieves payroll snapshot; client-side jsPDF renders statutory payslip. | `Payslip`, `PayrollRun` | DATABASE_LIVE |
| **Submit Expense** | "Submit Expense Claim" modal | `POST /api/expenses` | `requireAuth`, uploads receipt image via Multer, registers pending reimbursement. | `Expense`, `FileAttachment` | DATABASE_LIVE |
| **LMS Training** | "Enroll Course" / "Complete Lesson" | `POST /api/courses/enroll` | `requireAuth`, tracks modular progress, issues digital completion certificate. | `Course`, `CourseEnrollment` | DATABASE_LIVE |
| **View Assigned Assets** | "Custody Equipment" table | `GET /api/assets/my-assets` | `requireAuth`, displays company serial numbers, handover date, warranty status. | `Asset`, `AssetAssignment` | DATABASE_LIVE |
| **Request Shift Swap** | "Peer Swap" modal on schedule | `POST /api/shifts/swap-request` | `requireAuth`, notifies designated peer and branch manager via Socket.io. | `ShiftSwapRequest` | DATABASE_LIVE |
| **Update Profile** | "Profile Information" drawer | `PUT /api/profile/me` | `requireAuth`, updates emergency contacts and residential address. Bank fields locked. | `Employee`, `User` | DATABASE_LIVE |
