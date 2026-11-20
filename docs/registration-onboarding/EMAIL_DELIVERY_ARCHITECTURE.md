# MASTERHRMS — EMAIL DELIVERY & DURABLE OUTBOX ARCHITECTURE

## 1. Architectural Overview

The **MASTERHRMS** email delivery subsystem decouples core business logic and database transactions from external SMTP network operations. It implements the **Transactional Outbox Pattern**, ensuring high availability, exactly-once attempt semantics, bounded retries with exponential backoff, and tenant-scoped mail routing.

```
┌────────────────────────────────────────────────────────┐
│                   Application Layer                    │
│   (Auth, Provisioning, Password Recovery, 2FA Alert)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               EmailOutboxService.queueEmail            │
│         - Generates SHA-256 Idempotency Key            │
│         - Checks DB for duplicate eventId              │
│         - Persists to `outboxEvent` (status: PENDING)  │
└──────────────────────────┬─────────────────────────────┘
                           │ (Database Commit)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Database (`outbox_events` Table)           │
│   - eventId (Unique)                                   │
│   - tenantId                                           │
│   - entityType = 'EMAIL'                               │
│   - status = 'PENDING' | 'PROCESSED' | 'FAILED'        │
│   - retryCount (0..5)                                  │
│   - payload (JSON: to, subject, html, metadata)        │
└──────────────────────────┬─────────────────────────────┘
                           │ (Asynchronous Sweep)
                           ▼
┌────────────────────────────────────────────────────────┐
│            EmailOutboxService Worker (Cron / Sweep)    │
│   - Polls PENDING events with retryCount < 5           │
│   - Resolves tenant-specific or platform SMTP config   │
│   - Dispatches via MailerFactory.sendMail              │
│   - On Success: status = 'PROCESSED', processedAt=NOW()│
│   - On Failure: increments retryCount, backoff delay   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 The Outbox Entity (`OutboxEvent`)
- **Table**: `outbox_events`
- **Fields**:
  - `id`: Primary key UUID.
  - `tenantId`: Scoped to tenant or platform fallback (`tenant-default-001`).
  - `eventId`: Deterministic deduplication key.
  - `eventType`: `"email.verification"`, `"email.welcome"`, `"email.password_reset"`, `"email.security_alert"`, `"email.trial_activated"`.
  - `entityType`: `"EMAIL"`.
  - `entityId`: Unique target identifier.
  - `status`: `"PENDING"` $\rightarrow$ `"PROCESSED"` or `"FAILED"`.
  - `retryCount`: Integer starting at 0, capped at 5.
  - `payload`: Sanitized JSON payload containing recipient email, subject, HTML markup, and metadata.

### 2.2 Deduplication Engine (`idempotencyKey`)
When enqueuing an email:
```typescript
const eventId = options.idempotencyKey
  ? crypto.createHash("sha256").update(`${options.to}:${options.subject}:${options.idempotencyKey}`).digest("hex").slice(0, 32)
  : crypto.randomUUID();
```
Before inserting, the database queries `outboxEvent.findUnique({ where: { eventId } })`. If an event with the identical eventId exists, the service returns `{ queued: true, eventId, isDuplicate: true }` without inserting a second row.

### 2.3 Resilient Worker & Exponential Backoff
The worker sweeps pending events in batches (default: 25):
1. **Query**: Selects events where `entityType === "EMAIL"`, `status === "PENDING"`, and `retryCount < 5`.
2. **Backoff Calculation**:
   $$\text{Delay} = \min(60 \times 2^{\text{retryCount}}, 3600) \text{ seconds}$$
3. **Dispatch**: Invokes `MailerFactory.sendMail(mailOptions)` with scope (`"TENANT"` or `"PLATFORM"`).
4. **Resolution**:
   - **Success**: Updates `status = "PROCESSED"`, records `processedAt = new Date()`, saves provider `messageId`.
   - **Failure**: Increments `retryCount`. If `retryCount >= 5`, sets `status = "FAILED"` and logs diagnostic message without exposing credentials.

---

## 3. Dynamic Multi-Tenant Mailer Routing (`MailerFactory`)

### 3.1 Scope Resolution
The mailer resolves configuration dynamically based on the initiating tenant context:
- **Tenant Scope**: If a tenant has configured their own custom SMTP server (in Organization Settings), emails are dispatched via the tenant's authenticated SMTP credentials.
- **Platform Fallback Scope**: If no tenant SMTP is configured, system and onboarding emails fall back to the platform's central SMTP credentials configured in Super Admin Settings (`admin@masterhrms.com`).
- **Development Fallback**: In non-production environments without active SMTP servers, credentials gracefully mock to console logs (`[DEV EMAIL VERIFICATION]`, `[DEV WELCOME EMAIL]`) preventing runtime errors.

---

## 4. Test Verification Evidence

- `MAIL-001 & MAIL-002`: Durably queues welcome and verification emails into `outbox_events` table (**PASSED**).
- `MAIL-003`: Verifies retry counter progression on transient failures (**PASSED**).
- `MAIL-004`: Idempotent deduplication blocks repeat dispatches (**PASSED**).
- `MAIL-005`: All 5 HTML email templates render official branding, responsive structure, and official logo `/logo.webp` (**PASSED**).
