# MASTERHRMS — DATABASE SCHEMA & API CONTRACT CHANGES

## 1. Executive Summary

This document details the database schema models, query patterns, and REST API contract additions and enhancements implemented for the **SaaS Customer Onboarding, Tenant Provisioning, 2FA, and Password Recovery Lifecycle** milestone.

All implementations reuse existing database models where possible (specifically `password_reset_tokens`, `two_factor_otps`, `outbox_events`, `device_sessions`, `tenant_subscriptions`) to avoid destructive database schema migrations or production downtime.

---

## 2. API Contract Changes & Specifications

### 2.1 Authentication & Registration Routes (`server/src/routes/auth.routes.ts`)

#### 1. `POST /api/auth/register`
- **Description**: Registers a new customer and prepares dedicated tenant workspace.
- **Request Body**:
  ```json
  {
    "fullName": "Alice Smith",
    "email": "alice@acme.com",
    "companyName": "Acme Technologies",
    "country": "India",
    "password": "StrongPassword@123",
    "confirmPassword": "StrongPassword@123",
    "termsAccepted": true,
    "turnstileToken": "optional-token"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "requiresVerification": true,
    "email": "alice@acme.com",
    "maskedEmail": "a***e@acme.com",
    "message": "Registration successful. A verification code and activation link have been dispatched to your email.",
    "workspaceSlug": "acme-technologies",
    "companyName": "Acme Technologies"
  }
  ```

#### 2. `POST /api/auth/verify-email`
- **Description**: Validates single-use token or 6-digit OTP code, provisions tenant with trial, and returns authenticated session.
- **Request Body**:
  ```json
  {
    "email": "alice@acme.com",
    "token": "32-byte-hex-token",
    "code": "123456",
    "companyName": "Acme Technologies",
    "slug": "acme-technologies"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "jwt-token-string",
    "user": {
      "id": "uuid",
      "email": "alice@acme.com",
      "roles": ["tenant_admin", "admin", "workspace_admin"]
    },
    "tenant": {
      "id": "uuid",
      "name": "Acme Technologies",
      "slug": "acme-technologies"
    },
    "subscription": {
      "status": "trialing",
      "trialEndsAt": "2026-12-04T12:00:00Z"
    }
  }
  ```

#### 3. `POST /api/auth/forgot-password`
- **Description**: Dispatches password reset link and OTP code with enumeration resistance.
- **Request Body**:
  ```json
  {
    "email": "user@company.com"
  }
  ```
- **Response (200 OK — Identical for existing and non-existing accounts)**:
  ```json
  {
    "success": true,
    "message": "If an account with that email exists, password reset instructions have been dispatched.",
    "maskedEmail": "u***r@company.com"
  }
  ```

#### 4. `POST /api/auth/reset-password`
- **Description**: Validates reset token/code, updates password hash, revokes all active device sessions, and sends notification email.
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "token": "32-byte-hex-token",
    "code": "123456",
    "newPassword": "NewSecurePassword@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password has been successfully updated. All active sessions have been terminated. You can now sign in with your new credentials."
  }
  ```

### 2.2 Two-Factor Authentication Routes (`server/src/routes/auth.routes.ts`)

| Route | Method | Auth Required | Description |
|---|---|---|---|
| `/api/auth/2fa/status` | GET | Bearer JWT | Returns current 2FA status, enabled state, and remaining backup code count |
| `/api/auth/2fa/totp/initiate` | POST | Bearer JWT | Generates secret, QR code Data URL, `otpauth://` URI with `MasterHRMS` issuer branding, and 8 backup codes |
| `/api/auth/2fa/totp/confirm` | POST | Bearer JWT | Validates 6-digit TOTP code, activates 2FA, sends security notification email |
| `/api/auth/2fa/backup-codes/regenerate` | POST | Bearer JWT | Re-generates and hashes 8 fresh single-use backup recovery codes |
| `/api/auth/2fa/disable` | POST | Bearer JWT | Disables 2FA on account, sends security alert email |

---

## 3. Database Schema Mapping & Query Patterns

### 3.1 Verification & Reset Token Storage (`password_reset_tokens`)
The existing PostgreSQL table `password_reset_tokens` is utilized without schema modification by namespacing token hashes:
- **Email Verification Tokens**: Stored with prefix `verify:${sha256(rawToken)}`.
- **Password Reset Tokens**: Stored directly as `${sha256(rawToken)}`.
- **Query Pattern**:
  ```sql
  SELECT id, user_id, expires_at, used_at
  FROM password_reset_tokens
  WHERE token_hash = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()
  LIMIT 1;
  ```

### 3.2 Two-Factor OTP Storage (`two_factor_otps`)
Used for 6-digit verification codes across email verification, login 2FA challenges, and password recovery:
- **Columns**: `id`, `user_id`, `otp_code_hash`, `expires_at`, `attempts`, `used_at`.
- **Security Check**: Enforces `attempts < 5` and single-use `used_at IS NULL`.

### 3.3 Transactional Outbox Storage (`outbox_events`)
All email dispatch events are serialized into the `outbox_events` table:
- **Columns**: `id`, `tenant_id`, `event_id`, `event_type`, `entity_type`, `entity_id`, `status`, `payload`, `retry_count`, `created_at`, `processed_at`.
- **Deduplication**: `event_id` column carries a unique constraint populated with `sha256(to:subject:idempotencyKey)`.

### 3.4 Device Session Table (`device_sessions`)
- **Columns**: `id`, `user_id`, `tenant_id`, `revoked`, `revoked_at`, `expires_at`, `user_agent`, `ip_address`.
- **Session Revocation Query**:
  ```sql
  UPDATE device_sessions SET revoked = true, revoked_at = NOW() WHERE user_id = $1 AND revoked = false;
  ```
