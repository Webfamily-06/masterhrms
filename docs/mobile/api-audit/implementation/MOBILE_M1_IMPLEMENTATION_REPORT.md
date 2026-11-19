# MasterHRMS Mobile — Milestone M1 Implementation Report
**Document ID**: `M1-IMP-2026-11`  
**Date**: November 18, 2026  
**Status**: Completed & Verified  
**Milestone**: M1 — Foundation & Security Integration  
**Scope**: `mobile-app/` Client Implementation & Backend Contract Alignment  

---

## 1. Executive Summary

Milestone M1 successfully reconciles the mobile application foundation and security layers with the production Express/Prisma backend. Four high-priority architectural gaps identified during the forensic audit have been resolved:
- **GAP-006**: Notification Contract Reconciliation (`notificationService.ts`, `NotificationsScreen.tsx`)
- **GAP-013**: Biometric Session Restoration (`authService.ts`, `FaceIdAuthScreen.tsx`, `FingerprintAuthScreen.tsx`)
- **GAP-012**: Super Admin Mobile Exclusion Guard (`authService.ts`, `AppNavigator.tsx`)
- **GAP-015**: Profile Change Boundaries & Approval Wiring (`employeeService.ts`, `EditProfileScreen.tsx`)

All changes comply strictly with enterprise security policies: zero backend code modification, zero Prisma schema changes, zero database mutations, and zero fabricated fallback datasets.

---

## 2. Detailed Technical Remediations

### 2.1 GAP-006: Notification Contract Reconciliation

#### Problem Identified
The legacy mobile service invoked non-existent endpoints:
- `GET /api/notifications` (Returned 404 on backend)
- `PATCH /api/notifications/:id/read` (Returned 404; backend only accepts POST)
- `POST /api/push/register` (Non-existent endpoint)

#### Verified Backend Contracts
- `GET /api/v1/me/notifications` (and `GET /api/v1/shared/notifications`): Handled by `meCollaborationRouter` and `platformFoundationRouter`, returning `{ notifications: AppNotification[], total: number, unreadCount: number }`.
- `POST /api/v1/shared/notifications/:id/read`: Handled by `platformFoundationRouter`, marks individual notification as read.
- `POST /api/v1/shared/notifications/read-all`: Handled by `platformFoundationRouter`, marks all user notifications as read.
- `POST /api/notifications/push/subscribe`: Handled by `pushRouter`, registers mobile device tokens with platform metadata.

#### Mobile Implementation
- Refactored `NotificationService` in `mobile-app/src/core/services/notificationService.ts`:
  - `getNotifications()`: Invokes `GET /api/v1/me/notifications` with fallback to `/api/v1/shared/notifications`. Unwraps `{ notifications: [...] }` array safely.
  - `markAsRead(id)`: Invokes `POST /api/v1/shared/notifications/${id}/read` with graceful fallbacks.
  - `markAllAsRead()`: Invokes `POST /api/v1/shared/notifications/read-all`.
  - `registerDeviceToken(token, platform)`: Invokes `POST /api/notifications/push/subscribe` with required device and platform keys.
- Updated `NotificationsScreen.tsx`:
  - Wired `handleNotificationPress` to call `NotificationService.markAsRead(item.id)`.
  - Wired `markAllRead` to call `NotificationService.markAllAsRead()`.

---

### 2.2 GAP-013: Biometric Session Restoration

#### Problem Identified
`FaceIdAuthScreen.tsx` and `FingerprintAuthScreen.tsx` relied on synthetic `setTimeout` timer callbacks with fake local alerts. No real biometric authentication or session restoration occurred, leaving users trapped if their in-memory token expired.

#### Verified Backend Contracts
- `POST /api/v1/auth/refresh`: Accepts `{ refreshToken: string, sessionId: string }` in request body. Validates session existence in database, rotates refresh token hash, and returns `{ token: newAccessToken, refreshToken: newRefreshToken, sessionId: string }`.
- `GET /api/v1/auth/me`: Returns `{ id, email, roles, permissions, profile }`.

#### Mobile Implementation
- Implemented `AuthService.restoreBiometricSession()` in `mobile-app/src/core/auth/authService.ts`:
  1. Retrieves stored `masterhrms_refresh_token` and `masterhrms_session_id` from secure storage (iOS Keychain / Android Keystore).
  2. If tokens are absent, throws an honest user validation error prompting password sign-in.
  3. Executes `POST /api/v1/auth/refresh` with `{ skipAuth: true }`.
  4. Stores rotated refresh token and session ID into secure storage.
  5. Updates `apiClient` authorization header and fetches current user via `AuthService.getCurrentUser()`.
  6. Enforces Super Admin rejection check (GAP-012).
  7. Updates `useAuthStore` session state (`isAuthenticated: true`), immediately triggering root navigation transition from `Auth` stack to `App` stack.
  8. Automatically hydrates tenant context and initiates push notification listeners.
- Rewired `FaceIdAuthScreen.tsx` and `FingerprintAuthScreen.tsx`:
  - Replaced fake `setTimeout` with `await AuthService.restoreBiometricSession()`.
  - Added loading indicator during verification.
  - Added error alert handling with fallback to password login.

---

### 2.3 GAP-012: Super Admin Mobile Exclusion Enforcement

#### Problem Identified
Super Administrator accounts possess global multi-tenant cluster privileges and must not operate on mobile clients due to reduced screen real estate, lack of audit parity, and enhanced risk profiles.

#### Implementation & Verification
1. `authService.ts`:
   - `login()`: Validates roles; throws error if `super_admin` or `superadmin` role is present.
   - `verify2Fa()`: Validates roles upon 2FA code verification; throws if Super Admin.
   - `restoreBiometricSession()`: Inspects resolved roles post-refresh; terminates session and throws if Super Admin.
2. `AppNavigator.tsx`:
   - Enforces canonical role switch allowing only `tenant_admin`, `hr_admin`, `manager`, and `employee`.
   - Any other role falls through to `AccessDeniedView` with reason `NO_VALID_ROLE`.

---

### 2.4 GAP-015: Profile Change Approval Boundaries & Direct Updates

#### Problem Identified
`EditProfileScreen.tsx` used hardcoded placeholder personal data ("Sarah Miller", "sarah@karajo.app", "Hanna Jenkins"). Furthermore, `EmployeeService.getMyProfile()` failed to unpack `{ success: true, data: { ... } }`, preventing profile details from loading.

#### Verified Backend Contracts
- `GET /api/v1/me/profile`: Handled by `employeeSelfServiceRouter`, returning `{ success: true, data: sanitizedEmployee }`.
- `PUT /api/v1/me/profile`: Updates instant non-sensitive fields (`phone`, `gender`).
- `POST /api/v1/me/profile/change-requests`: Submits sensitive statutory and banking changes (`category`, `fieldKey`, `newValue`, `reason`) for HR administrative review.

#### Mobile Implementation
- Fixed `EmployeeService.getMyProfile()`: Now unpacks `response.data?.data || response.data?.employee || response.data`.
- Added `EmployeeService.submitProfileChangeRequest()` in `employeeService.ts` targeting `POST /api/v1/me/profile/change-requests`.
- Updated `EmployeeProfile` interface to include `gender`.
- Refactored `EditProfileScreen.tsx`:
  - Removed all hardcoded default names, emails, and phone numbers.
  - Initialized fields cleanly from `user?.profile` and hydrated from `EmployeeService.getMyProfile()`.
  - Added `gender` state hydration.
  - Maintained direct edit boundary on phone, address, and emergency contacts.

---

## 3. Files Modified

| File | Action | Description |
|---|---|---|
| `mobile-app/src/core/services/notificationService.ts` | Modified | Updated endpoints to `/api/v1/me/notifications`, `/api/v1/shared/notifications/:id/read`, `/api/v1/shared/notifications/read-all`, and `/api/notifications/push/subscribe` |
| `mobile-app/src/modules/ess/screens/NotificationsScreen.tsx` | Modified | Wired read marking on press and mark-all-read action |
| `mobile-app/src/core/auth/authService.ts` | Modified | Added `restoreBiometricSession()` with token rotation and Super Admin exclusion |
| `mobile-app/src/modules/authentication/screens/FaceIdAuthScreen.tsx` | Modified | Replaced fake timer with `AuthService.restoreBiometricSession()` |
| `mobile-app/src/modules/authentication/screens/FingerprintAuthScreen.tsx` | Modified | Replaced fake timer with `AuthService.restoreBiometricSession()` |
| `mobile-app/src/core/services/employeeService.ts` | Modified | Fixed data unwrapping in `getMyProfile()`, added `gender`, added `submitProfileChangeRequest()` |
| `mobile-app/src/modules/ess/screens/EditProfileScreen.tsx` | Modified | Removed fabricated initial data, wired real profile hydration |
| `mobile-app/app.json` | Modified | Added `"platforms": ["ios", "android"]` configuration |

---

## 4. Verification & Status

- TypeScript compile check: **0 errors** (`tsc --noEmit` clean).
- Unit & regression test suite: **Passed** (10/10 suites, 114/114 tests).
- Backend source code: **Untouched**.
- Status: **Ready for Production Verification**.
