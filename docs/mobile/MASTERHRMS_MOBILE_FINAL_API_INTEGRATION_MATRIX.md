# MasterHRMS Mobile — Comprehensive API Integration Matrix

This document maps all mobile role personas and feature screens to the authoritative backend Express REST API routes in `server/src/routes/`.

---

## 1. Authentication & Multi-Tenant Routing

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Auth / Headers | Verified Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tenant Slug Resolution** | `TenantService.resolveTenant(slug)` | `/api/v1/auth/public/tenant/resolve` | `GET ?slug={slug}` | Public, `x-forwarded-host: localhost` | Returns `{ id, name, slug, logoUrl, status }` |
| **Standard User Login** | `AuthService.login({ email, password })` | `/api/v1/auth/login` | `POST` | Public | Returns tokens, user profile, roles, permissions, or MFA challenge |
| **Two-Factor Verification** | `AuthService.verify2Fa({ mfaToken, code })` | `/api/v1/auth/2fa/verify` | `POST` | Public | Returns tokens upon valid TOTP or email OTP |
| **Resend 2FA Code** | `AuthService.resend2Fa(mfaToken)` | `/api/v1/auth/2fa/resend` | `POST` | Public | Dispatches fresh OTP code to user's registered email |
| **Token Refresh** | `AuthService.refreshToken(token)` | `/api/v1/auth/refresh` | `POST` | Public | Yields refreshed access and refresh tokens |
| **Current Profile Hydration** | `AuthService.getCurrentUser()` | `/api/v1/auth/me` | `GET` | Bearer Token, `x-tenant-id` | Authoritative permissions, canonical roles, tenant metadata |
| **Forgot Password** | `AuthService.forgotPassword(email)` | `/api/v1/auth/forgot-password` | `POST` | Public | Dispatches reset email or returns reset verification token |
| **Reset Password** | `AuthService.resetPassword(payload)` | `/api/v1/auth/reset-password` | `POST` | Public | Sets new password securely |
| **Logout** | `AuthService.logout()` | `/api/v1/auth/logout` | `POST` | Bearer Token | Invalidates backend refresh session token |

---

## 2. Employee Self-Service (ESS)

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **Employee Dashboard Summary** | `AttendanceService.getDashboardSummary()` | `/api/v1/me/dashboard` | `GET` | Returns today's punch state, leave balance, recent activities |
| **Geo-Fenced Punch In/Out** | `AttendanceService.punch({ type, lat, lng, notes })` | `/api/attendance/punch` | `POST` | Computes Haversine distance from headquarters, stores check-in/out |
| **My Attendance History** | `AttendanceService.getMyHistory(params)` | `/api/attendance` | `GET` | Filtered automatically by current user's employee record; supports `month=YYYY-MM` |
| **Submit Regularization** | `AttendanceService.submitRegularization(payload)`| `/api/v1/me/regularizations` | `POST` | Requests attendance correction with date, punch type, and justification |
| **My Regularizations List**| `AttendanceService.getRegularizations()` | `/api/v1/me/regularizations` | `GET` | Fetches history of submitted attendance regularization requests |
| **Leave Balances** | `LeaveService.getBalances()` | `/api/v1/me/leave-balance` & `/api/leave/balances` | `GET` | Returns annual, casual, sick, unpaid leave entitlements and used counts |
| **Leave Types Catalog** | `LeaveService.getLeaveTypes()` | `/api/leave/types` | `GET` | Returns list of configured tenant leave policies |
| **My Leave Requests** | `LeaveService.getMyRequests()` | `/api/v1/me/leaves` & `/api/leave/requests` | `GET` | Returns list of submitted leaves with status (`PENDING`, `APPROVED`, `REJECTED`) |
| **Apply Leave** | `LeaveService.applyLeave(payload)` | `/api/v1/me/leaves` & `/api/leave/requests` | `POST` | Submits leave request with startDate, endDate, leaveTypeId, and reason |
| **Cancel Leave Request** | `LeaveService.cancelLeave(id)` | `/api/leave/requests/:id/cancel` | `POST` | Withdraws pending leave application |
| **My Payslips List** | `PayrollService.getMyPayslips()` | `/api/v1/me/payslips` & `/api/payroll/payslips` | `GET` | Returns chronological list of generated salary slips |
| **Payslip Breakdown Detail** | `PayrollService.getPayslipDetail(id)` | `/api/v1/me/payslips/:id` & `/api/payroll/payslips/:id` | `GET` | Earnings, allowances, statutory deductions (PF, ESI, TDS), and net pay |
| **My Employee Profile** | `EmployeeService.getMyProfile()` | `/api/v1/me/profile` | `GET` | Personal details, masked PAN/Aadhaar/Bank, emergency contact, manager |
| **Update My Profile / Request**| `EmployeeService.updateMyProfile(data)` | `/api/v1/me/profile` | `PUT` | Updates allowed personal contact info or submits change request |
| **My Documents** | `EmployeeService.getMyDocuments()` | `/api/v1/me/documents` | `GET` | Employment contracts, offer letters, policy handbooks |
| **Request Document** | `EmployeeService.requestDocument(type)` | `/api/v1/me/documents/request` | `POST` | Submits request for bonafide letter, experience cert, etc. |
| **Organization Holidays** | `EmployeeService.getHolidays()` | `/api/v1/me/organization/holidays` | `GET` | Tenant public and festive holidays calendar |
| **Company Announcements** | `EmployeeService.getAnnouncements()` | `/api/v1/me/organization/announcements` | `GET` | Broadcast updates from company management |

---

## 3. Manager Operations

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **My Direct Reports / Team** | `ManagerService.getTeamMembers()` | `/api/v1/me/team` | `GET` | Direct report employees, designations, emails, contact info |
| **Team Approvals Queue** | `ManagerService.getTeamApprovals()` | `/api/v1/me/team/approvals` | `GET` | Aggregated pending leaves, regularizations, and profile change requests |
| **Action Team Leave** | `ManagerService.actionLeave(id, action, note)` | `/api/v1/me/team/leaves/:id/action` | `POST` | Action: `APPROVED` or `REJECTED` with manager remarks |
| **Action Regularization** | `ManagerService.actionRegularization(id, action, note)` | `/api/v1/me/team/regularizations/:id/action` | `POST` | Action: `APPROVED` or `REJECTED` with manager remarks |
| **Team Daily Attendance** | `ManagerService.getTeamAttendance(date)` | `/api/attendance` | `GET` | Filtered by manager's team members |

---

## 4. HR Administration

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **Employee Directory** | `HrService.getEmployees(params)` | `/api/employees` | `GET` | Search by name/code, filter by department and status |
| **Departments Master** | `HrService.getDepartments()` | `/api/employees/departments` | `GET` | All tenant departments and branches |
| **Organization Attendance Matrix** | `HrService.getOrgAttendance(params)` | `/api/attendance` | `GET` | Organization-wide daily attendance records |
| **Daily Attendance Summary** | `HrService.getDailyAttendanceReport()` | `/api/attendance/daily-report` | `GET` | High-level metrics: Present, Absent, Late, On-Leave counts |
| **All Leave Requests Queue** | `HrService.getAllLeaveRequests(status)` | `/api/leave/requests` | `GET` | Filterable by `status=PENDING` across entire tenant |
| **HR Action on Leave** | `HrService.updateLeaveStatus(id, status, reason)` | `/api/leave/requests/:id/status` | `PATCH` | Updates leave status (`APPROVED` / `REJECTED`) |
| **Payroll Runs Monitoring** | `HrService.getPayrollRuns()` | `/api/payroll/runs` | `GET` | Chronological payroll execution batches and status |

---

## 5. Tenant Administration

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **Tenant Settings & Profile** | `TenantAdminService.getSettings(group)` | `/api/v1/settings/tenant/:group` | `GET` | Workspace configuration, company details, locale, timezone |
| **Update Tenant Settings** | `TenantAdminService.updateSettings(group, data)` | `/api/v1/settings/tenant/:group` | `PUT` | Saves workspace configuration updates |
| **License & Seat Usage** | `TenantAdminService.getLicenseUsage()` | `/api/employees` + `/api/v1/auth/me` | `GET` | Compares active employee count with subscribed seat tier |
| **Security & 2FA Policies** | `TenantAdminService.getSecurityPolicy()` | `/api/v1/settings/tenant/security` | `GET` | MFA enforcement, password expiry, session duration |

---

## 6. Super Admin (Platform Overview)

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Summary Stats** | `SuperAdminService.getStats()` | `/api/super/stats` | `GET` | Total tenants, active users, system health metrics |
| **Platform Tenants Directory** | `SuperAdminService.getTenants()` | `/api/super/tenants` | `GET` | All client tenants across the SaaS platform |
| **System Telemetry & Health** | `SuperAdminService.getTelemetry()` | `/api/super/analytics/telemetry` | `GET` | Memory, uptime, API latency, background workers status |
| **Backup Snapshots List** | `SuperAdminService.getBackups()` | `/api/super/backup/snapshots` | `GET` | Automated and manual database backup snapshots |

---

## 7. Device Token & Push Notifications

| Mobile Feature | Mobile Service / Method | Express Route | HTTP Method | Notes / Query Params |
| :--- | :--- | :--- | :--- | :--- |
| **Register Mobile Device** | `NotificationService.registerDevice(token)` | `/api/push/register` & `/api/notifications/register` | `POST` | Registers FCM/APNS push token linked to authenticated user |
| **User Notifications List** | `NotificationService.getNotifications()` | `/api/notifications` | `GET` | Chronological list of user alerts and approvals |
