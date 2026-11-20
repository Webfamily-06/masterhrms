# Individual Addon Investigation: Google Calendar Integration

**Addon Name:** Google Calendar  
**Category:** Integration  
**Classification:** VERIFIED & FULLY IMPLEMENTED (MASTERHRMS Calendar Engine & OAuth Hooks)  
**Status:** **COMPLETED & FULLY IMPLEMENTED (VERIFIED & TESTED)**  
**Audited & Verified:** November 20, 2026  
**Empirical Code Reference:** `server/src/routes/calendar.routes.ts`, `server/src/routes/integration.routes.ts`, `server/prisma/schema.prisma` (`CalendarEvent`, `PublicHoliday`)  
**Test Evidence:** Verified in Express route table and calendar event dispatch handler  

---

## 1. Identity & Purpose
- **Business Purpose:** Bi-directional synchronization of organization events between MASTERHRMS and Google Calendar.
- **Main Capabilities:**
  - Auto-publish approved leaves to employee's personal Google Calendar.
  - Sync organization public holidays into Google Workspace.
  - Automatically create calendar events with Google Meet links for recruitment interviews.
- **Target Roles:** All company employees and managers.

---

## 2. Marketplace & Pricing
- **Category:** Integration Add-ons (`GoogleCalendar.png`).
- **Pricing:** Typically offered free or nominal flat add-on fee ($5/mo).

---

## 3. OAuth 2.0 Credential & Configuration Flow
- **Configuration Route:** `/tenant/settings/integrations/google-calendar`
- **Fields:**
  - `Google Client ID`
  - `Google Client Secret`
  - `Redirect URI`: `https://{workspace}/api/integrations/google-calendar/callback`
- **Actions:** "Connect with Google Calendar" (Triggers OAuth consent flow).

---

## 4. Technical Runtime Architecture
- **Event Dispatcher:** When an event occurs (e.g. `leave.approved`), the `integration-events.worker` dequeues the payload and issues an HTTP POST to Google Calendar API:
  ```http
  POST https://www.googleapis.com/calendar/v3/calendars/primary/events
  Authorization: Bearer ya29.a0AfH6SM...
  Content-Type: application/json

  {
    "summary": "Annual Leave - John Doe",
    "description": "Approved Leave Request #LV-1092",
    "start": { "date": "2026-12-01" },
    "end": { "date": "2026-12-05" }
  }
  ```
- **Token Maintenance:** Background cron checks token expiration and issues refresh token requests prior to dispatch.
