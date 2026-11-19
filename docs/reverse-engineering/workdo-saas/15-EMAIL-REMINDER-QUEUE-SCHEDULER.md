# 15 — MASTERHRMS Email, Reminder, Queue & Scheduler Architecture
> Status: **IMPLEMENTED** | Evidence from Codebase Audit

---

## 1. Overview

MASTERHRMS incorporates a production-grade asynchronous messaging, email dispatch, notification, and scheduled cron execution engine designed to operate safely within traditional Node.js/Linux servers as well as serverless platforms (Vercel, AWS Lambda).

---

## 2. Dynamic SMTP & Mailer Architecture

**File:** `server/src/lib/email.ts`  
**File:** `server/src/services/factories/mailer.factory.ts`

### 2.1 Multi-Layer SMTP Configuration Hierarchy

When sending any email, `getDynamicEmailConfig(options)` evaluates:
1. **Tenant/Platform Settings Registry (`SettingsService.getGroup("email")`)**:
   - `email.smtp_host`, `email.smtp_port`, `email.smtp_user`, `email.smtp_password` (AES-256 encrypted at rest, decrypted in memory), `email.smtp_encryption` (`ssl` / `tls` / `none`), `email.from_name`, `email.from_email`, `email.ignore_tls`
2. **Database CMS System Page (`system-platform-settings`)**:
   - Fallback database configuration
3. **Environment Variables**:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SMTP_IGNORE_TLS`

### 2.2 Dynamic Brand & White-Label Injection

**File:** `server/src/services/branding/branding-resolver.service.ts`

Every outgoing email automatically injects the tenant's custom white-label branding:
- Tenant Company Name
- Custom Logo URL
- Tenant Primary Accent Color
- Support Email & Helpdesk Links

---

## 3. Email Template Registry

**File:** `server/src/lib/email-templates-registry.ts`

Central single source of truth containing 950+ lines of HTML email templates with dynamic placeholder substitution (`{{variable}}`):

| Template Category | Template IDs | Target Audience |
|-------------------|--------------|-----------------|
| **Subscription Lifecycle** | `subscription-reminder-15d`, `subscription-reminder-10d`, `subscription-reminder-5d`, `subscription-reminder-3d`, `subscription-reminder-2d`, `subscription-reminder-1d`, `subscription-expired`, `subscription-suspended`, `subscription-reactivated` | Workspace Administrators |
| **Billing & Payments** | `payment-confirmation`, `payment-rejection`, `invoice-generated` | Billing Contacts & Customers |
| **Authentication & Security** | `two-factor-otp`, `password-reset`, `device-login-alert` | End Users |
| **HR Operations** | `document-expiry-30d`, `document-expired`, `probation-review-milestone`, `contract-renewal-alert` | HR Managers & Employees |
| **Collaboration** | `calendar-reminder-event`, `todo-assignment-notice`, `announcement-broadcast` | Team Members |

---

## 4. Serverless-Safe Background Task Queue

**File:** `server/src/lib/background-tasks.ts`

### 4.1 Cold-Start & Freezing Challenge
On serverless environments (Vercel, AWS Lambda), runtime instances freeze immediately upon `res.end()`. Any asynchronous promises (such as Pusher websocket triggers or Web Push dispatches) left unawaited get dropped silently.

### 4.2 AsyncLocalStorage Task Store
```typescript
const requestTaskStore = new AsyncLocalStorage<Set<Promise<unknown>>>();
```

- `trackBackgroundTask(promise)`: Registers a running promise against the current request context.
- `runInBackground(fn)`: Schedules work via `setImmediate()` while keeping it bound to the active request tracker.
- `backgroundTaskMiddleware`: Intercepts `res.end()` and delays final HTTP socket termination until all registered tasks settle or reach `FLUSH_DEADLINE_MS` (default 8,000ms).

---

## 5. Central Cron Job & Scheduler Inventory

All scheduled background operations are managed under `server/src/cron/` and `server/src/services/`:

| Cron File | Function Name | Frequency / Trigger | Business Responsibility |
|-----------|---------------|---------------------|-------------------------|
| `saas-billing.cron.ts` | `runExpireTrialsCron` | Daily (Midnight) | Transitions expired trials (`trialEndsAt < now`) from `trialing` to `past_due`. Broadcasts socket event. |
| `saas-billing.cron.ts` | `runRenewalsAndGraceCron` | Daily | Evaluates past-due tenants exceeding grace period (default 7 days) and transitions status to `suspended`. |
| `subscription-reminder.cron.ts` | `runSubscriptionExpiryRemindersCron` | Daily (02:00 UTC) | Checks 15d, 10d, 5d, 3d, 2d, 1d thresholds. Sends idempotent notifications tracked in `SubscriptionNotificationEvent`. |
| `document-expiry.cron.ts` | `runDocumentExpiryCron` | Daily | Scans employee compliance documents, marks expired items, and sends 30d/15d/7d alerts. |
| `probation-contract-expiry.cron.ts` | `runProbationContractExpiryCron` | Daily | Monitors probation milestones and expiring vendor/employment contracts. |
| `biometric-sync.ts` | `runBiometricAutoSync` | Every 5-15 mins | Pulls punch logs from registered ZKTeco/eSSL hardware devices. |
| `biometric-reconcile.cron.ts` | `runBiometricReconciliation` | Daily (23:30) | Reconciles raw biometric punches with attendance shift rules and generates attendance records. |
| `calendar-reminder.scheduler.ts` | `CalendarReminderScheduler.start()` | Every 60 seconds | Evaluates pending calendar reminders and todo task deadlines, dispatching push notifications and emails. |
| `reporting-manager-change.cron.ts` | `reconcileReportingManagerHierarchies` | On-demand / Daily | Validates organizational tree structure to prevent cyclic managerial loops. |

---

## 6. Outbox Pattern & Outbound Webhooks

**File:** `server/src/services/outbox.service.ts`  
**File:** `server/src/modules/outbound-webhooks/outbound-webhooks.service.ts`  
**File:** `server/src/modules/outbound-webhooks/webhook-retry.worker.ts`

- Events generated during transactional database operations are appended to `outbox_events`.
- For tenants subscribed to the `outbound-webhooks` add-on, payloads are signed with HMAC-SHA256 headers (`X-Signature-SHA256`).
- `WebhookRetryWorker` enforces exponential backoff retries with SSRF protection (blocking loopback and cloud metadata IPs `169.254.169.254`).
