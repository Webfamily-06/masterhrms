# Subscription Reminder Scheduler Report

**Module:** Centralized Platform Cron Scheduler  
**Status:** COMPLETED AND VERIFIED  
**Date:** October 3, 2026  

---

## 1. Overview & Architecture

The automated subscription expiry reminder system executes on the centralized platform scheduler without any tenant-owned or client-side cron dependencies. It proactively alerts tenant administrators at strict intervals prior to their subscription expiration date.

### Schedule & Timezone Policy
- **Default Cron Expression:** `0 8 * * *` (Daily at 08:00 UTC)
- **Timezone:** Authoritative UTC (`Etc/UTC`). Expiration dates are stored with timezone offsets in Supabase PostgreSQL (`TIMESTAMP WITH TIME ZONE`).
- **Target Calculation:** Days remaining are evaluated by computing `Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))`.
- **Scheduled Intervals Supported:**
  - 15 days before expiry (`EXPIRY_15_DAYS`)
  - 10 days before expiry (`EXPIRY_10_DAYS`)
  - 5 days before expiry (`EXPIRY_5_DAYS`)
  - 3 days before expiry (`EXPIRY_3_DAYS`)
  - 2 days before expiry (`EXPIRY_2_DAYS`)
  - 1 day before expiry (`EXPIRY_1_DAY`)

---

## 2. Idempotency & Renewal Cycle Advancement

To prevent duplicate emails on job re-runs, retries, or multiple server instances, the system implements atomic idempotency via the `SubscriptionNotificationEvent` table in Prisma.

### Database Constraint
```prisma
model SubscriptionNotificationEvent {
  id             String    @id @default(uuid())
  tenantId       String    @map("tenant_id")
  subscriptionId String    @map("subscription_id")
  cycleKey       String    @map("cycle_key")
  eventType      String    @map("event_type")
  recipientEmail String    @map("recipient_email")
  scheduledDate  DateTime? @map("scheduled_date")
  deliveryStatus String    @default("PENDING") @map("delivery_status")
  attemptCount   Int       @default(0) @map("attempt_count")
  lastAttemptAt  DateTime? @map("last_attempt_at")
  sentAt         DateTime? @map("sent_at")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@unique([subscriptionId, cycleKey, eventType])
  @@index([tenantId, eventType])
  @@map("subscription_notification_events")
}
```

### Multi-Cycle Reset Mechanism
1. The `cycleKey` is derived directly from the subscription's expiration date: `expiresAt.toISOString().slice(0, 10)` (e.g., `2026-10-18`).
2. When the scheduler processes a tenant, it first checks if a record exists for `(subscriptionId, cycleKey, eventType)` with `deliveryStatus: 'SENT'`.
3. If the email has already been delivered for that cycle and interval, it is safely skipped.
4. When a tenant renews their subscription (e.g., advancing `expiresAt` from `2026-10-18` to `2027-10-18`), the next reminder run computes `cycleKey = '2027-10-18'`. The new cycle has zero matching records, immediately unlocking all 6 reminder thresholds for the new billing cycle without deleting audit logs.

---

## 3. Recipient Resolution

Reminders are sent strictly to designated administrative contacts:
1. Primary tenant administrator account (`User` record with role `TENANT_ADMIN` or `ADMIN`).
2. Configured billing contact email stored in tenant settings.
3. Fallback to the registered tenant contact email.
4. Regular employees do **not** receive automated expiry reminder emails.

---

## 4. Manual Execution & Super Admin Integration

Super Admins can trigger the reminder job on demand or inspect execution status:
- **API Endpoint:** `POST /api/cronjobs/run-subscription-reminders`
- **Permissions:** Restricted to Super Admin (`role === 'SUPER_ADMIN'`)
- **System Dispatcher:** Integrated into `server/src/routes/hrm-extensions.routes.ts` via the `hrm_cron_jobs` registry with `schedule: '0 8 * * *'`.

---

## 5. Verification & Test Evidence

The reminder scheduler was verified against real Supabase database records using [server/src/tests/subscription-lifecycle-real.test.ts](file:///Users/apple/Documents/hrms/server/src/tests/subscription-lifecycle-real.test.ts):

```
PASS server/src/tests/subscription-lifecycle-real.test.ts
  ✓ 1. Scheduler triggers 5-day reminder and records notification event in Supabase
  ✓ 2. Scheduler idempotency prevents duplicate reminder for same cycle
  ✓ 3. Renewal to new expiresAt starts a fresh reminder cycle
```

**Key Verified Metrics:**
- Correct calculation for `daysRemaining = 5`.
- Attempt record created in `SubscriptionNotificationEvent` with status `SENT`.
- Second run detected existing event and sent `0` duplicates (`skipped: 1`).
- Date extension to `now + 15 days` resulted in successful transition to the new reminder cycle.
