# 15. Unverified Items, External Integrations, and Access Limitations

This document catalogs third-party cloud services, external merchant integrations, and hardware protocols in WorkDo HRMS that could not be fully exercised in live production execution due to demo sandbox boundaries or missing external merchant accounts. It provides architectural recommendations for implementing these integrations safely in MASTERHRMS.

---

## 1. Unverified External Integrations & Cloud Boundaries

While the internal UI, forms, and client-side data contracts were completely reverse engineered, the external cloud webhooks and production gateways listed below were verified via static bundle inspection and mock sandbox responses rather than live financial or telecom execution:

### 1.1 Payment Gateways & Billing Systems
- **Stripe / PayPal / Mollie / Paystack / Flutterwave**:
  - *Observation*: WorkDo's `/settings` includes configuration inputs for 10+ payment gateways.
  - *Limitation*: In the public demo, checkout calls operate in sandbox mode with test cards or simulated success redirects (`/orders/success`).
  - *Recommendation for MASTERHRMS*: Use MASTERHRMS's existing Stripe and Razorpay integrations; implement webhook signature verification (`stripe.webhooks.constructEvent`) to handle asynchronous payment success and recurring subscription renewals.

### 1.2 Telecommunications & Messaging APIs
- **WhatsApp Cloud API & Twilio SMS**:
  - *Observation*: Notification templates in WorkDo include toggles for WhatsApp and SMS alerts (e.g., "Leave Approved", "Payslip Generated").
  - *Limitation*: Live SMS dispatch could not be verified without active Twilio Account SID and Auth Tokens.
  - *Recommendation for MASTERHRMS*: Route all notifications through an abstracted `NotificationService` in `server/src/services/` that supports multiple provider adapters (SendGrid/Resend for email, Twilio for SMS, Meta Cloud API for WhatsApp).

### 1.3 Video Conferencing & Calendar Sync
- **Zoom Meeting Integration**:
  - *Observation*: When scheduling an interview in Recruitment, a checkbox labeled "Create Zoom Meeting" is present.
  - *Limitation*: Requires an authorized OAuth connection to Zoom Marketplace.
  - *Recommendation for MASTERHRMS*: Provide direct Google Meet / Zoom API integration using OAuth2 refresh tokens stored securely in tenant settings.

### 1.4 Physical Biometric Device Sync
- **ZKTeco / Biometric Fingerprint Clocking**:
  - *Observation*: WorkDo references attendance import via IP-based biometric devices.
  - *Limitation*: The public cloud demo uses software-based attendance punch buttons (`Clock In` / `Clock Out`) and manual modal entry; direct TCP/IP socket connections to on-premise biometric hardware cannot be tested over the public web.
  - *Recommendation for MASTERHRMS*: Provide a dedicated webhook / REST API endpoint (`POST /api/v1/attendance/sync-device`) accepting standard biometric device payloads with token authentication.

---

## 2. Sandbox Boundary & Data Volatility Considerations

1. **Daily Demo Database Resets**:
   - The reference platform `dash-demo.workdo.io` performs periodic automated database resets.
   - All sample records, employee profiles, and uploaded mock documents are ephemeral.
   - All critical evidence (full JS bundles, Inertia JSON props, and screenshots) has been preserved permanently under `docs/workdo-reverse-engineering/evidence/` to prevent data loss.
2. **Demo Account Impersonation Limits**:
   - The demo Super Admin account provides pre-configured single-click login into demo companies. Custom multi-tenant domain SSL routing (e.g. `client.customdomain.com`) relies on standard CNAME DNS delegation which cannot be altered on the vendor's demo domain.

---

## 3. Production Readiness & Security Checklist for MASTERHRMS

Before deploying the implemented parity features to MASTERHRMS production, ensure the following security controls are active:

- [ ] **Webhook Idempotency**: All payment and third-party webhook handlers must record `idempotency_key` or `event_id` in a dedicated `WebhookEvent` table to prevent double-charging or duplicate leave approvals.
- [ ] **Rate Limiting**: Apply express rate limiters (`express-rate-limit`) to sensitive endpoints (`POST /api/v1/auth/*`, `POST /api/v1/attendance/punch`, `POST /api/v1/payroll/generate`).
- [ ] **Tenant Scoping Guard**: Unit and integration tests must verify that passing a foreign `tenantId` in API requests results in immediate 403 Forbidden or 404 Not Found responses.
- [ ] **Audit Logging**: Maintain an immutable `AuditLog` table capturing user impersonation sessions, salary modifications, and mass employee deletions.
