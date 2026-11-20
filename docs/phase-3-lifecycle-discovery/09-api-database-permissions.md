# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 09: API, Database & Permissions Reference

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Complete API Catalog, Database Schema & Granular RBAC Permissions  
**Date:** November 19, 2026  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Unified Phase 3 API Catalog

#### 1.1 HR Workforce Operations (`/api/hr/*` and `/api/employees/*`)
| Route / Endpoint | Method | Middleware / Guard | Query / Body Payload | Response Entity |
| :--- | :--- | :--- | :--- | :--- |
| `/api/employees` | `GET` | `requireAuth` | `page`, `limit`, `search`, `departmentId`, `branchId`, `status` | Paginated `Employee[]` with relations |
| `/api/employees/:id` | `GET` | `requireAuth` | None | Full 360 `Employee` detail |
| `/api/employees` | `POST` | `requireHrAdmin` | Personal, employment, statutory fields | Created `Employee` |
| `/api/employees/:id` | `PUT` | `requireHrAdmin` | Update fields | Updated `Employee` |
| `/api/employees/:id/toggle-status` | `POST` | `requireHrAdmin` | None | `{ success: true, loginStatus }` |
| `/api/employees/:id/reset-password` | `POST` | `requireHrAdmin` | None | `{ temporaryPassword }` |
| `/api/hr/recruitment/candidate-onboarding` | `GET` | `requireHrAdmin` | `status`, `search` | `OnboardingPipeline[]` |
| `/api/hr/recruitment/candidates/:id/convert-to-employee` | `POST` | `requireHrAdmin` | `joiningDate`, `departmentId`, `branchId` | Created `Employee` |
| `/api/hr/attendance/records` | `GET`, `POST` | `requireHrAdmin` | `month`, `year`, `departmentId` | Attendance Matrix & daily records |
| `/api/hr/attendance/month-lock` | `POST` | `requireHrAdmin` | `month`, `year`, `locked: boolean` | Lock status |
| `/api/hr/leave/applications` | `GET` | `requireHrAdmin` | `status`, `leaveTypeId` | `LeaveRequest[]` |
| `/api/hr/lifecycle/probation` | `GET` | `requireHrAdmin` | `status`, `search` | Probation records |
| `/api/hr/lifecycle/probation/:id/confirm` | `POST` | `requireHrAdmin` | `confirmationDate`, `notes` | Confirmation record |
| `/api/offboarding/exits` | `GET`, `POST` | `requireHrAdmin` | `employeeId`, `exitType`, `lwd` | `ExitProcess` |
| `/api/offboarding/exits/:id/settle-fnf` | `POST` | `requireHrAdmin` | Calculation overrides | `FnFStatement` |

#### 1.2 Employee Self-Service Operations (`/api/me/*` and `/api/v1/me/*`)
| Route / Endpoint | Method | Middleware / Guard | Query / Body Payload | Response Entity |
| :--- | :--- | :--- | :--- | :--- |
| `/api/me/dashboard` | `GET` | `requireAuth` | None | Daily attendance, shift, announcements, KPI metrics |
| `/api/me/profile` | `GET` | `requireAuth` | None | Self `Employee` 360 record |
| `/api/me/profile/change-requests` | `POST` | `requireAuth` | `category`, `proposedChanges`, `reason` | `ProfileChangeRequest` |
| `/api/me/attendance/status` | `GET` | `requireAuth` | None | Clock-in timer & status |
| `/api/me/attendance/punch` | `POST` | `requireAuth`, `enforceIdempotency` | `type: "check_in"|"check_out"`, `lat`, `lng` | `Attendance` record |
| `/api/me/attendance/regularizations` | `POST` | `requireAuth` | `date`, `checkIn`, `checkOut`, `reason` | `AttendanceRegularization` |
| `/api/me/leave/applications/dry-run` | `POST` | `requireAuth` | `leaveTypeId`, `startDate`, `endDate`, `halfDay` | Dry-run breakdown |
| `/api/me/leave/applications` | `POST` | `requireAuth` | `leaveTypeId`, `startDate`, `endDate`, `reason` | Created `LeaveRequest` |
| `/api/me/leave/balance` | `GET` | `requireAuth` | None | Leave ledger |
| `/api/me/payslips` | `GET` | `requireAuth` | None | `Payslip[]` |
| `/api/me/documents/acknowledgements` | `POST` | `requireAuth` | `documentId` | Acknowledgement timestamp |

#### 1.3 Manager Self-Service Operations (`/api/me/team/*`)
| Route / Endpoint | Method | Middleware / Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/me/team` | `GET` | `requireAuth` | Retrieves all direct reports where `managerId === employeeId`. |
| `/api/me/team/approvals` | `GET` | `requireAuth` | Consolidated queue of leaves, regularizations, profile changes. |
| `/api/me/team/leaves/:id/action` | `POST` | `requireAuth` | Approve or reject team member leave application. |
| `/api/me/team/regularizations/:id/action` | `POST` | `requireAuth` | Approve or reject team member regularization. |
| `/api/me/team/profile-changes/:id/action` | `POST` | `requireAuth` | Approve or reject team member profile update. |

---

### 2. Prisma Database Models Architecture

```
Employee (Core Entity)
 ├── User (Login Credentials via userId)
 ├── Department (via departmentId)
 ├── Branch (via branchId)
 ├── Manager (self-relation Employee via managerId)
 ├── Attendance[] (via employeeId)
 ├── LeaveRequest[] (via employeeId)
 ├── LeaveBalance[] (via employeeId)
 ├── ProfileChangeRequest[] (via employeeId)
 ├── AttendanceRegularization[] (via employeeId)
 ├── OnboardingTask[] (via employeeId)
 ├── EmployeeContract[] (via employeeId)
 ├── ExitProcess (via employeeId)
 └── Notification[] (via userId)
```

**Key Data Models:**
- `Employee`: `id`, `tenantId`, `userId`, `employeeCode`, `firstName`, `lastName`, `email`, `position`, `departmentId`, `branchId`, `managerId`, `status`, `salary`, `joinedAt`, `pan`, `aadhaar`, `uan`, `esic`, `bankAccount`, `bankIfsc`.
- `Attendance`: `id`, `tenantId`, `employeeId`, `date`, `checkIn`, `checkOut`, `hours`, `status`, `latitude`, `longitude`, `source`, `ipAddress`.
- `LeaveRequest`: `id`, `tenantId`, `employeeId`, `leaveTypeId`, `startDate`, `endDate`, `daysCount`, `status`, `reason`, `attachmentUrl`.
- `ProfileChangeRequest`: `id`, `tenantId`, `employeeId`, `category`, `oldValuesSnapshot`, `newValuesProposed`, `status`, `rejectionReason`.
- `Notification`: `id`, `tenantId`, `userId`, `title`, `body`, `type`, `read`, `actionUrl`, `metadata`.

---

### 3. Role-Based Permissions Mapping (140 Total Dynamic Permissions)

| Subject | Action | Applicable Roles | Guard Logic |
| :--- | :--- | :--- | :--- |
| `employee` | `read` | `hr_admin`, `manager` (direct reports), `employee` (self) | Data scope filter enforces visibility boundary |
| `employee` | `create` / `update` | `hr_admin`, `admin` | Administrative employee profile modification |
| `employee` | `delete` | `hr_admin`, `admin` | Blocked if active transactions exist |
| `attendance` | `check_in` / `check_out` | `employee` | Self punch; server validates UTC time |
| `attendance` | `regularize` | `employee` (apply), `manager` / `hr_admin` (approve) | Exception approval queue |
| `attendance` | `manage_roster` | `hr_admin` | Shift assignment & lock |
| `leave` | `apply` | `employee` | Dry-run check + balance reservation |
| `leave` | `approve` / `reject` | `manager` (subordinates), `hr_admin` (tenant) | Ledger reconciliation upon action |
| `lifecycle` | `manage_probation` | `hr_admin`, `manager` (review) | Evaluation form & confirmation trigger |
| `offboarding`| `manage_exits` | `hr_admin` | Clearance sign-offs and F&F voucher creation |
