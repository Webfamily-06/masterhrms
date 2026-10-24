# MASTERHRMS — GLOBAL NOTIFICATION CENTER, DUPLICATE ALERTS & TEXT OVERFLOW FIX REPORT

**Date:** October 24, 2026  
**System:** MASTERHRMS Multi-Tenant Enterprise HRMS Platform  
**Scope:** Global Notification Center, Real-Time Alerts Drawer, Socket Client, Backend Notification Service & Scheduler  
**Status:** COMPLETE & EMPIRICALLY VERIFIED (100% Pass Rate, 7/7 End-to-End Automated Tests Passing)

---

## 1. Executive Summary

A comprehensive investigation and overhaul of the MASTERHRMS notification subsystem was executed to resolve user experience, layout, and data-integrity defects present in the real-time notification drawer and dedicated notification center views.

### Key Deliverables Completed:
1. **Removed Technical Connection Diagnostics:** Completely eliminated user-facing WebSocket/Pusher connection indicators (`WS Live`, pinging status dots) from the notification drawer while preserving underlying real-time socket connections and meaningful notification status indicators (unread badges, timestamps, dismiss actions).
2. **Fixed Category Leakage & Global Routing:** Unified disparate notification type identifiers into canonical business categories (`calendar`, `punch` / Attendance, `leave`, `payroll`, `chat`, `system`). Added a dedicated **Calendar** filter tab with indigo styling across the drawer and full notification pages (`/hr/notifications`, `/me/notifications`). Calendar event reminders no longer leak into Attendance, Leave, or Payroll tabs.
3. **Diagnosed & Eliminated Duplicate Alerts:** Resolved the tri-fold root cause of duplicate deliveries:
   - Server-side idempotency guard for event reminders keyed by `(tenantId, userId, metadata.eventId, metadata.reminderId)` over a 7-day window.
   - Replaced randomized client ID generation (`notif-${Date.now()}-${Math.random()}`) with stable ID resolution (`id || notificationId || metadata.eventId-reminderId`).
   - Unified reactive client state into a singleton store with an echo-suppression window (3 seconds) to prevent duplicate renders across component remounts and socket reconnects.
4. **Resolved Text Overflow & Container Layout:** Replaced single-line `truncate` styling with responsive multi-line wrapping (`break-words line-clamp-2 min-w-0 flex-1 leading-snug`), accessible native tooltips (`title={n.title}` and `title={n.description}`), aligned tabular timestamps (`shrink-0 whitespace-nowrap mt-0.5 font-mono`), and fluid container widths (`w-[calc(100vw-2rem)] sm:w-96 max-w-sm`). Verified clean rendering on desktop (1440px) and mobile (375px) viewports without horizontal blowout.
5. **Full Test Suite & Screenshot Evidence:** Validated with backend unit tests (`notification.test.ts`) and Playwright automated tests (`scripts/verify_notification_center.cjs`), capturing 7 visual proof screenshots in `docs/Saas/screenshots/notification-center-fixes/`.

---

## 2. Root Cause Analysis

| Issue | Root Cause | Impact |
| :--- | :--- | :--- |
| **Visible `WS Live` Badge** | Hardcoded in `realtime-notification-drawer.tsx` header (`<span>WS Live</span>` with green pinging status dot). | Exposed low-level transport diagnostics in end-user interface instead of clean enterprise HR UX. |
| **Calendar Reminders Leaking into Other Tabs** | Inconsistent schema: backend notifications stored `module: "CALENDAR_REMINDER"` while drawer filtered on `notif.type`. Unrecognized types defaulted to `"system"`. Furthermore, no `"calendar"` filter pill existed in the drawer. | Calendar notifications either cluttered the system tab or were misattributed, confusing HR administrators and employees. |
| **Duplicate Notification Entries** | **(1) Client ID regeneration:** `socket.ts` discarded backend notification IDs and generated `notif-${Date.now()}-${Math.random()}`, causing incoming socket events to never match fetched database items. <br>**(2) Multi-listener registration:** Each drawer/header mount attached separate `notification:new` listeners, pushing duplicates into local component state. <br>**(3) Scheduler dispatches:** Rapid reminder scheduler sweeps dispatched notifications without checking if an alert for that specific reminder had already been created. | Redundant identical cards appeared in the drawer (e.g., duplicate "Upcoming Event" reminders), degrading trust in alerting. |
| **Text Overflow & Truncation** | Rigid `truncate` without `min-w-0` on container flex children caused long event titles to truncate early or blow out drawer borders. Drawer width was fixed, causing clipping on mobile screens (375px). | Users could not read critical reminder details, and layout broke on mobile viewports. |

---

## 3. Architecture & Code Changes

### 3.1. File Modifications Summary

All changes were applied with exact parity across the root frontend (`src/`), Next.js CMS frontend (`CMS/src/`), and the Express backend (`server/`):

| File Path | Description of Changes |
| :--- | :--- |
| [server/src/services/notification.service.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/notification.service.ts) | Added reminder idempotency check in `createNotification` using `(tenantId, userId, metadata.eventId, metadata.reminderId)` over a 7-day window. Enriched realtime socket payload to include canonical `module`, `id`, `title`, `description`, `timestamp`. Added `module` parameter filtering to `getUserNotifications`. |
| [server/src/services/calendar-reminder.scheduler.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/calendar-reminder.scheduler.ts) | Ensured `reminderId: r.id` is explicitly passed in `metadata` on scheduler dispatches to guarantee dispatch idempotency. |
| [server/src/routes/platform-foundation.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/platform-foundation.routes.ts) | Updated `/shared/notifications` endpoint to accept `req.query.module` and pass it to `NotificationService.getUserNotifications`. |
| [server/src/routes/hr-collaboration.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/hr-collaboration.routes.ts) | Updated `/hr/notifications` endpoint to support `module` query parameter. |
| [server/src/routes/me-collaboration.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/me-collaboration.routes.ts) | Updated `/me/notifications` endpoint to support `module` query parameter. |
| [src/lib/socket.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/lib/socket.ts) & [CMS/src/lib/socket.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/lib/socket.ts) | Added `normalizeNotificationType()` to map all raw types to canonical categories. Replaced multiple uncoordinated listeners with a module-level singleton store (`memoryNotifications` + subscriber set). Added stable ID extraction and 3-second echo suppression window. Synchronizes with `/shared/notifications` on mount. |
| [src/components/realtime-notification-drawer.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/realtime-notification-drawer.tsx) & [CMS/src/components/realtime-notification-drawer.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/realtime-notification-drawer.tsx) | Removed `WS Live` text and pinging dot. Added `Calendar` category filter with indigo badge. Replaced single-line `truncate` with `break-words line-clamp-2 min-w-0 flex-1 leading-snug`. Added native tooltips (`title`). Replaced fixed width with `w-[calc(100vw-2rem)] sm:w-96 max-w-sm`. Aligned timestamps with `shrink-0 whitespace-nowrap font-mono`. |
| [src/routes/_authenticated/hr/notifications.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/notifications.tsx) & [CMS/src/app/(workspace)/hr/notifications/page.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/(workspace)/hr/notifications/page.tsx) | Added module category filter buttons (`All`, `Calendar`, `Attendance`, `Leave`, `Payroll`, `System`). Passed `module` to notification fetch query. Rendered `Calendar` icon for calendar notifications. Applied `break-words line-clamp-2` with tooltips. |
| [src/routes/_authenticated/me/notifications.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/me/notifications.tsx) & [CMS/src/app/(workspace)/me/notifications/page.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/app/(workspace)/me/notifications/page.tsx) | Employee self-service notification center updated with matching category filter tabs, calendar support, and responsive text wrapping. |
| [server/src/tests/notification.test.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/tests/notification.test.ts) | Added comprehensive test coverage for reminder idempotency and category module filtering. |
| [scripts/verify_notification_center.cjs](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/scripts/verify_notification_center.cjs) | Playwright automated test script verifying absence of `WS Live`, category separation, duplicate prevention, text overflow wrapping, responsive mobile layout, and mark read actions. |

---

## 4. Canonical Category Normalization Matrix

The following table details how heterogeneous backend modules and notification types are normalized into canonical client categories:

| Canonical Category | Source Module / Type Strings | Color & Icon | Description |
| :--- | :--- | :--- | :--- |
| **`calendar`** | `CALENDAR`, `CALENDAR_REMINDER`, `CALENDAR_INVITE`, `CALENDAR_UPDATE`, `EVENT_REMINDER` | Indigo (`Calendar`) | Event reminders, schedule invites, agenda notifications |
| **`punch`** (Attendance) | `ATTENDANCE`, `PUNCH`, `CLOCK_IN`, `CLOCK_OUT`, `BIOMETRIC`, `SHIFT` | Amber (`Clock`) | Geofence punches, biometric logs, attendance regularizations |
| **`leave`** | `LEAVE`, `LEAVE_REQUEST`, `LEAVE_APPROVAL`, `LEAVE_REJECT`, `PTO` | Emerald (`FileText`) | Leave balance updates, approvals, vacation requests |
| **`payroll`** | `PAYROLL`, `SALARY`, `PAYSLIP`, `EXPENSE`, `BONUS`, `DEDUCTION` | Blue (`DollarSign`) | Payslip releases, bonus approvals, expense reimbursements |
| **`chat`** | `CHAT`, `MESSAGE`, `MENTION`, `CHANNEL` | Violet (`MessageSquare`) | Team messages, direct mentions, workspace announcements |
| **`system`** | `SYSTEM`, `SECURITY`, `ALERT`, or any unknown fallback | Slate (`Bell`) | Security alerts, role changes, platform maintenance notices |

---

## 5. Duplicate Prevention & Idempotency Architecture

### 5.1. Backend Server Idempotency
In `NotificationService.createNotification`:
```typescript
// Idempotency check for calendar event reminders
const eventId = data.metadata?.eventId;
const reminderId = data.metadata?.reminderId;

if (eventId && reminderId) {
  const existing = await prisma.notification.findFirst({
    where: {
      tenantId: data.tenantId,
      userId: data.userId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      AND: [
        { metadata: { path: ['eventId'], equals: eventId } },
        { metadata: { path: ['reminderId'], equals: reminderId } },
      ],
    },
  });

  if (existing) {
    // Return existing record immediately; avoid duplicate DB insert & duplicate socket broadcast
    return existing;
  }
}
```

### 5.2. Client-Side Singleton Store & Deduplication
In `socket.ts`:
1. **Stable ID Resolution:**
   ```typescript
   const stableId = notif.id || notif.notificationId ||
     (notif.metadata?.eventId && notif.metadata?.reminderId
       ? `evt-${notif.metadata.eventId}-rem-${notif.metadata.reminderId}`
       : `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
   ```
2. **Echo Suppression Window:**
   A fingerprint cache `recentFingerprints = new Map<string, number>()` drops identical alerts arriving within a 3-second window (e.g. when multiple browser tabs or socket reconnects echo the same event).
3. **Singleton Subscriber Model:**
   A single WebSocket listener is attached to `notification:new`. Incoming items are deduplicated against `memoryNotifications` by ID and merged, notifying all subscribed drawer instances simultaneously without duplicate rendering.

---

## 6. Text Overflow & Layout Specifications

```
+-------------------------------------------------------------+
| Real-Time Alerts                             (X) Close      |
+-------------------------------------------------------------+
| [All (4)] [Calendar (1)] [Attendance (1)] [Leave (0)] ...   |
+-------------------------------------------------------------+
| [Icon]  Quarterly Strategy Sync & Financial...      15m ago |
|         Final review of Q3 targets with all depa...         |
|         [break-words line-clamp-2 min-w-0 flex-1]           |
+-------------------------------------------------------------+
```

1. **Title & Body Wrapping:**
   - Class: `font-bold text-xs text-foreground break-words line-clamp-2 leading-snug min-w-0 flex-1`
   - Native Tooltip: `title={n.title}` and `title={n.description}` allows users to hover and inspect full text even when clamped.
2. **Timestamps:**
   - Class: `text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5 font-mono`
   - Pinned to the top-right of each notification card so it never wraps or shifts downwards.
3. **Container Fluidity:**
   - Replaced static width (`w-80` or `w-96`) with responsive utility: `w-[calc(100vw-2rem)] sm:w-96 max-w-sm`.
   - On 375px mobile screens, the drawer maintains a 1rem margin on each side without horizontal scroll or border clipping.

---

## 7. Security, Tenant Isolation & Access Control

1. **Private Channel Authorization:**
   - Real-time notification socket events are published exclusively to private user channels (`private-user-${userId}`) and tenant channels (`private-tenant-${tenantId}`).
   - Subscriptions require HMAC SHA-256 signatures authenticated against the current user's session token via `/api/pusher/auth`.
2. **Multi-Tenant Query Scoping:**
   - All database queries in `NotificationService` enforce `where: { tenantId, userId }`.
   - Cross-tenant and cross-user notifications are strictly rejected with HTTP 403 Forbidden.

---

## 8. Verification & Empirical Proof

### 8.1. TypeScript Compilation
- **Server:** `npx tsc --project server/tsconfig.json --noEmit` -> **0 errors (Exit code 0)**
- **CMS Frontend:** `npm run cms:typecheck` -> **0 errors (Exit code 0)**

### 8.2. Backend Unit Tests (`notification.test.ts`)
```
✓ server/src/tests/notification.test.ts (4 tests)
  ✓ Notification Service > should create a notification and query user notifications
  ✓ Notification Service > should filter notifications by module category
  ✓ Notification Service > should enforce idempotency on calendar event reminders
  ✓ Notification Service > should mark all notifications as read

Test Files  1 passed (1)
     Tests  4 passed (4)
  Duration  1.12s
```

### 8.3. Playwright End-to-End Suite (`verify_notification_center.cjs`)
Executed against live running server on `http://master.localhost:3000`:

| Test # | Test Case Description | Result | Details |
| :---: | :--- | :---: | :--- |
| **Test 1** | Verify absence of `WS Live` and technical status dot | **PASS** | `WS Live` string is completely absent from drawer DOM. |
| **Test 2** | Category filter buttons present in drawer header | **PASS** | Verified buttons for `All`, `Calendar`, `Attendance`, `Leave`, `Payroll`, `System`. |
| **Test 3** | Category separation & isolation (Calendar vs others) | **PASS** | Calendar reminder displays under `Calendar` tab; Attendance tab correctly filters out calendar reminder. |
| **Test 4** | Duplicate delivery prevention under rapid socket events | **PASS** | Stable ID deduplication ensured 1 unique card rendered for duplicate socket payloads. |
| **Test 5** | Text overflow, line clamping, and native tooltips | **PASS** | Verified `line-clamp-2`, `break-words`, and native `title` attribute matching full event title. |
| **Test 6** | Responsive mobile layout (375x667 viewport) | **PASS** | Verified drawer width stays within `343px <= 375px` without horizontal scroll. |
| **Test 7** | Mark all as read & clear interactions | **PASS** | Unread indicator badges cleared; notification state updated synchronously. |

**Overall Score:** 7/7 Tests Passed (100%)

---

## 9. Visual Screenshot Artifacts

All verification screenshots were generated during automated testing and are preserved in [docs/Saas/screenshots/notification-center-fixes/](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/):

| Screenshot | Description |
| :--- | :--- |
| [`01_notification_drawer_all_categories.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/01_notification_drawer_all_categories.png) | Real-time alerts drawer displaying clean header (no `WS Live`), category filter badges with counts, and multi-category notifications. |
| [`02_notification_drawer_calendar_filter.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/02_notification_drawer_calendar_filter.png) | Filtered view showing only Calendar event reminders with indigo styling and full text readability. |
| [`03_notification_drawer_attendance_filter.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/03_notification_drawer_attendance_filter.png) | Attendance category tab isolating punch/biometric alerts without calendar reminder leakage. |
| [`04_mobile_notifications_center.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/04_mobile_notifications_center.png) | Dedicated notifications center view on mobile (375px viewport) with responsive category tabs and wrapped cards. |
| [`05_mobile_notification_drawer.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/05_mobile_notification_drawer.png) | Real-time notification drawer open on mobile screen showing proper margins and no horizontal cutoff. |
| [`06_notification_drawer_after_mark_read.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/06_notification_drawer_after_mark_read.png) | Notification drawer state immediately after clicking "Mark all as read" with unread badges cleared. |
| [`07_hr_full_notification_center_tabs.png`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/notification-center-fixes/07_hr_full_notification_center_tabs.png) | Full `/hr/notifications` administrative view showing canonical category filter pills and event notifications. |

---

## 10. Honest Disclosures & Operational Notes

1. **Historical Notifications:** Existing historical notifications stored prior to this update retain their original database rows. The category normalizer in `socket.ts` and the drawer UI dynamically maps them into their appropriate category so legacy notifications are displayed properly without requiring a destructive database migration.
2. **External Email / SMS Transports:** While real-time in-app notifications and Pusher socket broadcasts are fully functional and tested, outbound external email delivery depends on the tenant's configured SMTP server credentials and firewall rules.
3. **Pusher Fallback:** In development and test environments where live Pusher credentials are not provided, the socket client gracefully falls back to local EventEmitter broadcasting, maintaining full real-time responsiveness without errors.

---
*Report prepared by Antigravity Senior Full-Stack Engineering Agent.*
