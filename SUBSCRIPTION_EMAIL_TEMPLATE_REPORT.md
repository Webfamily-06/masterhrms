# Subscription Email Template Report

**Target Route:** `/super/email-templates`  
**Service:** `server/src/lib/email.ts`  
**Status:** COMPLETED AND VERIFIED  
**Date:** October 3, 2026  

---

## 1. Executive Summary

All 10 required subscription lifecycle email templates have been fully designed, implemented, and integrated into the Super Admin Email Templates system at `/super/email-templates`. Super Admins can customize template subjects, HTML bodies, and dynamic variables, preview emails live in an isolated rendering sandbox, and dispatch test emails to verify SMTP connectivity.

---

## 2. Inventory of Required Templates

| # | Template Key | Display Name | Category | Primary Trigger |
|---|---|---|---|---|
| 1 | `subscription_expiry_15_days` | Subscription Expiry — 15 Days | Expiry Reminder | 15 days before subscription expiration |
| 2 | `subscription_expiry_10_days` | Subscription Expiry — 10 Days | Expiry Reminder | 10 days before subscription expiration |
| 3 | `subscription_expiry_5_days` | Subscription Expiry — 5 Days | Expiry Reminder | 5 days before subscription expiration |
| 4 | `subscription_expiry_3_days` | Subscription Expiry — 3 Days | Expiry Reminder | 3 days before subscription expiration |
| 5 | `subscription_expiry_2_days` | Subscription Expiry — 2 Days | Expiry Reminder | 2 days before subscription expiration |
| 6 | `subscription_expiry_1_day` | Subscription Expiry — 1 Day | Expiry Reminder | 1 day before subscription expiration |
| 7 | `subscription_expired` | Subscription Expired | Lifecycle Alert | On midnight following subscription expiration |
| 8 | `tenant_suspended` | Tenant Account Suspended | Compliance & Admin | Immediate upon Super Admin suspension action |
| 9 | `tenant_reactivated` | Tenant Account Reactivated | Compliance & Admin | Immediate upon Super Admin reactivation action |
| 10 | `subscription_renewed` | Subscription Renewed | Billing & Renewal | Immediate upon valid plan renewal |

---

## 3. Dynamic Variables Specification

Templates strictly support safe dynamic tokens resolved at dispatch time from the authoritative tenant and subscription records:

| Dynamic Variable | Resolution / Context Value |
|---|---|
| `{{company_name}}` | Registered company name from `Tenant.name` |
| `{{tenant_name}}` | Normalized workspace name or company display name |
| `{{tenant_id}}` | Workspace unique identifier or slug |
| `{{plan_name}}` | Current subscription plan name (e.g., Enterprise, Professional, Starter) |
| `{{expiry_date}}` | Formatted expiration date string (e.g., `October 18, 2026`) |
| `{{days_remaining}}` | Calculated integer days remaining before workspace lock |
| `{{suspension_date}}` | Formatted timestamp when suspension occurred |
| `{{suspension_reason}}` | Optional reason provided by Super Admin during suspension |
| `{{support_email}}` | Configured support address (e.g., `support@webfamily.com`) |
| `{{renewal_url}}` | Canonical workspace renewal URL |
| `{{admin_name}}` | Primary tenant administrator full name |

*Note: Any unsupported or missing variables fallback gracefully to readable default strings.*

---

## 4. UI Customization Features (`/super/email-templates`)

1. **Category Navigation & Filtering:** Sidebar selector displaying all 10 subscription templates with real-time status badges (`Active`).
2. **Variable Insertion Pills:** Clickable variable tags that automatically insert syntax into the editor at the cursor position.
3. **Live Sandbox Preview:** Renders an HTML `iframe` updated in real time as the Super Admin modifies content, with live sample data substitution.
4. **Test Email Dispatcher:** Built-in modal dialog allowing Super Admins to send an authentic sample email through the configured SMTP provider to any test email address.
5. **Persistence:** Saves modifications via `PUT /api/super/email-templates/:id` to PostgreSQL.

---

## 5. Email Design & Deliverability Standards

- **Layout:** Responsive 600px centered card format compatible with Outlook, Apple Mail, Gmail, and mobile clients.
- **Styling:** Inlined CSS styles with high-contrast accessibility (WCAG AA compliant).
- **Typography:** Web-safe font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Security:** Strict HTML entity sanitization; no script execution or dynamic javascript evaluated.
- **Branding:** Official WebFamily HRMS header logo, status badges, and contextual call-to-action buttons.

---

## 6. Visual Verification Evidence

Browser testing verified the `/super/email-templates` interface in a live Chromium environment:
- All 10 templates rendered in the selector list.
- Selecting *Tenant Account Suspended* populated the editor with variables and subject.
- The live preview sandboxed iframe accurately simulated the rendered email.
- "Send Test Email" dialog opened cleanly with recipient email validation.
