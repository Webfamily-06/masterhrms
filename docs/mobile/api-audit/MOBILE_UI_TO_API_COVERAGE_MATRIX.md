# MasterHRMS Mobile — UI-to-API Coverage Matrix

## 1. Executive Summary & Traceability Protocol

This matrix establishes the end-to-end architectural bridge connecting every interactive UI element in the MasterHRMS mobile application to its corresponding mobile service, network request, backend route handler, database model, and authorization gate.

### Tracing Chain
$$\text{UI Element} \longrightarrow \text{Event Handler} \longrightarrow \text{Mobile Service Hook} \longrightarrow \text{Axios Request} \longrightarrow \text{Express Route} \longrightarrow \text{Controller / Service} \longrightarrow \text{Prisma DB Model} \longrightarrow \text{UI State}$$

### Classification Definitions
- **`FULLY_CONNECTED`**: Complete end-to-end chain functions with real backend data persistence and verified contracts.
- **`MOBILE_INTEGRATION_MISSING`**: Backend endpoint exists and works, but the mobile screen does not invoke it (uses local state or route params).
- **`MOBILE_SERVICE_MISSING`**: Backend endpoint exists, but no client service or hook has been implemented in `mobile-app/src/core/services/`.
- **`BACKEND_ENDPOINT_MISSING`**: UI requires a server operation that does not exist on the backend.
- **`CONTRACT_MISMATCH`**: Disagreement between mobile client and backend regarding path, method, payload fields, or response schema.
- **`MOCK_OR_HARDCODED`**: UI renders static business records or simulated calculations instead of server data.
- **`UI_ACTION_BROKEN`**: Button triggers a stub alert, empty function, or no-op.
- **`AUTHORIZATION_OR_TENANT_GAP`**: Role/tenant checks missing, or access policy violated.

---

## 2. Complete UI-to-API Traceability Matrix

### Domain 1: Authentication, Session & Biometrics

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **CompanyDiscoveryScreen** | Submit Workspace Slug | `TenantService.resolveTenant` | `GET /api/workspace/resolve` | `workspaceRoutingRouter` | `Tenant` | `FULLY_CONNECTED` | Public |
| **LoginScreen** | Tap "Sign In" Button | `AuthService.login` | `POST /api/v1/auth/login` | `authRouter` | `User`, `Tenant`, `Employee` | `FULLY_CONNECTED` | Public (Rate Limited) |
| **TwoFactorVerifyScreen** | Submit 6-digit MFA Code | `AuthService.verify2Fa` | `POST /api/v1/auth/2fa/verify` | `authRouter` | `User`, `TwoFactorConfig` | `FULLY_CONNECTED` | Public (Pre-auth token) |
| **TwoFactorVerifyScreen** | Tap "Resend Code" | `AuthService.resend2Fa` | `POST /api/v1/auth/2fa/resend` | `authRouter` | `User` | `FULLY_CONNECTED` | Public (Pre-auth token) |
| **RegisterScreen** | Tap "Create Account" | `AuthService.register` | `POST /api/v1/auth/register` | `authRouter` | `Tenant`, `User`, `Profile` | `FULLY_CONNECTED` | Public |
| **ForgotPasswordScreen** | Tap "Send Instructions" | `AuthService.forgotPassword` | `POST /api/v1/auth/forgot-password` | `authRouter` | `User`, `PasswordResetToken` | `FULLY_CONNECTED` | Public |
| **ResetPasswordScreen** | Verify OTP & Submit New Pwd | `AuthService.resetPassword` | `POST /api/v1/auth/reset-password` | `authRouter` | `User`, `PasswordResetToken` | `FULLY_CONNECTED` | Public |
| **FaceIdAuthScreen** | Biometric Unlock Trigger | `BiometricService.authenticate` | Local Keychain prompt | None (Missing refresh call) | `DeviceSession` | `MOBILE_INTEGRATION_MISSING` | Enrolled Employee |
| **FingerprintAuthScreen** | Fingerprint Unlock Trigger | `BiometricService.authenticate` | Local Keychain prompt | None (Missing refresh call) | `DeviceSession` | `MOBILE_INTEGRATION_MISSING` | Enrolled Employee |
| **SettingsScreen** | Tap "Sign Out" | `AuthService.logout` | `POST /api/v1/auth/logout` | `authRouter` | `DeviceSession` | `FULLY_CONNECTED` | All authenticated roles |

---

### Domain 2: Employee Dashboards & Navigation Switchers

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **EmployeeDashboardScreen** | Screen Mount / Refresh | `AttendanceService.getDashboardSummary` | `GET /api/v1/me/dashboard` | `employeeSelfServiceRouter` | `Attendance`, `Shift`, `Leave` | `FULLY_CONNECTED` | `employee` |
| **EmployeeDashboardScreen** | Tap "Punch In/Out" | `AttendanceService.punch` | `POST /api/attendance/punch` | `attendanceRouter` | `AttendanceRecord` | `FULLY_CONNECTED` | `employee` |
| **EmployeeDashboardScreen** | View Announcements | `EmployeeService.getAnnouncements` | `GET /api/v1/me/organization/announcements` | `employeeSelfServiceRouter` | `Announcement` | `FULLY_CONNECTED` | `employee` |
| **EmployeeDashboardScreen** | View Recent Leaves | `LeaveService.getMyRequests` | `GET /api/v1/me/leaves` | `employeeSelfServiceRouter` | `LeaveRequest` | `FULLY_CONNECTED` | `employee` |
| **PersonaSwitcher** | Switch Active Role Persona | `useAuthStore.setActiveRole` | Local state transition | None (Client-side routing) | `Role` | `FULLY_CONNECTED` | Multi-role accounts |

---

### Domain 3: Time & Attendance, Regularization & Geofencing

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **AttendanceDetailScreen** | Mount / Offset Month | `AttendanceService.getMyHistory` | `GET /api/attendance` | `attendanceRouter` | `Attendance` | `FULLY_CONNECTED` | `employee` |
| **AttendanceDetailScreen** | Mount Regularizations | `AttendanceService.getRegularizations` | `GET /api/v1/me/regularizations` | `employeeSelfServiceRouter` | `Regularization` | `FULLY_CONNECTED` | `employee` |
| **AttendanceDetailScreen** | Submit Correction Flow | `AttendanceService.submitRegularization` | `POST /api/v1/me/regularizations` | `employeeSelfServiceRouter` | `Regularization` | `FULLY_CONNECTED` | `employee` |
| **AttendanceDetailScreen** | Download Monthly PDF Report | None | Stub `Alert.alert("Download")` | Missing route integration | `Attendance` | `UI_ACTION_BROKEN` | `employee` |
| **AttendanceDetailScreen** | Download Full Report Button | None | Stub `Alert.alert("Report")` | Missing route integration | `Attendance` | `UI_ACTION_BROKEN` | `employee` |
| **GeofenceMapPunchScreen** | Tap "Punch In" with GPS | `AttendanceService.punch` | `POST /api/attendance/punch` | `attendanceRouter` | `Attendance` | `FULLY_CONNECTED` | `employee` |

---

### Domain 4: Leave Management & PTO

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **ApplyLeaveScreen** | Fetch Leave Types | `LeaveService.getLeaveTypes` | `GET /api/leave/types` | `leaveRouter` | `LeaveType` | `FULLY_CONNECTED` | `employee` |
| **ApplyLeaveScreen** | Submit Leave Form | `LeaveService.applyLeave` | `POST /api/v1/me/leaves` | `employeeSelfServiceRouter` | `LeaveRequest`, `LeaveBalance` | `FULLY_CONNECTED` | `employee` |
| **LeaveDetailScreen** | Fetch Balances & History | `LeaveService.getBalances`, `getMyRequests` | `GET /api/v1/me/leave-balance`, `/api/v1/me/leaves` | `employeeSelfServiceRouter` | `LeaveBalance`, `LeaveRequest` | `FULLY_CONNECTED` | `employee` |
| **LeaveDetailScreen** | Cancel Pending Leave | `LeaveService.cancelLeave` | `POST /api/leave/requests/:id/cancel` | `leaveRouter` | `LeaveRequest` | `FULLY_CONNECTED` | `employee` |
| **LeaveDetailScreen** | "Request Permission" Button | None | Stub `Alert.alert("Request Permission")` | Missing short-leave route | `LeaveRequest` | `UI_ACTION_BROKEN` | `employee` |
| **LeaveDetailScreen** | "Full leave history" Button | None | Stub `Alert.alert("History")` | Local state only | `LeaveRequest` | `UI_ACTION_BROKEN` | `employee` |
| **CalendarLeavePlannerScreen** | Mount Calendar Matrix | `EmployeeService.getHolidays`, `LeaveService.getMyRequests` | `GET /api/v1/me/organization/holidays`, `/api/v1/me/leaves` | `employeeSelfServiceRouter` | `Holiday`, `LeaveRequest` | `FULLY_CONNECTED` | `employee` |

---

### Domain 5: Payroll, Payslips, Advances & Loans

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **PayslipsScreen** | Fetch Annual Payslips | `PayrollService.getMyPayslips` | `GET /api/v1/me/payslips` | `mePayrollRouter` | `Payslip`, `PayrollCycle` | `FULLY_CONNECTED` | `employee` |
| **SalarySlipDetailScreen** | View Payslip Breakdown | None (Uses fake % calculations) | Should be `GET /api/v1/me/payslips/:id` | `mePayrollRouter` | `Payslip`, `SalaryComponent` | `MOCK_OR_HARDCODED` | `employee` |
| **SalarySlipDetailScreen** | Navigate Month `<` `>` | None (Local state string update) | Should be `GET /api/v1/me/payslips` | `mePayrollRouter` | `Payslip` | `MOBILE_INTEGRATION_MISSING` | `employee` |
| **SalaryAdvanceLoanScreen** | Submit Loan Request | None | Stub `Alert.alert("Request Submitted")` | Backend has `POST /api/v1/me/payroll/loans/request` | `EmployeeLoan` | `MOBILE_INTEGRATION_MISSING` | `employee` |
| **PaymentCardsScreen** | View Bank & Card Info | None (Static markup) | Should be `GET /api/v1/me/profile` | `employeeSelfServiceRouter` | `Employee`, `Profile` | `MOCK_OR_HARDCODED` | `employee` |

---

### Domain 6: Employee Profile & Digital Documents Vault

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **ProfileScreen** | Fetch Employee 360 Profile | `EmployeeService.getMyProfile` | `GET /api/v1/me/profile` | `employeeSelfServiceRouter` | `Employee`, `Profile`, `Department` | `FULLY_CONNECTED` | `employee` |
| **EditProfileScreen** | Save Contact Details | `EmployeeService.updateMyProfile` | `PUT /api/v1/me/profile` | `employeeSelfServiceRouter` | `Profile` | `FULLY_CONNECTED` | `employee` |
| **DocumentsVaultScreen** | Fetch Documents & Contracts | `EmployeeService.getMyDocuments`, `getMyContracts` | `GET /api/v1/me/documents`, `/api/v1/me/documents/contracts` | `employeeSelfServiceRouter` | `Document`, `Contract` | `FULLY_CONNECTED` | `employee` |
| **DocumentsVaultScreen** | Request New HR Document | `EmployeeService.requestDocument` | `POST /api/v1/me/documents/request` | `employeeSelfServiceRouter` | `DocumentRequest` | `FULLY_CONNECTED` | `employee` |
| **DocumentsVaultScreen** | Download Document Button | None | Stub `Alert.alert("Document Downloaded")` | Backend file stream exists | `Document` | `UI_ACTION_BROKEN` | `employee` |

---

### Domain 7: Expenses & Claims

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **ExpenseClaimsScreen** | Fetch User Expense Claims | None (Hardcoded static array) | Should be `GET /api/expenses/claims` | `expensesRouter` | `ExpenseClaim` | `MOCK_OR_HARDCODED` | `employee` |
| **ExpenseClaimsScreen** | Submit New Expense Claim | None (Local state append) | Should be `POST /api/expenses/claims` | `expensesRouter` | `ExpenseClaim` | `MOBILE_SERVICE_MISSING` | `employee` |

---

### Domain 8: Timesheets & Shift Rostering

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **TimesheetScreen** | Fetch Weekly Timesheets | `AttendanceService.getTimesheets` | `GET /api/timesheets` | `timesheetsRouter` | `Timesheet` | `FULLY_CONNECTED` | `employee` |
| **TimesheetScreen** | Add New Timesheet Entry | `AttendanceService.createTimesheet` | `POST /api/timesheets` | `timesheetsRouter` | `Timesheet` | `FULLY_CONNECTED` | `employee` |
| **TimesheetScreen** | Delete Pending Entry | `AttendanceService.deleteTimesheet` | `DELETE /api/timesheets/:id` | `timesheetsRouter` | `Timesheet` | `FULLY_CONNECTED` | `employee` |
| **ShiftScheduleScreen** | Fetch Roster & Swap Status | `AttendanceService.getMyShifts` | `GET /api/v1/me/attendance/shifts` | `employeeSelfServiceRouter` | `ShiftRoster`, `ShiftSwap` | `FULLY_CONNECTED` | `employee` |
| **ShiftScheduleScreen** | Submit Shift Swap Request | `AttendanceService.createShiftSwap` | `POST /api/shifts/swaps` | `shiftsRouter` | `ShiftSwap` | `FULLY_CONNECTED` | `employee` |

---

### Domain 9: Realtime Chat, File Attachments, Voice Notes & Calling

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **ChatConversationsScreen** | List Conversations & Presence | `ChatService.getConversations`, `getPresence` | `GET /api/chat/conversations`, `/api/chat/presence` | `chatRouter` | `ChatConversation`, `User` | `FULLY_CONNECTED` | All authenticated roles |
| **ChatConversationsScreen** | Start Direct Message | `ChatService.createDirectConversation` | `POST /api/chat/conversations/direct` | `chatRouter` | `ChatConversation` | `FULLY_CONNECTED` | All authenticated roles |
| **ChatConversationDetailScreen** | Send Text Message | `ChatService.sendMessage` | `POST /api/chat/messages` | `chatRouter` | `ChatMessage` | `FULLY_CONNECTED` | Thread participants |
| **ChatConversationDetailScreen** | Pre-Send Media Upload (Photo/Doc) | `ChatService.uploadAttachments` | `POST /api/chat/upload` | `chatRouter` | `ChatAttachment` | `FULLY_CONNECTED` | Thread participants |
| **ChatConversationDetailScreen** | Record & Send Voice Note | `ChatService.uploadAttachments` & `sendMessage` | `POST /api/chat/upload` -> `POST /api/chat/messages` | `chatRouter` | `ChatMessage`, `VoiceNote` | `FULLY_CONNECTED` | Thread participants |
| **ChatConversationDetailScreen** | Audio Player Play/Pause | `expo-audio` `createAudioPlayer` | Streams URL directly | Direct Media CDN / Backend | `ChatMessage` | `FULLY_CONNECTED` | Thread participants |
| **WorkspaceModuleShell** | Incoming Call Accept Trigger | `ChatService.acceptCall` | `POST /api/calls/:callId/accept` | `callRouter` | `CallSession` | `FULLY_CONNECTED` | Target callee |
| **WorkspaceModuleShell** | Incoming Call Decline Trigger | `ChatService.rejectCall` | `POST /api/calls/:callId/reject` | `callRouter` | `CallSession` | `FULLY_CONNECTED` | Target callee |
| **ChatCallScreen** | Dial Peer Call | `ChatService.initiateCall` | `POST /api/calls/invite` | `callRouter` | `CallSession` | `FULLY_CONNECTED` | Caller |
| **ChatCallScreen** | Send Heartbeat | `ChatService.sendCallHeartbeat` | `POST /api/calls/:callId/heartbeat` | `callRouter` | `CallSession` | `FULLY_CONNECTED` | Active callers |
| **ChatCallScreen** | Add to Call / Invite Colleague | `ChatService.inviteColleagueToCall` | `POST /api/calls/:callId/invite-colleague` | `callRouter` | `CallSession`, `Participant` | `FULLY_CONNECTED` | Active callers |
| **ChatCallScreen** | End Call Button | `ChatService.endCall` | `POST /api/calls/:callId/end` | `callRouter` | `CallSession` | `FULLY_CONNECTED` | Active callers |

---

### Domain 10: Company Calendar & Meetings

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **CalendarMainScreen** | Fetch Events & Rooms | `CalendarService.getEvents`, `getRooms` | `GET /api/calendar/events`, `/api/calendar/rooms` | `calendarRouter` | `CalendarEvent`, `Room` | `FULLY_CONNECTED` | All authenticated roles |
| **CalendarMainScreen** | Create New Meeting | `CalendarService.createEvent` | `POST /api/calendar/events` | `calendarRouter` | `CalendarEvent`, `Attendee` | `FULLY_CONNECTED` | All authenticated roles |
| **CalendarMainScreen** | RSVP Accept/Decline | `CalendarService.rsvpEvent` | `POST /api/calendar/events/:id/rsvp` | `calendarRouter` | `EventAttendee` | `FULLY_CONNECTED` | Invited Attendee |
| **CalendarMainScreen** | Delete Event | `CalendarService.deleteEvent` | `DELETE /api/calendar/events/:id` | `calendarRouter` | `CalendarEvent` | `FULLY_CONNECTED` | Event Organizer |
| **CalendarMainScreen** | Export Calendar (.ics) | `CalendarService.exportCalendarIcs` | `expo-sharing` / ICS generator | Client generator + share | `CalendarEvent` | `FULLY_CONNECTED` | All authenticated roles |

---

### Domain 11: Tasks, Todos & Gantt Timeline

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **TodoListScreen** | Fetch Tasks & Assignees | `TodoService.getTodos`, `getAssignees` | `GET /api/todos`, `/api/todos/assignees` | `todosRouter` | `TodoItem`, `User` | `FULLY_CONNECTED` | All authenticated roles |
| **TodoListScreen** | Toggle Task Checkbox | `TodoService.updateTodo` | `PUT /api/todos/:id` | `todosRouter` | `TodoItem` | `FULLY_CONNECTED` | Task owner / assignee |
| **TodoSharedModals** | Create New Task | `TodoService.createTodo` | `POST /api/todos` | `todosRouter` | `TodoItem` | `FULLY_CONNECTED` | All authenticated roles |
| **TodoSharedModals** | Add Checklist Item | `TodoService.addChecklistItem` | `POST /api/todos/:id/checklist` | `todosRouter` | `TodoChecklistItem` | `FULLY_CONNECTED` | Task owner / assignee |
| **TodoSharedModals** | Toggle Checklist Item | `TodoService.toggleChecklistItem` | `PATCH /api/todos/:todoId/checklist/:itemId` | `todosRouter` | `TodoChecklistItem` | `FULLY_CONNECTED` | Task owner / assignee |
| **TodoSharedModals** | Post Comment | `TodoService.addComment` | `POST /api/todos/:id/comments` | `todosRouter` | `TodoComment` | `FULLY_CONNECTED` | Task collaborators |
| **GanttTimelineScreen** | Fetch Timeline Tasks | `TodoService.getTodos` | `GET /api/todos` | `todosRouter` | `TodoItem` | `FULLY_CONNECTED` | All authenticated roles |

---

### Domain 12: Performance Reviews & OKR Goals

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **PerformanceScreen** | Fetch Reviews & Goals | `EmployeeService.getMyPerformanceReviews`, `getMyGoals` | `GET /api/v1/me/performance/reviews`, `/api/v1/me/performance/goals` | `employeeSelfServiceRouter` | `PerformanceReview`, `Goal` | `FULLY_CONNECTED` | `employee` |
| **PerformanceScreen** | Submit Goal Check-in | `EmployeeService.checkinGoal` | `POST /api/v1/me/performance/goals/checkin` | `employeeSelfServiceRouter` | `GoalCheckin`, `KeyResult` | `FULLY_CONNECTED` | Goal owner |

---

### Domain 13: Push Notifications & Alerts

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **NotificationsScreen** | Fetch Notifications List | `NotificationService.getNotifications` | `GET /api/notifications` (Mismatch) | Backend is `GET /api/v1/me/notifications` | `Notification` | `CONTRACT_MISMATCH` | All authenticated roles |
| **NotificationsScreen** | Tap to Mark as Read | `NotificationService.markAsRead` | `PATCH /api/notifications/:id/read` (Mismatch) | Backend is `POST /api/v1/shared/notifications/:id/read` | `Notification` | `CONTRACT_MISMATCH` | Recipient |
| **AppBootstrap** | Register Push Token | `NotificationService.registerDeviceToken` | `POST /api/push/register` (Mismatch) | Backend is `POST /api/notifications/push/subscribe` | `PushSubscription` | `CONTRACT_MISMATCH` | Mobile device |

---

### Domain 14: HR Admin Operations

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **EmployeeDirectoryScreen** | Search & Filter Staff | `HrService.getEmployees`, `getDepartments` | `GET /api/employees`, `/api/employees/departments` | `employeesRouter` | `Employee`, `Department` | `FULLY_CONNECTED` | `hr_admin` / `hrm.employees.read` |
| **OrgAttendanceScreen** | Daily Attendance Metrics | `HrService.getDailyAttendanceReport` | `GET /api/attendance/daily-report` | `attendanceRouter` | `Attendance` | `FULLY_CONNECTED` | `hr_admin` / `hrm.attendance.read` |
| **PayrollOverviewScreen** | View Payroll Runs | `HrService.getPayrollRuns` | `GET /api/payroll/cycles` | `payrollCyclesRouter` | `PayrollCycle` | `FULLY_CONNECTED` | `hr_admin` / `hrm.payroll.read` |
| **PendingApprovalsScreen** | Quick Approve Leave | `HrService.updateLeaveStatus` | `PATCH /api/leave/requests/:id/status` | `leaveRouter` | `LeaveRequest` | `FULLY_CONNECTED` | `hr_admin` / `hrm.leave.approve` |
| **PendingApprovalsScreen** | Quick Reject Leave | `HrService.updateLeaveStatus` | `PATCH /api/leave/requests/:id/status` | `leaveRouter` | `LeaveRequest` | `FULLY_CONNECTED` | `hr_admin` / `hrm.leave.approve` |

---

### Domain 15: Manager Operations

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **TeamAttendanceScreen** | Direct Reports Attendance | `ManagerService.getTeamMembers` | `GET /api/v1/me/team` | `employeeSelfServiceRouter` | `Employee`, `Attendance` | `FULLY_CONNECTED` | `manager` |
| **TeamApprovalsScreen** | Fetch Team Approvals Queue | `ManagerService.getTeamApprovals` | `GET /api/v1/me/team/approvals` | `employeeSelfServiceRouter` | `LeaveRequest`, `Regularization` | `FULLY_CONNECTED` | `manager` |
| **TeamApprovalsScreen** | Approve/Reject Team Leave | `ManagerService.actionLeave` | `POST /api/v1/me/team/leaves/:id/action` | `employeeSelfServiceRouter` | `LeaveRequest` | `FULLY_CONNECTED` | Direct reporting manager |
| **TeamApprovalsScreen** | Approve/Reject Regularization | `ManagerService.actionRegularization` | `POST /api/v1/me/team/regularizations/:id/action` | `employeeSelfServiceRouter` | `Regularization` | `FULLY_CONNECTED` | Direct reporting manager |
| **TeamProjectsScreen** | View Team Projects | None (Hardcoded static cards) | Should be `GET /api/projects` | `projectsRouter` | `Project` | `MOCK_OR_HARDCODED` | `manager` |

---

### Domain 16: Tenant Administration Operations

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Role & Permission Gate |
|---|---|---|---|---|---|---|---|
| **WorkspaceSettingsScreen** | Fetch Company Settings | `TenantAdminService.getSettings` | `GET /api/v1/settings/tenant/general` | `settingsRouter` | `TenantSettings` | `FULLY_CONNECTED` | `tenant_admin` |
| **WorkspaceSettingsScreen** | Update Company Settings | `TenantAdminService.updateSettings` | `PUT /api/v1/settings/tenant/general` | `settingsRouter` | `TenantSettings` | `FULLY_CONNECTED` | `tenant_admin` |
| **SecurityOverviewScreen** | View Security & MFA Policy | `TenantAdminService.getSecurityPolicy` | `GET /api/v1/settings/tenant/security` | `settingsRouter` | `TenantSettings` | `FULLY_CONNECTED` | `tenant_admin` |
| **SecurityOverviewScreen** | Edit/Save Security Policy | None (Read-only UI) | Should be `PUT /api/v1/settings/tenant/security` | `settingsRouter` | `TenantSettings` | `MOBILE_INTEGRATION_MISSING` | `tenant_admin` |
| **ModulesOverviewScreen** | View Enabled Modules | None (Hardcoded static cards) | Should be `GET /api/workspace/modules` | `workspaceRouter` | `TenantAddon` | `MOCK_OR_HARDCODED` | `tenant_admin` |
| **UserAccessScreen** | View Seat Utilization | `TenantAdminService.getSeatUtilization` | `GET /api/employees` | `employeesRouter` | `Employee` | `FULLY_CONNECTED` | `tenant_admin` |

---

### Domain 17: Super Admin Platform Console (Web-Only / Mobile-Prohibited)

| Screen | UI Interactive Action | Mobile Service / Method | Axios Method & URL | Backend Router & Route | Controller / DB Model | Status | Policy Enforcement |
|---|---|---|---|---|---|---|---|
| **PlatformTenantsScreen** | Fetch All SaaS Tenants | `SuperAdminService.getTenants` | `GET /api/super/tenants` | `superRouter` | `Tenant` | `AUTHORIZATION_OR_TENANT_GAP` | **PROHIBITED ON MOBILE**: Fails closed at login and routing |
| **SystemDiagnosticsScreen** | Fetch Telemetry & Health | `SuperAdminService.getTelemetry` | `GET /api/super/analytics/telemetry` | `superRouter` | `SystemMetric` | `AUTHORIZATION_OR_TENANT_GAP` | **PROHIBITED ON MOBILE**: Fails closed at login and routing |
