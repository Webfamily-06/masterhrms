# MASTERHRMS — SETTINGS RUNTIME INTEGRATION MATRIX
## Authoritative Mapping from Configuration Keys to Concrete Runtime Consumers

**Document Version:** 1.0.0  
**Status:** Complete & Verified  
**Scope:** End-to-end trace from PostgreSQL persistence to backend factories and frontend components.

---

### Executive Traceability Summary

A central architectural mandate of MASTERHRMS is: **"A setting must actually affect the application behavior it claims to control."**

This document establishes the concrete traceability matrix mapping every settings group and key to the exact backend services, middleware, factories, and frontend components that consume them at runtime.

---

### 1. Concrete Runtime Integration Matrix

| Settings Group | Key Range | Persistent Model | Runtime Consumer / Factory | Concrete Application Impact |
| :--- | :--- | :--- | :--- | :--- |
| **`branding`** | `branding.app_name`<br/>`branding.primary_color`<br/>`branding.logo_light_id`<br/>`branding.logo_dark_id`<br/>`branding.support_email` | `Setting`<br/>(`scope: PLATFORM, TENANT`) | `BrandingService`<br/>`MediaService`<br/>`SuperShell.tsx`<br/>`AppHeader.tsx` | Dynamically overrides header logo image, page titles, footer support links, and CSS custom properties (`--primary`, `--primary-foreground`). |
| **`locale`** | `locale.default_currency`<br/>`locale.timezone`<br/>`locale.date_format`<br/>`locale.time_format`<br/>`locale.default_language` | `Setting`<br/>(`scope: PLATFORM, TENANT, USER`) | `formatCurrency()`<br/>`date-fns`<br/>`TimesheetService`<br/>`AttendanceRecordsTable` | Governs currency symbol rendering (₹, $, €, £), formatting of payroll amounts, and date/time parsing in attendance punch records. |
| **`user`** | `user.theme_mode`<br/>`user.notifications_*`<br/>`user.quiet_hours_*`<br/>`user.calendar_first_day` | `Setting`<br/>(`scope: USER`) | `ThemeProvider`<br/>`NotificationDeliveryService`<br/>`UnifiedCalendarApp` | Toggles `.dark` class on root HTML element; suppresses audio/push notifications during quiet hours; sets Monday vs Sunday as first calendar column. |
| **`email`** | `email.smtp_host`<br/>`email.smtp_port`<br/>`email.smtp_user`<br/>`email.smtp_password`<br/>`email.smtp_encryption` | `SettingSecret`<br/>(`AES-256-GCM`) | `MailerFactory`<br/>`nodemailer`<br/>`EmailQueueWorker` | Re-instantiates NodeMailer SMTP transport pool dynamically upon write; used for transactional emails, password resets, and approval notices. |
| **`storage`** | `storage.provider`<br/>`storage.s3_bucket`<br/>`storage.s3_endpoint`<br/>`storage.s3_access_key` | `SettingSecret`<br/>(`AES-256-GCM`) | `StorageFactory`<br/>`LocalStorageProvider`<br/>`S3StorageProvider` | Controls whether avatar uploads, leave attachments, and document vault files are persisted to local disk, AWS S3, or Cloudflare R2. |
| **`oauth`** | `oauth.google_client_id`<br/>`oauth.google_client_secret`<br/>`oauth.microsoft_client_id`<br/>`oauth.github_client_id` | `SettingSecret`<br/>(`AES-256-GCM`) | `OAuthFactory`<br/>`passport-google-oauth20`<br/>`AuthRoutes` | Hot-reloads OAuth strategies at runtime; generates dynamic callback URLs and verifies CSRF state tokens during social sign-in. |
| **`messaging`** | `messaging.sms_provider`<br/>`messaging.twilio_sid`<br/>`messaging.pusher_app_id`<br/>`messaging.pusher_key` | `SettingSecret`<br/>(`AES-256-GCM`) | `SmsFactory`<br/>`PusherServer`<br/>`WebSocketGateway` | Dispatches OTP verification SMS; powers real-time in-app notification badges and chat message broadcasting. |
| **`security`** | `security.session_timeout_minutes`<br/>`security.two_factor_enforced`<br/>`security.password_min_length` | `Setting`<br/>(`scope: PLATFORM, TENANT`) | `touchSession()`<br/>`requireAuth`<br/>`passwordValidation` | Rejects passwords below minimum length; terminates inactive sessions past the idle timeout; enforces 2FA enrollment upon login. |
| **`payments`** | `payments.razorpay_key_id`<br/>`payments.razorpay_key_secret`<br/>`payments.stripe_publishable_key` | `SettingSecret`<br/>(`AES-256-GCM`) | `PaymentGatewayFactory`<br/>`Razorpay`<br/>`Stripe` | Powers multi-tenant subscription checkout, automated recurring billing, and invoice webhook verification. |
| **`system`** | `system.maintenance_mode`<br/>`system.announcement_banner_text`<br/>`system.telemetry_enabled` | `Setting`<br/>(`scope: PLATFORM`) | `MaintenanceMiddleware`<br/>`GlobalBanner.tsx` | Intercepts non-admin HTTP requests with `503 Service Unavailable` when maintenance mode is active; renders global emergency banner across all client pages. |
| **`hr`** | `hr.employee_id.pattern`<br/>`hr.employee_id.sequence_start`<br/>`hr.employee_id.separator` | `Setting`<br/>(`scope: TENANT`) | `EmployeeIdGeneratorService`<br/>`EmployeeCreationRoute` | Automatically generates sequential identifiers (e.g. `EMP-0042`) when onboarding new personnel. |

---

### 2. Runtime Dynamic Factory Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Router as Express Settings Router
    participant Service as RuntimeLifecycleService
    participant Secret as SettingSecret (PostgreSQL)
    participant Factory as MailerFactory / StorageFactory
    participant Cache as In-Memory Cache

    Admin->>Router: PUT /api/v1/settings/tenant/email (New SMTP Config)
    Router->>Service: updateSettingsGroup("TENANT", tenantId, "email", payload)
    Service->>Secret: Encrypt AES-256-GCM & persist credentials
    Service->>Cache: Invalidate in-memory cache for group
    Service->>Factory: MailerFactory.reload("TENANT", tenantId)
    Factory->>Factory: Recreate nodemailer.createTransport()
    Factory-->>Service: Transport initialized successfully
    Service-->>Router: { success: true, reloaded: true }
    Router-->>Admin: Response: Settings saved and mailer reloaded
```

---

### 3. Verification of Zero Mocking

Every setting group listed above has been verified to connect directly to live backend services:
- No hardcoded string constants in UI headers or footers.
- No fabricated JSON success toasts without database mutation.
- All secrets are stored in encrypted form in `setting_secrets`.
- All changes are recorded with full actor attribution in `setting_audits`.
