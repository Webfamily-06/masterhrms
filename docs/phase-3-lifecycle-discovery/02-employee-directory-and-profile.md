# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 02: Employee Directory & 360 Profile Discovery

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Employee Directory, Search/Filter & 360-Degree Profile View  
**Date:** November 19, 2026  
**Reference Target:** WorkDo HRMS Employee Management  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Module Overview & Functional Scope

The Employee Directory and 360-Degree Profile view forms the core data repository for workforce administration. It provides full lifecycle visibility into every worker—from personal demographics and Indian statutory IDs (PAN, Aadhaar, UAN, ESIC) to compensation, leave ledger, attendance history, assets, lifecycle events, and audit logs.

In MASTERHRMS:
- Directory Route: `/hr/employees/index.tsx` ([index.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/employees/index.tsx)).
- 360 Profile View: `/hr/employees/$id.tsx` ([$id.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/employees/$id.tsx)).
- Profile Edit: `/hr/employees/$id.edit.tsx` ([$id.edit.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/employees/$id.edit.tsx)).
- Backend Controller: `server/src/routes/hr-employees.routes.ts` & `server/src/services/employee.service.ts`.

---

### 2. Employee 360 Tab Architecture

The profile viewer in `src/routes/_authenticated/hr/employees/$id.tsx` features 13 distinct tabs:

| Tab Key | Display Label | Content & Field Scope | Status |
| :--- | :--- | :--- | :--- |
| `basic-info` | Basic Info | Name, Employee Code, Gender, DOB, Blood Group, Marital Status, PAN, Aadhaar, UAN, ESIC. | **VERIFIED** |
| `employment` | Employment | Position, Department, Branch, Reporting Manager, Joined At, Probation End Date, Employment Type. | **VERIFIED** |
| `contact` | Contact & Address | Work/Personal Email, Mobile, Address Lines 1 & 2, City, District, State, Pincode. | **VERIFIED** |
| `banking` | Banking | Bank Name, Branch, Account Number (masked), IFSC Code, Account Holder Name, UPI ID. | **VERIFIED** |
| `certifications`| Certifications | Professional licenses, certifications, issuing bodies, expiry dates. | **VERIFIED** |
| `documents` | Documents | KYC proofs, contracts, degree certificates with download links and expiry badges. | **VERIFIED** |
| `lifecycle` | Lifecycle History | Timeline of promotions, transfers, warnings, awards, and complaints. | **VERIFIED** |
| `attendance` | Attendance Logs | Recent monthly attendance records, check-in/out timestamps, hours worked, late markers. | **VERIFIED** |
| `leave` | Leave & Balances | Current leave type balances, pending/approved applications, comp-off ledger. | **VERIFIED** |
| `payroll` | Payroll & Tax | Base salary, allowances, deductions, tax regime (Old vs New Sec 115BAC), payslips. | **VERIFIED** |
| `assets` | Company Assets | Assigned physical hardware, laptops, monitors, serial numbers, allocation condition. | **VERIFIED** |
| `training` | Training | Enrolled courses, sessions attended, progress bar, completion certificates. | **VERIFIED** |
| `audit-trail` | Audit Trail | Chronological change history showing actor, timestamp, and field diffs. | **VERIFIED** |

---

### 3. Backend Endpoints & Data Operations

| Endpoint | Method | Permission / Guard | Business Logic & Verification |
| :--- | :--- | :--- | :--- |
| `/api/employees` | `GET` | `requireAuth` | Directory query with search, branch/department filters, pagination, and status filters. |
| `/api/employees/:id` | `GET` | `requireAuth` | Comprehensive 360 profile payload including relations (department, branch, manager, user). |
| `/api/employees` | `POST` | `requireHrAdmin` | Creates employee record with auto-generated code, tenant isolation, and field validation. |
| `/api/employees/:id` | `PUT` | `requireHrAdmin` | Updates personal, employment, and statutory details with atomic audit logging. |
| `/api/employees/:id/toggle-status` | `POST` | `requireHrAdmin` | Activates/deactivates employee login account, revokes device sessions, unlinks user. |
| `/api/employees/:id/reset-password`| `POST` | `requireHrAdmin` | Generates secure temporary password, updates bcrypt hash, clears auth cache. |
| `/api/employees/bulk-delete` | `POST` | `requireHrAdmin` | Safe bulk deletion checking foreign key dependencies before purging. |
| `/api/employees/export` | `GET` | `requireHrAdmin` | Exports employee directory to CSV/Excel format. |

---

### 4. Parity Comparison vs WorkDo HRMS

| Feature | WorkDo HRMS | MASTERHRMS | Parity Status |
| :--- | :--- | :--- | :--- |
| **Grid / Table Toggle** | Supported | Supported in Directory View | **VERIFIED** |
| **Branch / Department Filters** | Dropdown filters | Supported with reactive query params | **VERIFIED** |
| **Employee Code Auto-generation** | Auto-numbered prefix | Supported (`EMP-001`, `EMP-002`) | **VERIFIED** |
| **Indian Statutory Compliance** | Basic PAN/Tax | Comprehensive: PAN, Aadhaar, UAN, ESIC, Age classification | **SUPERIOR TO WORKDO** |
| **Document Expiry Warnings** | Supported | Supported with automated cron + 30/15/7 day badges | **VERIFIED** |
| **Direct User Account Provisioning** | Button on profile | Supported in User Management & 360 profile | **VERIFIED** |

---

### 5. Identified Gaps & Phase 3 Recommendations

1. **Profile Picture WebRTC Crop & Upload (P2)**: WorkDo allows direct webcam capture and circle-crop. MASTERHRMS currently uses standard file upload via `/api/media/upload`.
2. **Emergency Contact Multi-Card (P2)**: WorkDo supports multiple emergency contacts (primary, secondary). MASTERHRMS schema has primary emergency contact fields; supporting an array of emergency contacts would enhance depth.
