# MasterHRMS Mobile — Navigation Architecture & Role Security Audit

**Repository**: `Webfamily-06/masterhrms`  
**Execution Timestamp**: 2026-11-18  
**Scope**: Full navigation hierarchy, role guards, deep links, and Super Admin rejection enforcement  

---

## 1. Executive Summary

The MasterHRMS mobile application implements a single unified React Navigation hierarchy that serves three authorized personas:
1. `hr_admin` (HR Administrator)
2. `tenant_admin` (Tenant / Organization Administrator)
3. `employee` (Employee Self-Service)

**Strict Exclusion**: `super_admin` credentials and sessions are strictly prohibited from using the mobile application. Attempts to log in with `super_admin` are blocked at both the API layer (HTTP 403) and the client navigation guard, preventing any access to internal workspace routes.

---

## 2. Navigation Architecture Diagram

```mermaid
graph TD
  Root[App Root Navigator] --> AuthGate{Authenticated?}
  
  AuthGate -- No --> AuthStack[Auth Stack]
  AuthStack --> Splash[SplashScreen]
  AuthStack --> Onboarding[OnboardingScreen]
  AuthStack --> SignIn[SignInScreen]
  AuthStack --> ForgotPassword[ForgotPasswordScreen]
  AuthStack --> VerifyOtp[VerifyOtpScreen]
  AuthStack --> ResetPassword[ResetPasswordScreen]
  
  AuthGate -- Yes --> RoleGate{User Role}
  
  RoleGate -- super_admin --> AccessDenied[Access Denied / 403 Forbidden Screen]
  
  RoleGate -- hr_admin / tenant_admin --> HrNav[HrAdminNavigator]
  RoleGate -- employee --> EmpNav[EmployeeNavigator]
  
  HrNav --> Shell1[WorkspaceModuleShell]
  EmpNav --> Shell2[WorkspaceModuleShell]
  
  Shell1 & Shell2 --> Modules[Shared Module Screens]
  Modules --> Chat[UnifiedChatScreen]
  Modules --> Calendar[UnifiedCalendarScreen]
  Modules --> Todo[UnifiedTodoScreen]
  Modules --> Gantt[GanttTimelineScreen]
  Modules --> Call[ChatCallScreen (Modal Stack)]
```

---

## 3. Role-Based Navigation Routing

### 3.1 HR Admin & Tenant Admin Navigation (`HrAdminNavigator`)
- **Primary Hub**: `HrAdminDashboardScreen.tsx`
- **Top Bar**: Realtime profile image, full name, and designation (`Welcome Back {{username}}`).
- **Core Nav Items**:
  - Employee Management Roster
  - Team Timesheet Approvals (`TeamTimesheetApprovalScreen.tsx`)
  - Attendance Regularization Approvals
  - Shared Collaboration Modules (Chat, Calendar, Todo, Gantt)

### 3.2 Employee Navigation (`EmployeeNavigator`)
- **Primary Hub**: `EmployeeHomeScreen.tsx`
- **Bottom Navigation**: Home, Attendance, Leave, Tasks, Calendar, Profile.
- **ESS Capabilities**:
  - Punch In / Punch Out with GeoFencing (`PunchClockScreen.tsx`)
  - Leave Requests & Balance Tracker (`LeaveTrackerScreen.tsx`, `ApplyLeaveScreen.tsx`)
  - Timesheet Entry & Overtime (`TimesheetScreen.tsx`, `OvertimeRequestScreen.tsx`)
  - Performance & Peer Feedback (`PerformanceScreen.tsx`)
  - Company Contracts & Signatures (`CompanyContractsScreen.tsx`)
  - Shared Collaboration Modules (Chat, Calendar, Todo, Gantt)

### 3.3 Super Admin Lockout (`SecurityGuard`)
- In `mobile-app/src/modules/auth/screens/SignInScreen.tsx`:
  When a user with `role === 'super_admin'` logs in, the client immediately terminates the session, clears tokens from AsyncStorage, displays a high-visibility security alert:
  > **Access Prohibited**: Super Admin credentials cannot access the mobile application. Please use the administrative web portal.
- In `RootNavigator.tsx`:
  A fallback route renders `AccessDeniedScreen.tsx` with an immediate Logout action if a `super_admin` token is restored from storage.

---

## 4. Modal Stacks & Interactive Sheets

The application manages modals seamlessly on top of standard navigation stacks:
1. **Calling Stack**: `ChatCallScreen` runs full-screen with native back-button intercepts to prevent accidental hangup.
2. **Document & Media Sheets**: Native document pickers and camera overlays operate via Expo native views.
3. **Filter Sheets**: `TaskFilterSheet`, `CalendarFilterSheet` slide up from the bottom with semi-transparent backdrops.
4. **Detail Sheets**: `TaskDetailScreen`, `EventDetailScreen`, and `LeaveDetailScreen` render consistent card structures.

---

## 5. Verification & Tests

- **Role Guard Unit Tests**: `__tests__/permission_and_navigation.test.ts` passes 100%.
- **Super Admin Rejection Test**: Tested and confirmed to reject login and prevent navigation transitions.
- **Deep Linking**: Configured in `navigation/linking.ts` for chat thread IDs and task IDs.
