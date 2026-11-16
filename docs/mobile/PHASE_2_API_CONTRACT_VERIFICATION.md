# MASTERHRMS MOBILE — PHASE 2 API CONTRACT VERIFICATION
**Mandatory Gate 0: Authoritative Network & Controller Contract Specification**  
**Repository Source:** `server/src/index.ts` & `server/src/routes/auth.routes.ts`  
**Date:** November 16, 2026  
**Auditor Mode:** Source-Verified Read-Only Forensic Analysis  

---

## 1. Route Mounting & Prefix Verification

In `server/src/index.ts` (line 528):
```typescript
app.use(["/api/auth", "/api/v1/auth"], authRateLimiter, authRouter);
```

### Authoritative Finding
- **Dual Prefix Support**: Both `/api/auth` and `/api/v1/auth` are actively mounted to `authRouter` with `authRateLimiter`.
- **Mobile Recommendation**: Use `/api/v1/auth` as the primary standard prefix for consistency with other versioned enterprise APIs (`/api/v1/me`, `/api/v1/employees`), with `/api/auth` supported as an alias.

---

## 2. Exhaustive Endpoint Specifications

### 2.1 Tenant Discovery & Resolution
- **Route Definition**: `authRouter.get("/public/tenant/resolve", ...)` (line 114)
- **Full URL Path**: `GET /api/v1/auth/public/tenant/resolve` (or `/api/auth/public/tenant/resolve`)
- **Authentication**: None (Public)
- **Query Parameters**:
  - `slug` (string, optional): Tenant workspace slug (e.g. `?slug=acme`)
- **Headers Supported**:
  - `x-tenant-slug` (string, optional)
  - `x-tenant-id` (string, optional)
- **Success Response (HTTP 200)**:
  ```json
  {
    "resolved": true,
    "id": "tenant-uuid-1234",
    "name": "Acme Technologies",
    "slug": "acme",
    "logoUrl": "https://.../logo.png",
    "logoDark": "/white-logo.webp",
    "faviconUrl": "/favicon.webp",
    "primaryColor": "#FF6B00",
    "timezone": "Asia/Kolkata",
    "isWhiteLabeled": true,
    "subscription": {
      "planName": "Growth Enterprise",
      "status": "active"
    }
  }
  ```
- **Fallback / Unresolved Response (HTTP 200)**:
  ```json
  {
    "resolved": false,
    "name": "Master ERP & HRMS",
    "slug": "default",
    "logoUrl": "/logo.webp",
    "logoDark": "/white-logo.webp",
    "faviconUrl": "/favicon.webp",
    "primaryColor": "#FF6B00",
    "timezone": "Asia/Kolkata",
    "isWhiteLabeled": false
  }
  ```

---

### 2.2 Full Credential Login
- **Route Definition**: `authRouter.post("/login", requireTurnstile(...), loginHandler)` (line 791)
- **Full URL Path**: `POST /api/v1/auth/login` (or `/api/auth/login`)
- **Authentication**: None
- **Request Headers**: `Content-Type: application/json`
- **Request Body Schema**:
  ```json
  {
    "email": "employee@acme.com",
    "password": "UserSecurePassword123!"
  }
  ```
- **Scenario A — 2FA Required (Production Default)**:
  - **HTTP Status**: `200 OK`
  - **Response Body**:
    ```json
    {
      "requires2FA": true,
      "isSetup": false,
      "mfaToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "email": "employee@acme.com",
      "maskedEmail": "e***@acme.com",
      "twoFactorMethod": "EMAIL_OTP",
      "emailSent": true,
      "message": "A 6-digit verification code has been sent to your registered email."
    }
    ```
- **Scenario B — Direct Login (When 2FA is disabled in environment)**:
  - **HTTP Status**: `200 OK`
  - **Response Body**:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c...",
      "sessionId": "session-uuid-v4",
      "user": {
        "id": "user-uuid",
        "email": "employee@acme.com",
        "profile": { "id": "...", "fullName": "John Doe", "tenantId": "tenant-uuid" },
        "roles": ["employee"]
      },
      "roles": ["employee"],
      "tenantSlug": "acme",
      "workspaceUrl": "http://acme.localhost:3000",
      "message": "Signed in successfully!"
    }
    ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid email or password." }` or `{ "error": "Invalid email format" }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password." }`
  - `403 Forbidden`:
    - `{ "error": "Your login account for this workspace has been deactivated...", "code": "ACCOUNT_DEACTIVATED" }`
    - `{ "error": "Your employment has been terminated...", "code": "EMPLOYMENT_TERMINATED" }`
    - `{ "error": "This account does not belong to this workspace.", "code": "TENANT_MISMATCH" }`
  - `404 Not Found`: `{ "error": "Workspace not found.", "code": "WORKSPACE_NOT_FOUND" }`

---

### 2.3 Two-Factor Authentication Verification
- **Route Definition**: `authRouter.post("/2fa/verify-login", ...)` (line 1048)
- **Full URL Path**: `POST /api/v1/auth/2fa/verify-login` (or `/api/auth/2fa/verify-login`)
- **Authentication**: None (Validated via `mfaToken`)
- **Request Body Schema**:
  ```json
  {
    "mfaToken": "eyJhbGciOiJIUzI1Ni...",
    "code": "123456"
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "email": "employee@acme.com",
      "profile": { "id": "...", "fullName": "John Doe", "tenantId": "tenant-uuid" },
      "roles": ["employee"],
      "twoFactorEnabled": true
    },
    "roles": ["employee"],
    "token": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c...",
    "sessionId": "session-uuid-v4",
    "tenantSlug": "acme",
    "workspaceUrl": "http://acme.localhost:3000",
    "message": "Verification successful. Welcome back!"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid verification code." }` or `{ "error": "MFA session token and 6-digit verification code are required." }`
  - `401 Unauthorized`: `{ "error": "2FA session has expired. Please sign in again." }`
  - `429 Too Many Requests`: `{ "error": "Too many failed attempts. Please try again later." }`

---

### 2.4 Two-Factor Authentication Code Resend
- **Route Definition**: `authRouter.post("/2fa/resend", ...)` (line 1286)
- **Full URL Path**: `POST /api/v1/auth/2fa/resend` (or `/api/auth/2fa/resend`)
- **Request Body Schema**:
  ```json
  {
    "mfaToken": "eyJhbGciOiJIUzI1Ni..."
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "emailSent": true,
    "message": "A fresh 6-digit verification code has been sent to your registered email.",
    "maskedEmail": "e***@acme.com",
    "cooldownSeconds": 30
  }
  ```
- **Cooldown Rejection Response (HTTP 429)**:
  ```json
  {
    "error": "Please wait 26 seconds before requesting a new code.",
    "secondsRemaining": 26
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "MFA session token is required to resend verification code." }`
  - `401 Unauthorized`: `{ "error": "2FA session has expired. Please sign in again." }`

---

### 2.5 Token Refresh & Rotation
- **Route Definition**: `authRouter.post("/refresh", ...)` (line 1853)
- **Full URL Path**: `POST /api/v1/auth/refresh` (or `/api/auth/refresh`)
- **Authentication**: None (Requires valid `refreshToken` + `sessionId`)
- **Request Body Schema**:
  ```json
  {
    "refreshToken": "9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c...",
    "sessionId": "session-uuid-v4"
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni... (New Access Token)",
    "refreshToken": "7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d... (New Refresh Token)",
    "sessionId": "session-uuid-v4"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "error": "Refresh token and sessionId are required." }`
  - `401 Unauthorized (Reuse/Revoked/Expired)`: `{ "error": "Session invalid, expired, or reuse detected. Please sign in again." }`
  - `500 Internal Server Error`: `{ "error": "Session refresh failed." }`

---

### 2.6 User Logout
- **Route Definition**: `authRouter.post("/logout", requireAuth, ...)` (line 1820)
- **Full URL Path**: `POST /api/v1/auth/logout` (or `/api/auth/logout`)
- **Headers Required**: `Authorization: Bearer <token>`
- **Request Body Schema (Optional)**:
  ```json
  {
    "sessionId": "session-uuid-v4",
    "deviceId": "mobile-device-uuid"
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Logged out and authorization cache cleared."
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

### 2.7 Inactivity Session Unlock
- **Route Definition**: `authRouter.post("/unlock", ...)` (line 461)
- **Full URL Path**: `POST /api/v1/auth/unlock` (or `/api/auth/unlock`)
- **Request Body Schema**:
  ```json
  {
    "email": "employee@acme.com",
    "password": "UserSecurePassword123!"
  }
  ```
  *(Note: `email` is optional if a valid expired/locked `Authorization: Bearer <token>` is present in the request header).*
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1Ni... (New Access Token)",
    "user": {
      "id": "user-uuid",
      "email": "employee@acme.com",
      "profile": { "id": "...", "fullName": "John Doe", "tenantId": "tenant-uuid" },
      "roles": ["employee"]
    },
    "roles": ["employee"],
    "message": "Session unlocked successfully!"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Incorrect password. Please try again." }`
  - `401 Unauthorized`: `{ "error": "User account not found." }`

---

### 2.8 Forgot Password
- **Route Definition**: `authRouter.post("/forgot-password", ...)` (line 815)
- **Full URL Path**: `POST /api/v1/auth/forgot-password` (or `/api/auth/forgot-password`)
- **Request Body Schema**:
  ```json
  {
    "email": "employee@acme.com"
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Password reset link sent to your registered email.",
    "maskedEmail": "e***@acme.com"
  }
  ```

---

### 2.9 Reset Password
- **Route Definition**: `authRouter.post("/reset-password", ...)` (line 909)
- **Full URL Path**: `POST /api/v1/auth/reset-password` (or `/api/auth/reset-password`)
- **Request Body Schema**:
  ```json
  {
    "email": "employee@acme.com",
    "code": "123456",
    "newPassword": "NewStrongPassword456!"
  }
  ```
  *(Accepts either 6-digit OTP `code` or reset URL `token`).*
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "Password has been successfully updated. You can now sign in with your new credentials."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid or expired reset code." }` or `{ "error": "Either verification code or reset token is required" }`

---

### 2.10 Current User Profile & Hydration (`/me`)
- **Route Definition**: `authRouter.get("/me", requireAuth, ...)` (line 1460)
- **Full URL Path**: `GET /api/v1/auth/me` (or `/api/auth/me`)
- **Headers Required**: `Authorization: Bearer <token>`
- **Success Response (HTTP 200)**:
  ```json
  {
    "id": "user-uuid",
    "email": "employee@acme.com",
    "profile": {
      "id": "profile-uuid",
      "fullName": "John Doe",
      "avatarUrl": null,
      "phone": "+919876543210",
      "tenantId": "tenant-uuid-1234"
    },
    "roles": ["employee"],
    "workspaceRole": {
      "id": "role-uuid-1",
      "name": "Employee",
      "description": "Standard workspace staff",
      "isActive": true,
      "isSystem": true
    },
    "permissions": [
      "attendance.view",
      "attendance.punch",
      "leave.view",
      "leave.apply",
      "payroll.view_own"
    ],
    "enabledModules": ["hrm", "project", "support", "analytics"],
    "activeAddons": [],
    "allowedDashboards": ["hrm"],
    "twoFactorEnabled": true
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing or revoked session token.
  - `404 Not Found`: `{ "error": "User not found" }`
  - `500 Server Error`: `{ "error": "Workspace temporarily unavailable...", "code": "WORKSPACE_INIT_ERROR" }`

---

## 3. Gate 0 Acceptance & Sign-off

- All 10 endpoint paths, request payloads, response bodies, and HTTP status codes are verified directly against Express route definitions.
- The mobile implementation will target `/api/v1/auth` as the primary prefix.
- Gate 0 is **PASSED**. Proceeding with Phase 2 implementation.
