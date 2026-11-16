# MASTERHRMS MOBILE — AUTHORITATIVE API MAPPING SPECIFICATION
**Complete Network & Endpoint Contract for React Native Mobile Application**  
**Repository:** `Webfamily-06/masterhrms`  
**Backend:** Node.js Express 4 Engine (`server/src/`)  
**Target:** Unified Role-Based Mobile App (Employee, HR, Admin)  
**Date:** November 16, 2026  

---

## 1. Global Network Contract & Standard Headers

### 1.1 Base URL Configuration
- **Development**: `http://10.0.2.2:5000` (Android Emulator) or `http://localhost:5000` (iOS Simulator) / Local LAN IP `http://192.168.x.x:5000` (Physical Device).
- **Production**: `https://api.masterhrms.com` (or tenant-specific custom domain if configured).

### 1.2 Required Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-tenant-id: <TENANT_UUID>
x-tenant-slug: <TENANT_SLUG>
User-Agent: MasterHRMS-Mobile/<VERSION> (<PLATFORM>; <OS_VERSION>)
```

### 1.3 Standard Response Formats

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```
*(Note: Some legacy endpoints return raw objects or arrays directly. Mobile API client handles both transparently).*

#### Paginated Response (Stocky Universal Standard)
```json
{
  "data": [ ... ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 25,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Error Response
```json
{
  "error": "Human readable error description",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "requestId": "uuid-v4",
  "details": { ... }
}
```

---

## 2. Authentication & Session Services (`authService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `login(credentials)` | `POST` | `/api/v1/auth/login` | Email & password login. Returns session or 2FA challenge. | No |
| `verify2Fa(mfaToken, code)` | `POST` | `/api/v1/auth/2fa/verify-login` | Completes login with 6-digit email/authenticator OTP. | No (MFA Token) |
| `resend2Fa(mfaToken)` | `POST` | `/api/v1/auth/2fa/resend` | Dispatches a fresh 6-digit verification code. | No (MFA Token) |
| `refreshToken(refresh, sid)` | `POST` | `/api/v1/auth/refresh` | Rotates refresh token & issues new access token. | No |
| `logout(sid, deviceId)` | `POST` | `/api/v1/auth/logout` | Revokes server session, clears push subscriptions. | Yes |
| `getCurrentUser()` | `GET` | `/api/v1/auth/me` | Fetches active user, profile, roles, permissions. | Yes |
| `forgotPassword(email)` | `POST` | `/api/v1/auth/forgot-password` | Initiates password reset email link and OTP. | No |
| `resetPassword(payload)` | `POST` | `/api/v1/auth/reset-password` | Resets password with token or OTP code. | No |
| `getActiveSessions()` | `GET` | `/api/v1/auth/sessions` | Lists all active device sessions for current user. | Yes |
| `revokeSession(sessionId)` | `DELETE`| `/api/v1/auth/sessions/:sessionId` | Revokes a specific remote device session. | Yes |

---

## 3. Tenant Discovery & Company Identification (`tenantService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `resolveTenant(slugOrId)` | `GET` | `/api/auth/public/tenant/resolve?slug={slug}` | Fetches company name, logo, theme colors, timezone. | No |
| `getTenantCredentials(slug)`| `GET` | `/api/auth/public/tenant/credentials?slug={slug}`| Development utility for test logins. | No |
| `getTenantBranding()` | `GET` | `/api/v1/settings/TENANT/branding` | Fetches full branding assets for authenticated workspace. | Yes |

---

## 4. Employee Self-Service (`employeeService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `getProfile()` | `GET` | `/api/v1/me/profile` | Personal details, masked statutory info (PAN, Aadhaar). | Yes |
| `updateProfile(data)` | `PUT` | `/api/v1/me/profile` | Updates instant non-sensitive fields (phone, gender). | Yes |
| `requestProfileChange(req)` | `POST` | `/api/v1/me/profile/change-requests` | Submits bank/statutory changes for HR approval. | Yes |
| `getProfileChangeRequests()`| `GET` | `/api/v1/me/profile/change-requests` | History of submitted profile change requests. | Yes |
| `getDashboardMetrics()` | `GET` | `/api/v1/me/dashboard` | Aggregated dashboard: today attendance, leaves, shift. | Yes |
| `getColleaguesDirectory()` | `GET` | `/api/v1/me/employees` | Organization employee directory for contacts. | Yes |
| `getHolidays()` | `GET` | `/api/v1/me/organization/holidays` | Company official holiday calendar. | Yes |
| `getAnnouncements()` | `GET` | `/api/v1/me/organization/announcements` | Company announcements with unread indicators. | Yes |
| `ackAnnouncement(id)` | `POST` | `/api/v1/me/organization/announcements/:id/acknowledge` | Marks company announcement as acknowledged. | Yes |

---

## 5. Attendance & Geo-Fencing Services (`attendanceService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `punchAttendance(punchData)`| `POST` | `/api/attendance/punch` | **Unified Mobile Punch**: Check-in / out with GPS validation. | Yes |
| `getAttendanceHistory(params)`| `GET`| `/api/attendance` | Monthly / daily attendance log with status and hours. | Yes |
| `requestRegularization(req)`| `POST` | `/api/v1/me/regularizations` | Regularization request for missed or late punches. | Yes |
| `getRegularizations()` | `GET` | `/api/v1/me/regularizations` | List of employee's attendance regularization requests. | Yes |
| `withdrawRegularization(id)`| `POST`| `/api/v1/me/regularizations/:id/withdraw` | Withdraws a pending regularization request. | Yes |

#### `POST /api/attendance/punch` Schema
```json
// Request
{
  "type": "check_in", // or "check_out"
  "latitude": 19.0657,
  "longitude": 72.8687,
  "deviceId": "mobile-device-uuid",
  "notes": "Arrived at BKC office"
}

// Response
{
  "success": true,
  "action": "check_in",
  "attendance": {
    "id": "att-uuid",
    "date": "2026-11-16T00:00:00.000Z",
    "checkIn": "2026-11-16T09:12:00.000Z",
    "checkOut": null,
    "status": "present",
    "hours": null
  },
  "geoFence": {
    "valid": true,
    "distanceMeters": 35
  }
}
```

---

## 6. Leave Management Services (`leaveService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `getLeaveTypes()` | `GET` | `/api/leave/types` | Available leave categories (Casual, Sick, Paid, etc.). | Yes |
| `getLeaveBalances(year)` | `GET` | `/api/v1/me/leave-balance?year={year}`| Accrual-aware total, used, pending, and remaining days. | Yes |
| `getLeaveRequests(params)` | `GET` | `/api/v1/me/leaves` | Employee's submitted leave requests with timeline. | Yes |
| `validateLeave(payload)` | `POST` | `/api/v1/me/leaves/validate` | Preflight check for balance sufficiency and holidays. | Yes |
| `applyLeave(application)` | `POST` | `/api/v1/me/leaves` | Submits leave request (single, multi-day, half-day). | Yes |
| `cancelLeave(id, reason)` | `POST` | `/api/leave/requests/:id/cancel` | Cancels a pending or approved future leave request. | Yes |

---

## 7. Payroll & Payslips Services (`payrollService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `getPayslips(year)` | `GET` | `/api/v1/me/payslips` | List of published monthly payslips. | Yes |
| `getPayslipDetails(id)` | `GET` | `/api/v1/me/payslips/:id` | Itemized earnings, deductions, PF/ESI, net salary. | Yes |
| `getTaxDeclarations()` | `GET` | `/api/v1/me/tax-declaration` | IT declaration status, regimes (Old vs New). | Yes |
| `submitTaxDeclaration(data)`| `PUT` | `/api/v1/me/tax-declaration` | Submits investment declarations for tax computation. | Yes |
| `uploadTaxProof(data)` | `POST` | `/api/v1/me/tax-declaration/proofs` | Uploads investment proof document attachment. | Yes |

---

## 8. Shift Schedule Services (`shiftService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `getMyShiftRoster(month)` | `GET` | `/api/shifts/roster?month={YYYY-MM}` | Personal calendar of assigned shifts and off-days. | Yes |
| `requestShiftSwap(req)` | `POST` | `/api/shifts/swaps` | Requests shift swap with an eligible peer. | Yes |
| `respondShiftSwap(id, act)`| `PUT` | `/api/shifts/swaps/:id/peer-action` | Accepts or rejects incoming shift swap request. | Yes |

---

## 9. Documents & Attachments (`documentService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `getPersonalDocuments()` | `GET` | `/api/v1/me/documents` | Issued letters (Offer, Appointment, Hike, Relieving). | Yes |
| `requestDocument(req)` | `POST` | `/api/v1/me/documents/request` | Requests formal HR document or certificate. | Yes |
| `getCompanyDocuments()` | `GET` | `/api/documents/company` | Employee handbook, policies, statutory guidelines. | Yes |
| `uploadFile(formData)` | `POST` | `/api/v1/files/upload` | Multipart document / proof upload with virus check. | Yes |

---

## 10. HR Operations Services (`hrService`)

| Mobile Method | HTTP | Backend Route | Description | Required Role |
| :--- | :--- | :--- | :--- | :--- |
| `getHrDashboard()` | `GET` | `/api/dashboard/hrm` | Realtime headcount, attendance summary, on leave. | `hr_admin`, `admin` |
| `getEmployees(params)` | `GET` | `/api/v1/employees` | Workforce directory with search and filters. | `hr_admin`, `admin` |
| `getEmployeeDetails(id)` | `GET` | `/api/v1/employees/:id` | Full operational employee file and employment history. | `hr_admin`, `admin` |
| `getOrganizationAttendance(p)`| `GET`| `/api/attendance` | Full daily/monthly attendance exception matrix. | `hr_admin`, `admin` |
| `getPendingLeaveApprovals()` | `GET` | `/api/leave/requests?status=pending` | Organization pending leave requests queue. | `hr_admin`, `admin`, `manager` |
| `decideLeaveRequest(id, dec)`| `PATCH`| `/api/leave/requests/:id/status` | Approves or rejects employee leave request. | `hr_admin`, `admin`, `manager` |
| `getPendingProfileChanges()` | `GET` | `/api/v1/hr/requests/profile-changes`| Queue of employee banking/PAN updates. | `hr_admin`, `admin` |
| `getShiftRosters(params)` | `GET` | `/api/shifts/roster` | Team shift assignment calendar. | `hr_admin`, `admin` |
| `getPayrollRuns()` | `GET` | `/api/payroll/runs` | Processed and drafting monthly payroll batches. | `hr_admin`, `admin` |

---

## 11. Admin Administration Services (`adminService`)

| Mobile Method | HTTP | Backend Route | Description | Required Role |
| :--- | :--- | :--- | :--- | :--- |
| `getAdminDashboard()` | `GET` | `/api/dashboard/tenant` | Plan limits, storage, active users, system health. | `tenant_admin`, `admin` |
| `getSubscription()` | `GET` | `/api/billing/subscription` | Current plan tier, renewal date, licensed seats. | `tenant_admin`, `admin` |
| `getAuditLogs(params)` | `GET` | `/api/v1/activity-logs` | Immutable audit trail of configuration & logins. | `tenant_admin`, `admin` |
| `getSecuritySettings()` | `GET` | `/api/v1/settings/TENANT/security` | 2FA rules, session timeout, IP firewall config. | `tenant_admin`, `admin` |

---

## 12. Push Notifications & Realtime Services (`notificationService`)

| Mobile Method | HTTP | Backend Route | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `registerPushDevice(token)` | `POST` | `/api/notifications/push/subscribe` | Registers device token with platform metadata. | Yes |
| `unregisterPushDevice(id)` | `POST` | `/api/notifications/push/unsubscribe`| Unregisters device token upon user logout. | Yes |
| `getPushStatus()` | `GET` | `/api/notifications/push/status` | Checks active subscription status for device. | Yes |

---

## 13. Proposed Backend Extension: Native Mobile Push Handler

### Motivation
The existing `pushRouter` is optimized for W3C Web Push (VAPID endpoint + p256dh/auth keys). For iOS and Android native apps running Firebase Cloud Messaging (FCM) / APNs, devices obtain a unified FCM registration token.

### Proposed Additive Endpoint (Non-Breaking)
`POST /api/notifications/push/mobile-device`

```typescript
// Request Body
{
  "fcmToken": "c7x...9Z",
  "platform": "android", // or "ios"
  "deviceId": "device-uuid-1234",
  "deviceModel": "Pixel 8 Pro",
  "osVersion": "14.0"
}

// Response
{
  "success": true,
  "message": "Mobile device registered for push notifications.",
  "data": {
    "subscriptionId": "sub_mobile_device-uuid-1234",
    "registeredAt": "2026-11-16T14:50:00.000Z"
  }
}
```

*Implementation Note: In the interim before deploying this endpoint, mobile devices can register via `/api/notifications/push/subscribe` passing `{ endpoint: fcmToken, keys: { p256dh: "fcm", auth: "fcm" }, platform: "android", deviceId }` which is accepted by `PushSubscriptionStore` without modifying the database schema.*
