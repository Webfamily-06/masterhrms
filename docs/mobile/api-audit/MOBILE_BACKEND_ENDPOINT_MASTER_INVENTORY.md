# MasterHRMS Mobile — Backend API Master Inventory

## 1. Backend Architecture & API Summary

The MasterHRMS backend is an enterprise-grade multi-tenant Node.js / Express application backed by PostgreSQL via Prisma ORM.

### Architecture Statistics
- **Total Registered Backend Endpoints**: 1,629 Endpoints
- **Total Database Models**: 236 Prisma Models
- **Tenant Isolation Enforcement**: Multi-tenant database extension (`tenant-isolation.extension.ts`), `resolveTenantContext` middleware, and row-level `tenantId` scoping.
- **Authentication**: JWT-based bearer authentication with refresh token rotation and tenant identification claims.
- **Router Prefix Pattern**: Dual mounted under `/api` and `/api/v1` in [server/src/index.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/index.ts).

---

## 2. Authentication & Session Endpoints (`auth.routes.ts`)

Mounted at: `app.use(["/api/auth", "/api/v1/auth"], authRateLimiter, authRouter)`

| HTTP Method | Exact Route | Auth Required | Required Roles / Permissions | Tenant Scoped | Request Body / Params | Expected Response | Database Models Involved |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No | Public (Rate Limited) | Yes (Resolved from user/slug) | `{ email, password, rememberMe? }` | `{ token, refreshToken, user, roles, sessionId, requires2FA? }` | `User`, `Tenant`, `Employee`, `Role` |
| `POST` | `/api/v1/auth/2fa/verify` | No | Public (Pre-auth token) | Yes | `{ tempToken, code, type: 'totp' \| 'email' }` | `{ token, refreshToken, user, roles, sessionId }` | `User`, `TwoFactorConfig` |
| `POST` | `/api/v1/auth/2fa/resend` | No | Public (Pre-auth token) | Yes | `{ tempToken }` | `{ success: true, message }` | `User` |
| `POST` | `/api/v1/auth/register` | No | Public | Creates Tenant | `{ fullName, companyName, email, password }` | `{ tenant, user, token }` | `Tenant`, `User`, `Profile` |
| `POST` | `/api/v1/auth/forgot-password` | No | Public | Yes | `{ email }` | `{ success: true, message }` | `User`, `PasswordResetToken` |
| `POST` | `/api/v1/auth/verify-reset-otp` | No | Public | Yes | `{ email, otp }` | `{ valid: true, resetToken }` | `PasswordResetToken` |
| `POST` | `/api/v1/auth/reset-password` | No | Public | Yes | `{ email, resetToken, newPassword }` | `{ success: true, message }` | `User`, `PasswordResetToken` |
| `POST` | `/api/v1/auth/refresh` | No | Valid Refresh Token | Yes | `{ refreshToken }` | `{ token, refreshToken, user }` | `User`, `DeviceSession` |
| `POST` | `/api/v1/auth/logout` | Yes | Authenticated | Yes | `{ allDevices?: boolean }` | `{ success: true }` | `DeviceSession` |
| `GET` | `/api/v1/auth/me` | Yes | Authenticated | Yes | Header: `Authorization: Bearer <jwt>` | `{ user, employee, tenant, permissions }` | `User`, `Employee`, `Tenant` |

---

## 3. Employee Self Service (ESS) Endpoints (`employee-self-service.routes.ts`, `me-*.routes.ts`)

Mounted at: `app.use(["/api/me", "/api/v1/me"], employeeSelfServiceRouter)` & `platformFoundationRouter`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Query / Request Body | Response Structure | DB Models |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/me/dashboard` | Yes | Yes | None | `{ todayAttendance, shift, workedHoursToday, leaveBalances, pendingTasks }` | `Attendance`, `Shift`, `LeaveBalance`, `Todo` |
| `GET` | `/api/v1/me/profile` | Yes | Yes | None | `{ employee: { id, firstName, lastName, email, phone, designation, department, emergencyContact... } }` | `Employee`, `Profile`, `Department` |
| `PUT` | `/api/v1/me/profile` | Yes | Yes | `{ phone?, address?, emergencyContactName?, emergencyContactPhone?, bloodGroup? }` | `{ success: true, employee }` | `Employee`, `Profile` |
| `GET` | `/api/v1/me/attendance` | Yes | Yes | `{ month?, year? }` | `{ records: Array<AttendanceRecord>, summary: { present, absent, hours } }` | `Attendance` |
| `GET` | `/api/v1/me/attendance/shifts` | Yes | Yes | None | `{ rosters: Array<ShiftRosterItem>, swaps: Array<ShiftSwapItem> }` | `ShiftRoster`, `ShiftSwap` |
| `GET` | `/api/v1/me/leaves` | Yes | Yes | `{ status?, year? }` | `{ requests: Array<LeaveRequest>, balances: Array<LeaveBalance> }` | `LeaveRequest`, `LeaveBalance` |
| `POST` | `/api/v1/me/leaves` | Yes | Yes | `{ leaveTypeId, startDate, endDate, reason, halfDay? }` | `{ request: LeaveRequest }` | `LeaveRequest`, `LeaveBalance` |
| `GET` | `/api/v1/me/leave-balance` | Yes | Yes | None | `{ balances: Array<LeaveBalance> }` | `LeaveBalance`, `LeaveType` |
| `GET` | `/api/v1/me/payslips` | Yes | Yes | `{ year? }` | `{ payslips: Array<PayslipItem> }` | `Payslip`, `PayrollCycle` |
| `GET` | `/api/v1/me/payslips/:id` | Yes | Yes | Path: `id` | `{ payslip: PayslipDetail, earnings: [...], deductions: [...] }` | `Payslip`, `SalaryComponent` |
| `POST` | `/api/v1/me/payroll/loans/request` | Yes | Yes | `{ principal, tenureMonths, reason, loanType: 'salary_advance' }` | `{ loan: EmployeeLoan }` | `EmployeeLoan`, `OutboxEvent` |
| `GET` | `/api/v1/me/payroll/reimbursements-loans` | Yes | Yes | None | `{ claims: [...], loans: [...] }` | `ExpenseClaim`, `EmployeeLoan` |
| `GET` | `/api/v1/me/documents` | Yes | Yes | `{ category? }` | `{ documents: Array<EmployeeDocument> }` | `Document`, `EmployeeDocument` |
| `POST` | `/api/v1/me/documents/request` | Yes | Yes | `{ type, reason }` | `{ request: DocumentRequest }` | `DocumentRequest` |
| `GET` | `/api/v1/me/documents/contracts` | Yes | Yes | None | `{ contracts: Array<CompanyContract> }` | `Contract` |
| `GET` | `/api/v1/me/performance/reviews` | Yes | Yes | None | `{ reviews: Array<PerformanceReview> }` | `PerformanceReview` |
| `GET` | `/api/v1/me/performance/goals` | Yes | Yes | None | `{ goals: Array<PerformanceGoal> }` | `Goal`, `KeyResult` |
| `POST` | `/api/v1/me/performance/goals/checkin` | Yes | Yes | `{ keyResultId, currentValue, comment? }` | `{ success: true, checkin }` | `GoalCheckin`, `KeyResult` |
| `GET` | `/api/v1/me/team` | Yes | Yes | None (Manager role) | `{ team: Array<TeamMember> }` | `Employee`, `Attendance` |
| `GET` | `/api/v1/me/team/approvals` | Yes | Yes | None (Manager role) | `{ leaves: [...], regularizations: [...], profileChanges: [...] }` | `LeaveRequest`, `Regularization` |
| `POST` | `/api/v1/me/team/leaves/:id/action` | Yes | Yes | `{ action: 'APPROVED' \| 'REJECTED', comments? }` | `{ success: true, request }` | `LeaveRequest` |
| `POST` | `/api/v1/me/team/regularizations/:id/action` | Yes | Yes | `{ action: 'APPROVED' \| 'REJECTED', comments? }` | `{ success: true, request }` | `Regularization` |
| `GET` | `/api/v1/me/organization/holidays` | Yes | Yes | `{ year? }` | `{ holidays: Array<Holiday> }` | `Holiday` |
| `GET` | `/api/v1/me/organization/announcements` | Yes | Yes | `{ limit? }` | `{ announcements: Array<Announcement> }` | `Announcement` |

---

## 4. Attendance & IoT Biometric Endpoints (`attendance.routes.ts`)

Mounted at: `app.use("/api/attendance", attendanceRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `POST` | `/api/attendance/punch` | Yes | Yes | `{ type: 'check_in' \| 'check_out', latitude?, longitude?, notes?, deviceId? }` | `{ success: true, attendance: AttendanceRecord, geoFence?: GeoFenceResult }` |
| `GET` | `/api/attendance` | Yes | Yes | Query: `{ date?, month?, employeeId?, page?, limit? }` | `{ data: Array<AttendanceRecord>, pagination: { total, pages } }` |
| `GET` | `/api/attendance/daily-report` | Yes (HR) | Yes | Query: `{ date? }` | `{ totalEmployees, present, absent, onLeave, lateArrivals, halfDays }` |
| `GET` | `/api/attendance/export` | Yes | Yes | Query: `{ format: 'pdf' \| 'csv', month, year }` | Binary Stream (application/pdf or text/csv) |
| `POST` | `/api/v1/me/regularizations` | Yes | Yes | `{ date, checkIn?, checkOut?, reason }` | `{ request: RegularizationRequest }` |
| `GET` | `/api/v1/me/regularizations` | Yes | Yes | None | `{ data: Array<RegularizationRequest> }` |
| `POST` | `/api/v1/me/regularizations/:id/withdraw` | Yes | Yes | Path: `id` | `{ success: true }` |

---

## 5. Leave & PTO Engine (`leave.routes.ts`, `hr-leave.routes.ts`)

Mounted at: `app.use(["/api/leave", "/api/leaves"], leaveRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/leave/balances` | Yes | Yes | Query: `{ employeeId? }` | `{ balances: Array<LeaveBalance> }` |
| `GET` | `/api/leave/types` | Yes | Yes | None | `{ data: Array<LeaveType> }` |
| `GET` | `/api/leave/requests` | Yes | Yes | Query: `{ status?, employeeId?, page? }` | `{ data: Array<LeaveRequest>, pagination }` |
| `POST` | `/api/leave/requests` | Yes | Yes | `{ leaveTypeId, startDate, endDate, reason, halfDay? }` | `{ request: LeaveRequest }` |
| `POST` | `/api/leave/requests/:id/cancel` | Yes | Yes | Path: `id` | `{ success: true }` |
| `PATCH` | `/api/leave/requests/:id/status` | Yes (HR/Mgr) | Yes | `{ status: 'APPROVED' \| 'REJECTED', remarks? }` | `{ success: true, request: LeaveRequest }` |

---

## 6. Payroll, Compensation & Payslips (`payroll.routes.ts`, `payroll-cycles.routes.ts`, `me-payroll.routes.ts`)

Mounted at: `app.use("/api/payroll", payrollRouter)`, `app.use("/api/payroll/cycles", payrollCyclesRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/payroll/payslips` | Yes | Yes | Query: `{ month?, year?, employeeId? }` | `{ payslips: Array<PayslipItem> }` |
| `GET` | `/api/payroll/payslips/:id` | Yes | Yes | Path: `id` | `{ payslip: PayslipDetail, earnings: [...], deductions: [...] }` |
| `GET` | `/api/payroll/cycles` | Yes (HR) | Yes | Query: `{ year?, status? }` | `{ cycles: Array<PayrollCycle> }` |
| `POST` | `/api/payroll/cycles/generate` | Yes (HR) | Yes | `{ month, year, cutOffDate }` | `{ cycle: PayrollCycle }` |
| `GET` | `/api/v1/me/payroll/loans/request` | Yes | Yes | `{ principal, tenureMonths, reason, loanType }` | `{ loan: EmployeeLoan }` |
| `GET` | `/api/v1/me/payroll/reimbursements-loans` | Yes | Yes | None | `{ claims: [...], loans: [...] }` |

---

## 7. Expense Reimbursements (`expenses.routes.ts`)

Mounted at: `app.use("/api/expenses", expensesRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/expenses/claims` | Yes | Yes | Query: `{ category?, status?, page? }` | `{ claims: Array<ExpenseClaim>, pagination }` |
| `POST` | `/api/expenses/claims` | Yes | Yes | `{ title, amount, category, date, notes?, receiptUrl? }` | `{ claim: ExpenseClaim }` |
| `GET` | `/api/expenses/claims/:id` | Yes | Yes | Path: `id` | `{ claim: ExpenseClaim }` |
| `PUT` | `/api/expenses/claims/:id` | Yes | Yes | `{ title?, amount?, category?, notes? }` | `{ claim: ExpenseClaim }` |
| `DELETE` | `/api/expenses/claims/:id` | Yes | Yes | Path: `id` | `{ success: true }` |
| `GET` | `/api/expenses/categories` | Yes | Yes | None | `{ categories: Array<ExpenseCategory> }` |
| `GET` | `/api/expenses/summary` | Yes | Yes | None | `{ totalClaimed, pendingAmount, approvedAmount, reimbursedAmount }` |

---

## 8. Chat, Calling & Realtime Collaboration (`chat.routes.ts`, `call.routes.ts`)

Mounted at: `app.use("/api/chat", chatRouter)`, `app.use("/api/calls", callRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/chat/presence` | Yes | Yes | None | `{ onlineUserIds: string[] }` |
| `POST` | `/api/chat/presence` | Yes | Yes | `{ status: 'online' \| 'away' \| 'offline' }` | `{ success: true }` |
| `GET` | `/api/chat/conversations` | Yes | Yes | None | `{ conversations: Array<ChatConversation> }` |
| `POST` | `/api/chat/conversations/direct` | Yes | Yes | `{ targetUserId }` | `{ conversation: ChatConversation }` |
| `GET` | `/api/chat/messages/:threadId` | Yes | Yes | Query: `{ cursor?, limit? }` | `{ messages: Array<ChatMessage>, nextCursor, hasMore }` |
| `POST` | `/api/chat/messages` | Yes | Yes | `{ threadId, content?, attachments?, voiceNote?, replyToId? }` | `{ message: ChatMessage }` |
| `POST` | `/api/chat/upload` | Yes | Yes | `multipart/form-data` with `files` & `threadId` | `{ files: Array<UploadedAttachment> }` |
| `POST` | `/api/calls/invite` | Yes | Yes | `{ targetUserId, callType: 'audio' \| 'video' }` | `{ callId, status: 'ringing', session }` |
| `POST` | `/api/calls/:callId/accept` | Yes | Yes | Path: `callId` | `{ status: 'connected' }` |
| `POST` | `/api/calls/:callId/reject` | Yes | Yes | Path: `callId` | `{ status: 'rejected' }` |
| `POST` | `/api/calls/:callId/end` | Yes | Yes | Path: `callId` | `{ status: 'ended', durationSeconds }` |
| `POST` | `/api/calls/:callId/heartbeat` | Yes | Yes | Path: `callId` | `{ status: 'alive' }` |
| `POST` | `/api/calls/:callId/invite-colleague` | Yes | Yes | `{ colleagueUserId }` | `{ success: true, participant }` |

---

## 9. Company Calendar & Event Scheduler (`calendar.routes.ts`)

Mounted at: `app.use("/api/calendar", calendarRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/calendar/events` | Yes | Yes | Query: `{ start, end, categoryId? }` | `{ events: Array<CalendarEvent> }` |
| `POST` | `/api/calendar/events` | Yes | Yes | `{ title, description?, start, end, allDay?, room?, attendeeIds?, recurrence? }` | `{ event: CalendarEvent }` |
| `PUT` | `/api/calendar/events/:id` | Yes | Yes | `{ title?, start?, end?, description? }` | `{ event: CalendarEvent }` |
| `DELETE` | `/api/calendar/events/:id` | Yes | Yes | Path: `id` | `{ success: true }` |
| `POST` | `/api/calendar/events/:id/rsvp` | Yes | Yes | `{ status: 'ACCEPTED' \| 'DECLINED' \| 'TENTATIVE' }` | `{ success: true }` |
| `GET` | `/api/calendar/categories` | Yes | Yes | None | `{ categories: Array<CalendarCategory> }` |
| `GET` | `/api/calendar/rooms` | Yes | Yes | None | `{ rooms: Array<MeetingRoom> }` |
| `POST` | `/api/calendar/check-conflicts` | Yes | Yes | `{ start, end, room?, attendeeIds? }` | `{ hasConflicts: boolean, conflicts: [...] }` |

---

## 10. Tasks, To-Dos & Projects (`todos.routes.ts`, `projects.routes.ts`)

Mounted at: `app.use("/api/todos", todosRouter)`, `app.use("/api/projects", projectsRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/todos` | Yes | Yes | Query: `{ categoryId?, status?, search? }` | `{ todos: Array<TodoItem> }` |
| `POST` | `/api/todos` | Yes | Yes | `{ title, description?, dueDate?, priority?, categoryId?, assigneeId? }` | `{ todo: TodoItem }` |
| `PUT` | `/api/todos/:id` | Yes | Yes | `{ title?, status?, completed?, priority? }` | `{ todo: TodoItem }` |
| `DELETE` | `/api/todos/:id` | Yes | Yes | Path: `id` | `{ success: true }` |
| `POST` | `/api/todos/:id/checklist` | Yes | Yes | `{ title }` | `{ item: ChecklistItem }` |
| `PATCH` | `/api/todos/:todoId/checklist/:itemId` | Yes | Yes | `{ completed: boolean }` | `{ success: true }` |
| `POST` | `/api/todos/:id/comments` | Yes | Yes | `{ comment }` | `{ comment: TodoComment }` |
| `GET` | `/api/projects` | Yes | Yes | Query: `{ status? }` | `{ projects: Array<Project> }` |
| `GET` | `/api/timesheets` | Yes | Yes | Query: `{ startDate?, endDate? }` | `{ items: Array<TimesheetItem> }` |
| `POST` | `/api/timesheets` | Yes | Yes | `{ projectId?, date, hours, description? }` | `{ item: TimesheetItem }` |
| `DELETE` | `/api/timesheets/:id` | Yes | Yes | Path: `id` | `{ success: true }` |

---

## 11. Notifications & Native Push Dispatch (`push.routes.ts`, `platform-foundation.routes.ts`)

Mounted at: `app.use("/api/notifications/push", pushRouter)`, `app.use(["/api", "/api/v1"], platformFoundationRouter)`

| HTTP Method | Exact Route | Auth Required | Tenant Scoped | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/v1/me/notifications` | Yes | Yes | Query: `{ limit?, offset? }` | `{ notifications: Array<Notification>, unreadCount: number }` |
| `GET` | `/api/v1/shared/notifications` | Yes | Yes | None | `{ notifications: Array<Notification> }` |
| `POST` | `/api/v1/shared/notifications/:id/read` | Yes | Yes | Path: `id` | `{ success: true }` |
| `POST` | `/api/v1/shared/notifications/read-all` | Yes | Yes | None | `{ success: true, count: number }` |
| `POST` | `/api/notifications/push/subscribe` | Yes | Yes | `{ subscription, platform: 'web' \| 'android' \| 'ios', deviceToken? }` | `{ success: true, registered: true }` |

---

## 12. Tenant Administration & Settings (`settings.routes.ts`, `workspace.routes.ts`)

Mounted at: `app.use(["/api/v1/settings", "/api/settings"], settingsRouter)`

| HTTP Method | Exact Route | Auth Required | Required Roles | Request Body / Params | Expected Response |
|---|---|---|---|---|---|
| `GET` | `/api/v1/settings/tenant/:group` | Yes | `tenant_admin` | Path: `group` (`general`, `security`, `attendance`, `payroll`) | `{ settings: Record<string, any> }` |
| `PUT` | `/api/v1/settings/tenant/:group` | Yes | `tenant_admin` | Path: `group`, Body: `{ ...settings }` | `{ success: true, settings }` |
| `GET` | `/api/v1/settings/tenant/security` | Yes | `tenant_admin` | None | `{ mfaRequired, mfaEnforcementLevel, sessionTimeoutMinutes, ... }` |
| `PUT` | `/api/v1/settings/tenant/security` | Yes | `tenant_admin` | `{ mfaRequired, sessionTimeoutMinutes, passwordMinLength }` | `{ success: true }` |
| `GET` | `/api/workspace/modules` | Yes | `tenant_admin` | None | `{ modules: Array<{ id, name, enabled, tier }> }` |

---

## 13. Super Admin Platform Console (Web-Only / Mobile-Prohibited)

Mounted at: `app.use("/api/super", superRouter)`

| HTTP Method | Exact Route | Auth Required | Roles | Access Status on Mobile |
|---|---|---|---|---|
| `GET` | `/api/super/stats` | Yes | `super_admin` | **PROHIBITED ON MOBILE** (Rejected with 403 Forbidden) |
| `GET` | `/api/super/tenants` | Yes | `super_admin` | **PROHIBITED ON MOBILE** |
| `GET` | `/api/super/analytics/telemetry` | Yes | `super_admin` | **PROHIBITED ON MOBILE** |
| `POST` | `/api/super/tenants/:id/suspend` | Yes | `super_admin` | **PROHIBITED ON MOBILE** |
| `POST` | `/api/super/tenants/:id/reinstate` | Yes | `super_admin` | **PROHIBITED ON MOBILE** |
