# 13 — Integration & Third-Party Provider Verification (Email & Payment Audit)

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Protocol & Adapter Implementation Verification  
**Date:** November 19, 2026  
**Focus Domains:** Email Transport Drivers (Claimed: 27), Payment Gateways (Claimed: 58), OAuth & Webhooks  

---

## 1. Executive Summary & Forensic Realities

In historical reverse-engineering documentation (`03-SUPER-ADMIN-SETTINGS-DEEP-DIVE.md`, `13-PAYMENT-GATEWAY-CALLBACK-FLOW.md`, `35-FINAL-ENTERPRISE-REVERSE-ENGINEERING-REPORT.md`), sweeping integration claims were made regarding built-in support for **27 email providers** and **58 payment gateways**.

This forensic audit distinguishes between **UI configuration presets in the reference application** and **actual executable software adapters in MASTERHRMS**:
1. **Email Drivers (Claimed 27 vs Implemented 1 Centralized Engine):** The "27 email drivers" in WorkDo are pre-filled SMTP connection presets stored in `settings_inertia.json` (hosts and ports for Gmail, Outlook, Mailgun, SendGrid, etc.). MASTERHRMS implements a centralized, production-grade NodeMailer SMTP transporter pool (`server/src/services/factories/mailer.factory.ts`) capable of connecting to any SMTP server with TLS/SSL, hot-reloading, and tenant-level scoping.
2. **Payment Gateways (Claimed 58 vs Implemented 1 Enterprise Gateway):** The "58 payment gateways" are individual modular add-on packages in the WorkDo marketplace. MASTERHRMS does NOT maintain 58 separate gateway SDKs; it natively implements **Razorpay** with HMAC SHA-256 webhook validation, order creation, and test-payment runners (`server/src/routes/payments.routes.ts`), supplemented by manual payment inwarding (Cash, Bank Transfer, Cheque).

---

## 2. Email Provider Decompilation: Reference Presets vs MASTERHRMS Engine

### 2.1 The 27 Reference Email Presets Extracted from `settings_inertia.json`
Decompilation of `settings_inertia.json -> props.emailProviders` reveals that 22 of the 27 entries use standard `driver: "smtp"` with different default hostnames:

| # | Provider Key | Reference Driver | Default Host | Port | Encryption | MASTERHRMS Support |
|---|---|---|---|---|---|---|
| 1 | `smtp` | `smtp` | `smtp.example.com` | 587 | TLS | Supported via MailerFactory |
| 2 | `gmail` | `smtp` | `smtp.gmail.com` | 587 | TLS | Supported via MailerFactory |
| 3 | `outlook` | `smtp` | `smtp-mail.outlook.com` | 587 | TLS | Supported via MailerFactory |
| 4 | `yahoo` | `smtp` | `smtp.mail.yahoo.com` | 587 | TLS | Supported via MailerFactory |
| 5 | `mailgun` | `mailgun` | `smtp.mailgun.org` | 587 | TLS | Supported via SMTP mode |
| 6 | `ses` | `ses` | `email-smtp.us-east-1.amazonaws.com` | 587 | TLS | Supported via SMTP credentials |
| 7 | `sendgrid` | `smtp` | `smtp.sendgrid.net` | 587 | TLS | Supported via MailerFactory |
| 8 | `postmark` | `smtp` | `smtp.postmarkapp.com` | 587 | TLS | Supported via MailerFactory |
| 9 | `sparkpost` | `smtp` | `smtp.sparkpostmail.com` | 587 | TLS | Supported via MailerFactory |
| 10 | `mandrill` | `smtp` | `smtp.mandrillapp.com` | 587 | TLS | Supported via MailerFactory |
| 11 | `zoho` | `smtp` | `smtp.zoho.com` | 587 | TLS | Supported via MailerFactory |
| 12 | `mailjet` | `smtp` | `in-v3.mailjet.com` | 587 | TLS | Supported via MailerFactory |
| 13 | `elastic_email` | `smtp` | `smtp.elasticemail.com` | 2525 | TLS | Supported via MailerFactory |
| 14 | `smtp2go` | `smtp` | `mail.smtp2go.com` | 587 | TLS | Supported via MailerFactory |
| 15 | `socketlabs` | `smtp` | `smtp.socketlabs.com` | 587 | TLS | Supported via MailerFactory |
| 16 | `pepipost` | `smtp` | `smtp.pepipost.com` | 587 | TLS | Supported via MailerFactory |
| 17 | `sendinblue` | `smtp` | `smtp-relay.sendinblue.com` | 587 | TLS | Supported via MailerFactory |
| 18 | `mailchimp` | `smtp` | `smtp.mandrillapp.com` | 587 | TLS | Supported via MailerFactory |
| 19 | `sendmail` | `sendmail` | Local binary | - | None | Not recommended for cloud |
| 20 | `log` | `log` | In-memory log | - | None | Supported via test transport |
| 21 | `array` | `array` | In-memory array | - | None | Supported via test transport |
| 22 | `failover` | `failover` | Multi-transporter | - | None | Custom retry logic in Mailer |
| 23 | `roundrobin`| `roundrobin`| Load-balanced | - | None | Not implemented |
| 24 | `resend` | `resend` | `smtp.resend.com` | 587 | TLS | Supported via MailerFactory |
| 25 | `postmarkapp`| `postmark` | HTTP API | - | None | Use SMTP mode |
| 26 | `mailersend` | `smtp` | `smtp.mailersend.net` | 587 | TLS | Supported via MailerFactory |
| 27 | `smtp_com` | `smtp` | `smtp.smtp.com` | 587 | TLS | Supported via MailerFactory |

### 2.2 MASTERHRMS Implementation (`server/src/services/factories/mailer.factory.ts`)
Rather than requiring 27 external SDK libraries, MASTERHRMS features an enterprise-grade `MailerFactory`:
- Dynamic resolution from `SettingsService` (with encrypted password storage).
- Transporter pooling and cache invalidation on settings mutation.
- Dual-scoping (`PLATFORM` for SaaS notifications vs `TENANT` for white-label payroll emails).
- Automatic TLS negotiation with `ignoreTls` fallback for legacy cPanel servers.

---

## 3. Payment Gateway Architecture: 58 Marketplace Add-ons vs Native Razorpay

### 3.1 The 58 Reference Add-ons in `addons_inertia.json`
The WorkDo marketplace packages 58 payment gateway add-ons (including Stripe, PayPal, Razorpay, Paystack, Flutterwave, Mollie, Mercado, Paytm, Skrill, AuthorizeNet, BTCPay, Toyyibpay, Xendit, Midtrans, Yoco, YooKassa). Each package in WorkDo represents an independent Laravel module adding gateway checkout forms.

### 3.2 MASTERHRMS Native Implementation: Razorpay (`payments.routes.ts`)
In MASTERHRMS, full payment processing is implemented for **Razorpay**:
- **Configuration & Storage:** `GET /api/payments/razorpay/config` & `POST /api/payments/razorpay/config` (credentials stored encrypted in `SettingsService`).
- **Order Generation:** `POST /api/payments/razorpay/create-order` creates remote Razorpay orders via `api.razorpay.com/v1/orders`.
- **Cryptographic Signature Verification:** `POST /api/payments/razorpay/verify` verifies HMAC SHA-256 signatures:
  ```typescript
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (generatedSignature !== signature) {
    return res.status(400).json({ error: "Invalid payment signature." });
  }
  ```
- **Webhook Processing & Idempotency:** `razorpayWebhookHandler` checks `PaymentWebhookEvent` table using composite key `@@unique([tenantId, provider, deliveryKey])` to guarantee zero duplicate payment postings.
- **Ledger Posting:** Automatically invokes `autoPostSaleToLedger()` to update the double-entry accounting ledger upon verified payment capture.

---

## 4. Other Integrations: Webhooks, Analytics & Calendars

1. **Outbound Webhooks Gateway:** Implemented in `server/src/modules/outbound-webhooks/`. Dispatches signed HMAC webhooks for business events (e.g. employee created, invoice paid) to Zapier, Make, and n8n endpoints.
2. **Google Analytics & OAuth:** Configuration schema exists in `settings_inertia.json` (13 OAuth standards); MASTERHRMS implements local JWT auth, leaving third-party OAuth connectors as roadmap items.
3. **SMS Gateways:** Implemented in `server/src/modules/sms-gateway/` supporting Twilio and generic HTTP SMS APIs.
