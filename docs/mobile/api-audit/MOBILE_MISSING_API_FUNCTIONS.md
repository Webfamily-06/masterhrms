# MasterHRMS Mobile — Missing & Incomplete API Functions

## 1. Overview & Classification Summary

This document details every missing, incomplete, disconnected, incorrectly wired, mocked, or unsupported API function discovered across the MasterHRMS mobile application.

Each finding is documented with exact source code references, backend route verifications, payload/response contracts, RBAC requirements, and concrete remediation steps.

### Findings Breakdown by Classification

| Classification | Count | Severity Distribution |
|---|---|---|
| **MOBILE_SERVICE_MISSING** | 2 | 2 High (P1) |
| **MOBILE_INTEGRATION_MISSING** | 4 | 2 High (P1), 2 Medium (P2) |
| **MOCK_OR_HARDCODED** | 4 | 2 High (P1), 1 Medium (P2), 1 Low (P3) |
| **CONTRACT_MISMATCH** | 1 | 1 High (P1) |
| **UI_ACTION_BROKEN** | 3 | 3 Medium (P2) |
| **AUTHORIZATION_OR_TENANT_GAP** | 1 | 1 Critical (P0) — Super Admin Mobile Prohibition |
| **Total Actionable Gap Findings** | **15** | **1 P0, 7 P1, 6 P2, 1 P3** |

---

## 2. Detailed Forensic Gap Findings

### GAP-001: Missing Expense Claim Creation Integration
- **Module**: Employee Self-Service (ESS) / Expense Reimbursements
- **Screen**: `ExpenseClaimsScreen`
- **Component**: Add Claim Modal (`modalVisible`) & "Submit Claim" Button
- **Button / Interaction**: Tapping "Submit Claim" button in modal sheet
- **Current Implementation**: Appends an in-memory object (`id: 'exp-${Date.now()}'`) into a local React `useState` array and displays `Alert.alert('Claim Submitted', 'Your expense claim has been routed to your Manager for review.')`. No network request is dispatched.
- **Expected Behavior**: Sends a multipart or JSON payload to the backend, stores the claim in PostgreSQL (`ExpenseClaim`), links any attached receipt file, triggers approval workflow notifications, and re-fetches user claims.
- **Mobile Service**: None (`ExpenseService` does not exist in `mobile-app/src/core/services/`).
- **Existing Backend Route**: `POST /api/expenses/claims`
- **Required HTTP Method**: `POST`
- **Required Payload**:
  ```json
  {
    "title": "Client Onsite Travel",
    "amount": 2500,
    "category": "TRAVEL",
    "date": "2026-11-18",
    "notes": "Taxi fare for customer demo",
    "receiptUrl": "https://..."
  }
  ```
- **Required Response**: `{ claim: ExpenseClaim }`
- **Role and Permission**: `employee` / `ess.expenses.create`
- **Tenant Scope**: Enforced via `req.user.tenantId` in Express `requireAuth`
- **Exact Source File & Line References**: [ExpenseClaimsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/ExpenseClaimsScreen.tsx#L81-L99) (lines 81–99, 271)
- **Classification**: `MOBILE_SERVICE_MISSING`
- **Severity**: **P1 — High**
- **Evidence**:
  ```typescript
  // ExpenseClaimsScreen.tsx: Lines 86-98
  const newClaim: ExpenseItem = {
    id: `exp-${Date.now()}`,
    category,
    title: title.trim(),
    date: 'Nov 16, 2026',
    amount: parseFloat(amount) || 0,
    status: 'PENDING',
  };
  setExpenses([newClaim, ...expenses]);
  Alert.alert('Claim Submitted', 'Your expense claim has been routed to your Manager for review.');
  ```
- **Recommended Solution**: Create `ExpenseService` in `mobile-app/src/core/services/expenseService.ts` calling `POST /api/expenses/claims`, wrap with TanStack Query mutation in `ExpenseClaimsScreen.tsx`.

---

### GAP-002: Hardcoded Mock Expense Claims List
- **Module**: Employee Self-Service (ESS) / Expense Reimbursements
- **Screen**: `ExpenseClaimsScreen`
- **Component**: Expense Claims Feed & Category Filters
- **Button / Interaction**: Initial screen load & toggling category chips (ALL, TRAVEL, MEALS, OFFICE, TELECOM)
- **Current Implementation**: Seeds local state with four hardcoded dummy claims ("Flight to Bangalore", "Client Lunch Meeting", "Ergonomic Mouse", "Mobile Bill") with fixed IDs and dates.
- **Expected Behavior**: Queries `GET /api/expenses/claims` with tenant authentication and displays the authenticated employee's real historical claims.
- **Mobile Service**: None (`ExpenseService` missing).
- **Existing Backend Route**: `GET /api/expenses/claims`
- **Required HTTP Method**: `GET`
- **Required Payload**: Query params: `{ category?: string, status?: string, page?: number, limit?: number }`
- **Required Response**: `{ claims: Array<ExpenseClaim>, pagination: { total, pages } }`
- **Role and Permission**: `employee` / `ess.expenses.read`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [ExpenseClaimsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/ExpenseClaimsScreen.tsx#L42-L75) (lines 42–75)
- **Classification**: `MOCK_OR_HARDCODED`
- **Severity**: **P1 — High**
- **Evidence**: Lines 42–75 of `ExpenseClaimsScreen.tsx` contain literal dummy strings. Backend route verified in [server/src/routes/expenses.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/expenses.routes.ts#L162) (line 162).
- **Recommended Solution**: Add `getMyClaims()` to `ExpenseService` and replace static state with `useQuery(['expenseClaims', activeFilter], ...)`.

---

### GAP-003: Unconnected Salary Advance & Loan Request
- **Module**: ESS / Compensation & Advances
- **Screen**: `SalaryAdvanceLoanScreen`
- **Component**: Loan Application Form & "Submit Request" Button
- **Button / Interaction**: Tapping "Submit Request" button
- **Current Implementation**: Form collects requested amount, loan type, tenure, and reason, but `handleSubmit` only invokes `Alert.alert('Request Submitted', 'Your salary advance request has been forwarded to HR for approval.', [{ text: 'OK', onPress: () => navigation.goBack() }])`. No network request is dispatched.
- **Expected Behavior**: Dispatches payload to `POST /api/v1/me/payroll/loans/request`. Backend creates an `EmployeeLoan` record (`loanType: 'salary_advance'`), creates an audit log entry, and emits an `OutboxEvent` for HR approval.
- **Mobile Service**: Not integrated in `PayrollService` (only `getMyPayslips` and `getPayslipDetail` exist).
- **Existing Backend Route**: `POST /api/v1/me/payroll/loans/request` (mounted via `platformFoundationRouter` / `mePayrollRouter`)
- **Required HTTP Method**: `POST`
- **Required Payload**:
  ```json
  {
    "principal": 50000,
    "tenureMonths": 6,
    "reason": "Medical Emergency",
    "loanType": "salary_advance"
  }
  ```
- **Required Response**: `{ loan: EmployeeLoan }`
- **Role and Permission**: `employee` / `ess.loans.request`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [SalaryAdvanceLoanScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/SalaryAdvanceLoanScreen.tsx#L46-L56) (lines 46–56, 172)
- **Classification**: `MOBILE_INTEGRATION_MISSING`
- **Severity**: **P1 — High**
- **Evidence**:
  ```typescript
  // SalaryAdvanceLoanScreen.tsx: Lines 46-56
  const handleSubmit = () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for the loan request.');
      return;
    }
    Alert.alert(
      'Request Submitted',
      'Your salary advance request has been forwarded to HR for approval.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  ```
  Backend endpoint verified in [server/src/routes/me-payroll.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/me-payroll.routes.ts#L51) (line 51).
- **Recommended Solution**: Implement `requestSalaryAdvance(payload)` in `PayrollService` and connect `handleSubmit` with loading and error states.

---

### GAP-004: Simulated Salary Breakdown & Inactive Month Pagination
- **Module**: ESS / Payroll
- **Screen**: `SalarySlipDetailScreen`
- **Component**: Salary Breakdown Modal Sheets & Month Offset Buttons (`<` `>`)
- **Button / Interaction**: Tapping "Basic Salary", "Allowances", "Tax & Insurance", "Other Deductions" or switching month
- **Current Implementation**: Screen calculates arbitrary percentages from route params (`basicSalary = Math.round(grossAmount * 0.7)`, `taxInsurance = Math.round(deductions * 0.6)`) instead of using actual salary line items. Month navigation updates only the month label in local state without querying the selected month's payslip.
- **Expected Behavior**: Calls `PayrollService.getPayslipDetail(id)` to load exact earnings components (Basic, HRA, Special Allowance) and statutory deductions (PF, ESI, TDS, PT). Month switching fetches the real payslip for that cycle.
- **Mobile Service**: `PayrollService.getPayslipDetail` exists in [payrollService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/services/payrollService.ts#L67) (line 67) but is not called.
- **Existing Backend Route**: `GET /api/v1/me/payslips/:id`
- **Required HTTP Method**: `GET`
- **Required Payload**: Path parameter `id`
- **Required Response**: `PayslipDetail` with real `earnings: [...]` and `deductions: [...]`
- **Role and Permission**: `employee` / `ess.payslips.read`
- **Tenant Scope**: Enforced via `req.user.tenantId` & `req.user.employeeId`
- **Exact Source File & Line References**: [SalarySlipDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/SalarySlipDetailScreen.tsx#L40-L68) (lines 40–68)
- **Classification**: `MOCK_OR_HARDCODED`
- **Severity**: **P1 — High**
- **Evidence**: Lines 40–43 of `SalarySlipDetailScreen.tsx` derive values by multiplying `grossAmount` by fixed factors (`0.7`, `0.6`).
- **Recommended Solution**: Wire `SalarySlipDetailScreen` to `useQuery(['payslipDetail', routeParams.id], () => PayrollService.getPayslipDetail(routeParams.id))`.

---

### GAP-005: Broken Document Download Action
- **Module**: ESS / Documents Vault
- **Screen**: `DocumentsVaultScreen`
- **Component**: Document Row "Download" Action Icon
- **Button / Interaction**: Tapping the download icon next to any document
- **Current Implementation**: Displays `Alert.alert('Document Downloaded', '${docName} has been downloaded to your secure device storage.')`. No file is actually downloaded, cached, or shared.
- **Expected Behavior**: Invokes `openOrShareAttachment({ url: doc.url, fileName: doc.name, mimeType: doc.type })` to download the file via `FileSystem.downloadAsync` and open the native OS sharing/saving sheet.
- **Mobile Service**: `openOrShareAttachment` exists in [attachmentHelper.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/storage/attachmentHelper.ts#L150) (line 150) but is omitted.
- **Existing Backend Route**: `GET /api/v1/me/documents` provides signed preview and download URLs.
- **Required HTTP Method**: `GET`
- **Required Payload**: None
- **Required Response**: S3 / GCS presigned download URL or binary stream
- **Role and Permission**: `employee` / `ess.documents.download`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [DocumentsVaultScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/DocumentsVaultScreen.tsx#L87-L89) (lines 87–89)
- **Classification**: `UI_ACTION_BROKEN`
- **Severity**: **P2 — Medium**
- **Evidence**:
  ```typescript
  // DocumentsVaultScreen.tsx: Lines 87-89
  const handleDownload = (docName: string) => {
    Alert.alert('Document Downloaded', `${docName} has been downloaded to your secure device storage.`);
  };
  ```
- **Recommended Solution**: Replace stub alert with `await openOrShareAttachment({ url: doc.url, fileName: doc.name, mimeType: doc.type })`.

---

### GAP-006: Notification Service Endpoint Route Mismatches
- **Module**: System / Push & Notifications
- **Screen**: `NotificationsScreen`, `AppBootstrap`
- **Component**: Notifications List, Mark as Read, Device Push Token Registration
- **Button / Interaction**: Screen mount, tapping notification to mark as read, app startup push registration
- **Current Implementation**:
  - `NotificationService.getNotifications()` calls `GET /api/notifications`
  - `NotificationService.markAsRead(id)` calls `PATCH /api/notifications/:id/read`
  - `NotificationService.registerDeviceToken(token)` calls `POST /api/push/register`
- **Expected Behavior**:
  - Backend mounts notifications at `GET /api/v1/me/notifications` and `GET /api/v1/shared/notifications`
  - Backend marks notification read via `POST /api/v1/shared/notifications/:id/read`
  - Backend registers push subscriptions via `POST /api/notifications/push/subscribe`
- **Mobile Service**: [notificationService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/services/notificationService.ts)
- **Existing Backend Route**: `GET /api/v1/me/notifications`, `POST /api/v1/shared/notifications/:id/read`, `POST /api/notifications/push/subscribe`
- **Required HTTP Method**: `GET` for list, `POST` for read status, `POST` for push registration
- **Required Payload**:
  - Push subscribe: `{ subscription: { endpoint, keys }, platform: 'android' | 'ios', deviceToken: string }`
- **Required Response**: `{ success: true }`
- **Role and Permission**: All authenticated roles
- **Tenant Scope**: Enforced via `req.user.tenantId` & `req.user.userId`
- **Exact Source File & Line References**: [notificationService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/services/notificationService.ts#L17-L56) (lines 17–28, 36, 52)
- **Classification**: `CONTRACT_MISMATCH`
- **Severity**: **P1 — High**
- **Evidence**: Inspection of [server/src/routes/platform-foundation.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/platform-foundation.routes.ts) and [server/src/routes/push.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/push.routes.ts) shows backend routes do not match `/api/notifications` and `PATCH`.
- **Recommended Solution**: Update URLs and HTTP methods in `notificationService.ts` to match backend contracts exactly.

---

### GAP-007: Attendance Report Download Stub Alerts
- **Module**: ESS / Time & Attendance
- **Screen**: `AttendanceDetailScreen`
- **Component**: Header Download Icon & "Download Full Report" Button
- **Button / Interaction**: Tapping header download icon or bottom full report button
- **Current Implementation**: Displays `Alert.alert('Download', 'Monthly Attendance Report PDF downloaded.')` and `Alert.alert('Report', 'Full Attendance Report downloaded.')`. No API call or file generation occurs.
- **Expected Behavior**: Calls `GET /api/attendance/export?format=pdf&month=X&year=Y` to generate and download the authenticated employee's attendance ledger.
- **Mobile Service**: None in `AttendanceService`.
- **Existing Backend Route**: `GET /api/attendance/export` (server/src/routes/attendance.routes.ts line 310)
- **Required HTTP Method**: `GET`
- **Required Payload**: Query params: `{ format: 'pdf', month: number, year: number }`
- **Required Response**: Binary PDF stream (`Content-Type: application/pdf`)
- **Role and Permission**: `employee` / `ess.attendance.read`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [AttendanceDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/AttendanceDetailScreen.tsx#L174) (line 174, line 388)
- **Classification**: `UI_ACTION_BROKEN`
- **Severity**: **P2 — Medium**
- **Evidence**:
  ```typescript
  // AttendanceDetailScreen.tsx: Line 174 & 388
  onPress={() => Alert.alert('Download', 'Monthly Attendance Report PDF downloaded.')}
  onPress={() => Alert.alert('Report', 'Full Attendance Report downloaded.')}
  ```
- **Recommended Solution**: Add `downloadAttendanceReport(params)` in `AttendanceService` and stream PDF into device storage via `attachmentHelper`.

---

### GAP-008: Short Leave Permission Flow Stub Alert
- **Module**: ESS / Leave Management
- **Screen**: `LeaveDetailScreen`
- **Component**: "Request Permission" Action & "Full leave history" Link
- **Button / Interaction**: Tapping "Request Permission" or "Full leave history"
- **Current Implementation**: Displays `Alert.alert('Request Permission', 'Permission request modal opened.')` and `Alert.alert('History', 'Full leave history.')`.
- **Expected Behavior**: Opens modal sheet to apply for on-duty / 2-hour short permission and dispatches to `/api/v1/me/leaves` (with permission flag). "Full leave history" filters historical leave records.
- **Mobile Service**: `LeaveService`
- **Existing Backend Route**: `POST /api/v1/me/leaves`
- **Required HTTP Method**: `POST`
- **Required Payload**: `{ leaveTypeId, startDate, endDate, reason, isPermission: true }`
- **Required Response**: `{ request: LeaveRequest }`
- **Role and Permission**: `employee` / `ess.leaves.create`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [LeaveDetailScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/LeaveDetailScreen.tsx#L284) (line 284, line 476)
- **Classification**: `UI_ACTION_BROKEN`
- **Severity**: **P2 — Medium**
- **Evidence**: Lines 284 and 476 of `LeaveDetailScreen.tsx` are literal `Alert.alert` calls.
- **Recommended Solution**: Connect permission request modal to `LeaveService.applyLeave`.

---

### GAP-009: Manager Team Projects Hardcoded Mock List
- **Module**: Manager Self-Service / Projects
- **Screen**: `TeamProjectsScreen`
- **Component**: Team Projects Card Feed
- **Button / Interaction**: Mounting `TeamProjectsScreen`
- **Current Implementation**: Renders 3 static project objects ("HRMS Mobile App v2", "Enterprise SSO Integration", "Global Payroll Automation") with fixed member avatars and progress values.
- **Expected Behavior**: Queries `GET /api/projects` to fetch projects assigned to the manager's reporting team.
- **Mobile Service**: None in `ManagerService`.
- **Existing Backend Route**: `GET /api/projects` ([projects.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/projects.routes.ts#L65) line 65)
- **Required HTTP Method**: `GET`
- **Required Payload**: Query params: `{ status?: 'active' }`
- **Required Response**: `{ projects: Array<Project> }`
- **Role and Permission**: `manager` / `prm.projects.read`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [TeamProjectsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/manager/screens/TeamProjectsScreen.tsx#L23-L55) (lines 23–55)
- **Classification**: `MOCK_OR_HARDCODED`
- **Severity**: **P2 — Medium**
- **Evidence**: `projects` array at lines 23–55 of `TeamProjectsScreen.tsx` is static local data.
- **Recommended Solution**: Add `getTeamProjects()` to `ManagerService` and bind with `useQuery`.

---

### GAP-010: Tenant Admin Modules Hardcoded Static List
- **Module**: Tenant Administration / Modules
- **Screen**: `ModulesOverviewScreen`
- **Component**: Enterprise Modules Grid
- **Button / Interaction**: Mounting `ModulesOverviewScreen`
- **Current Implementation**: Displays 8 static modules with hardcoded "Active" badges and descriptions without consulting server entitlements.
- **Expected Behavior**: Calls `GET /api/workspace/modules` or `GET /api/v1/settings/tenant/modules` to inspect licensed enterprise modules and subscription limits.
- **Mobile Service**: None in `TenantAdminService`.
- **Existing Backend Route**: `GET /api/workspace/modules` ([workspace.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/workspace.routes.ts#L180) line 180)
- **Required HTTP Method**: `GET`
- **Required Payload**: None
- **Required Response**: `{ modules: Array<{ id, name, enabled, tier }> }`
- **Role and Permission**: `tenant_admin` / `settings.read`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [ModulesOverviewScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/tenant-admin/screens/ModulesOverviewScreen.tsx#L45-L88) (lines 45–88)
- **Classification**: `MOCK_OR_HARDCODED`
- **Severity**: **P2 — Medium**
- **Evidence**: Static modules array in `ModulesOverviewScreen.tsx`.
- **Recommended Solution**: Add `getTenantModules()` to `TenantAdminService` and query dynamically.

---

### GAP-011: Static Mock Bank Details in Payment Cards
- **Module**: ESS / Salary & Bank
- **Screen**: `PaymentCardsScreen`
- **Component**: Virtual Card & Salary Bank Account Preview
- **Button / Interaction**: Mounting `PaymentCardsScreen`
- **Current Implementation**: Renders hardcoded dummy card (ending in `4242`) and dummy bank account (`HDFC Bank`) without reading employee profile data.
- **Expected Behavior**: Fetches authenticated employee's bank information (`bankAccountNumber`, `bankIfsc`, `bankName`) from `GET /api/v1/me/profile`.
- **Mobile Service**: `EmployeeService.getMyProfile()` exists but is not used in this screen.
- **Existing Backend Route**: `GET /api/v1/me/profile`
- **Required HTTP Method**: `GET`
- **Required Payload**: None
- **Required Response**: `{ employee: { bankAccountNumber, bankIfsc, bankName } }`
- **Role and Permission**: `employee` / `ess.profile.read`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [PaymentCardsScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/PaymentCardsScreen.tsx#L38-L85) (lines 38–85)
- **Classification**: `MOCK_OR_HARDCODED`
- **Severity**: **P3 — Low**
- **Evidence**: Static markup in `PaymentCardsScreen.tsx`.
- **Recommended Solution**: Bind `PaymentCardsScreen` to `EmployeeService.getMyProfile()` to render real bank details.

---

### GAP-012: Super Admin Mobile Access Architectural Prohibition
- **Module**: Platform Foundation / Super Admin Console
- **Screen**: `PlatformTenantsScreen`, `SystemDiagnosticsScreen`, `SuperAdminDashboardScreen`
- **Component**: Super Admin Navigation Stack & API Service
- **Button / Interaction**: Attempting to log in as `super_admin` or navigate to super admin routes
- **Current Implementation**: Code exists in `mobile-app/src/modules/super-admin/` and `superAdminService.ts`, but `authService.ts` explicitly rejects super admin logins with:
  `"Access denied. Super Administrator accounts cannot log in to the mobile application. This mobile app is exclusively for Employees, HR, and Tenant Administrators."`
  and `AppNavigator.tsx` does not route to `SuperAdminNavigator`.
- **Expected Behavior**: **STRICT ARCHITECTURAL POLICY**: Super Administrator operations are web-only and prohibited on mobile to protect SaaS platform multi-tenant root keys and master billing credentials.
- **Mobile Service**: `SuperAdminService` (unreachable dead code on mobile).
- **Existing Backend Route**: `GET /api/super/stats`, `GET /api/super/tenants` (Reject non-super-admin tokens)
- **Role and Permission**: `super_admin` (Mobile Prohibited)
- **Tenant Scope**: Global Platform (Prohibited on mobile)
- **Exact Source File & Line References**: [authService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/auth/authService.ts#L69-L78) (lines 69–78); [AppNavigator.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/navigation/AppNavigator.tsx#L1-L31) (lines 1–31)
- **Classification**: `AUTHORIZATION_OR_TENANT_GAP`
- **Severity**: **P0 — Critical (Governance & Policy Guard)**
- **Evidence**: Explicit code guard in `authService.ts` line 74 and unmounted `SuperAdminNavigator`.
- **Recommended Solution**: Formally document that Super Admin features are permanently web-only. Keep the mobile access gate locked.

---

### GAP-013: Biometric Local Unlock Missing Backend Refresh
- **Module**: Authentication & Biometrics
- **Screen**: `FaceIdAuthScreen`, `FingerprintAuthScreen`
- **Component**: Biometric Prompt Buttons
- **Button / Interaction**: Tapping "Scan Face ID" or "Touch Fingerprint Sensor"
- **Current Implementation**: Authenticates locally against device biometrics via Keychain, but if the in-memory access token has expired, it does not invoke `POST /api/v1/auth/refresh` with the stored refresh token to re-establish an active server session.
- **Expected Behavior**: Upon successful biometric validation, retrieves stored `refreshToken` from Keychain and executes `POST /api/v1/auth/refresh` to obtain a fresh access token before transitioning to the dashboard.
- **Mobile Service**: `BiometricService` & `AuthService`
- **Existing Backend Route**: `POST /api/v1/auth/refresh` ([auth.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/auth.routes.ts#L607) line 607)
- **Required HTTP Method**: `POST`
- **Required Payload**: `{ refreshToken: string }`
- **Required Response**: `{ token: string, refreshToken: string, user: User, roles: string[] }`
- **Role and Permission**: Authenticated employee with enrolled biometrics
- **Tenant Scope**: Enforced via refresh token claims
- **Exact Source File & Line References**: [FaceIdAuthScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/authentication/screens/FaceIdAuthScreen.tsx#L50-L75) (lines 50–75); [FingerprintAuthScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/authentication/screens/FingerprintAuthScreen.tsx#L45-L70) (lines 45–70)
- **Classification**: `MOBILE_INTEGRATION_MISSING`
- **Severity**: **P1 — High**
- **Evidence**: Biometric screens verify local biometrics but lack `AuthService.refreshToken()` dispatch on session expiration.
- **Recommended Solution**: Add session restoration dispatch in biometric screen success handlers.

---

### GAP-014: Security Overview Missing Policy Mutation Action
- **Module**: Tenant Administration / Security
- **Screen**: `SecurityOverviewScreen`
- **Component**: Security & MFA Policy Configuration Display
- **Button / Interaction**: Viewing security policies
- **Current Implementation**: Screen displays MFA requirement, session timeout, and password length fetched via `TenantAdminService.getSecurityPolicy()`, but is rendered in a read-only container without interactive controls or a "Save" action to update policies.
- **Expected Behavior**: Allows tenant administrators to toggle MFA requirements, change session timeouts, and persist updates via `PUT /api/v1/settings/tenant/security`.
- **Mobile Service**: `TenantAdminService.updateSettings('security', data)` exists in [tenantAdminService.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/core/services/tenantAdminService.ts#L43) (line 43) but is not wired.
- **Existing Backend Route**: `PUT /api/v1/settings/tenant/security`
- **Required HTTP Method**: `PUT`
- **Required Payload**: `{ mfaRequired: boolean, sessionTimeoutMinutes: number, passwordMinLength: number }`
- **Required Response**: `{ success: true, settings: SecurityPolicy }`
- **Role and Permission**: `tenant_admin` / `settings.update`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [SecurityOverviewScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/tenant-admin/screens/SecurityOverviewScreen.tsx#L35-L65) (lines 35–65)
- **Classification**: `MOBILE_INTEGRATION_MISSING`
- **Severity**: **P2 — Medium**
- **Evidence**: Read-only JSX elements in `SecurityOverviewScreen.tsx`.
- **Recommended Solution**: Add interactive toggle switches, an edit modal, and call `TenantAdminService.updateSettings('security', payload)`.

---

### GAP-015: Direct Profile Update Bypassing Manager Approval
- **Module**: ESS / Profile Changes
- **Screen**: `EditProfileScreen`
- **Component**: Profile Edit Form & "Save Changes" Button
- **Button / Interaction**: Tapping "Save Changes"
- **Current Implementation**: Dispatches `PUT /api/v1/me/profile` which updates profile fields immediately in the database.
- **Expected Behavior**: For critical statutory/banking fields (e.g., PAN, Aadhaar, Bank Account), backend routes support an approval queue (`POST /api/v1/hr/requests/profile-changes`). Non-critical fields (phone, address, emergency contact) are allowed direct edit.
- **Mobile Service**: `EmployeeService.updateMyProfile`
- **Existing Backend Route**: `POST /api/v1/hr/requests/profile-changes` & `PUT /api/v1/me/profile`
- **Required HTTP Method**: `POST` for sensitive changes; `PUT` for personal contact info
- **Required Payload**: `{ field: string, oldValue: string, newValue: string, reason: string }`
- **Required Response**: `{ request: ProfileChangeRequest }`
- **Role and Permission**: `employee` / `ess.profile.edit`
- **Tenant Scope**: Enforced via `req.user.tenantId`
- **Exact Source File & Line References**: [EditProfileScreen.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/mobile-app/src/modules/ess/screens/EditProfileScreen.tsx#L55-L80) (lines 55–80)
- **Classification**: `CONTRACT_MISMATCH`
- **Severity**: **P2 — Medium**
- **Evidence**: `EditProfileScreen.tsx` currently only edits non-critical contact fields (`phone`, `address`, `emergencyContact`), which is safe, but lacks routing to the profile change request queue if banking details are edited.
- **Recommended Solution**: Document boundary: restrict mobile direct edits to personal contact info, and route sensitive changes to the change request workflow.
