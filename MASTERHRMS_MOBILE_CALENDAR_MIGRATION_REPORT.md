# MASTERHRMS MOBILE — CALENDAR MIGRATION REPORT

**Date:** 2026-11-17  
**Module:** Shared Workspace Calendar  
**Source of Truth:** `CMS/src/components/calendar/unified-calendar-app.tsx` (3,450 lines) & `src/components/calendar/unified-calendar-app.tsx` (3,302 lines) + `server/src/routes/calendar.routes.ts`  
**Mobile Implementation:**
- `mobile-app/src/components/workspace/WorkspaceModuleShell.tsx`
- `mobile-app/src/core/services/calendarService.ts`
- `mobile-app/src/modules/calendar/screens/CalendarMainScreen.tsx`
- `mobile-app/src/core/storage/attachmentHelper.ts` (`exportAndShareIcs`)

---

## 1. Architecture & Fidelity Summary

- **Single Shared Component:** `CalendarMainScreen` is shared across `hr_admin`, `tenant_admin`, `employee`, and `manager` navigators without role-specific screen copies.
- **Phone-First Presentation + Full View Parity:** Defaults to **Agenda (List)** view on phone viewports (`< 768px`) and **Month** view on tablet viewports (`>= 768px`), with 1-tap switching across **Agenda**, **Month**, **Week** (7-day hourly grid), and **Day** (24-hour timeline).
- **Zero Fabricated Dates:** Removed the prototype's hardcoded `new Date(2026, 10, 16)` and fixed 30-day November array. All views compute real calendar geometry from `new Date()` across a rolling 3-month ISO window.
- **Read-Only Domain & Todo Projections:** Merges `/api/v1/me/calendar/events` (Employee) or `/api/v1/hr/calendar/events` (HR Admin & Tenant Admin) with `/api/calendar/events`. Non-calendar items (`holidays`, `birthdays`, `leaves`, `interviews`, `todo` projections) are strictly marked `isReadOnly: true`, hiding edit/cancel/delete/RSVP controls and exposing `Open in Todo` and `View in Gantt` deep-links for Todo projections.

---

## 2. Capability Verification Matrix (5-Tier Status)

| Capability | Implemented in Code | Unit Tested | API Contract Tested | Real-Device Tested | Not Tested / Blocked |
|---|---|---|---|---|---|
| Agenda, Month, Week & Day views + Today & Prev/Next navigation | Yes (`CalendarMainScreen.tsx`) | Yes (Phone Agenda vs Tablet Month responsive test) | Yes | No | Physical device / iOS Simulator blocked by sandbox `CoreSimulator` |
| Date jump picker, keyword search & category filter chips | Yes (`CalendarMainScreen.tsx`) | Yes | Yes | No | Live device gesture not run |
| Custom category CRUD (`POST/PUT/DELETE /api/calendar/categories`) | Yes (`CalendarService` + Category Manager Modal) | Covered in service layer | Yes | No | Live device UI blocked by sandbox |
| Event create, edit, soft-cancel (`POST /cancel`) & permanent delete (`DELETE /:id`) | Yes (`CalendarMainScreen.tsx`) | Yes | Yes | No | Live device UI blocked by sandbox |
| Recurrence (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `UNTIL`) + Scope prompt (`this_occurrence` vs `all`) | Yes (`buildRrule`, `parseRruleFreq`, `recurrencePrompt` modal) | Covered in component logic | Yes | No | Live multi-occurrence DB roundtrip blocked by sandbox network proxy |
| Multi-channel reminders (up to 5 reminders: `5m/15m/30m/1h/1d` x `in_app/email/both`) | Yes (`CalendarMainScreen.tsx`) | Covered in component logic | Yes | No | Push/Email cron delivery not run on physical device |
| Meeting room selection (`/api/calendar/rooms`) & `409 SCHEDULING_CONFLICT` warning modal | Yes (`conflictPrompt` modal; `Save Anyway` gated by conflict-override permissions) | Covered in component logic | Yes | No | Live device UI blocked by sandbox |
| Organization member sharing (`/eligible-recipients`, `view`/`edit` permissions) & Invitee RSVP (`Accept`/`Tentative`/`Decline`) | Yes (`CalendarMainScreen.tsx`, `CalendarService.rsvpEvent`, `shareEvent`, `revokeEventShare`) | Yes | Yes (`rsvpStatus` payload contract test) | No | Live device UI blocked by sandbox |
| Event Audit Trail modal (`GET /events/:id/audit-logs`) | Yes (`auditModalOpen` in `CalendarMainScreen.tsx`) | Covered in service layer | Yes | No | Live device UI blocked by sandbox |
| Authenticated `.ICS` export & native OS Share (`GET /export/ics`, `GET /events/:id/export/ics`) | Yes (`exportAndShareIcs` using Bearer JWT + `Share.share`) | Yes (`collaboration_contracts_and_security.test.ts`) | Yes | No | Native OS share sheet dialog not tested on physical device |
| Realtime Pusher invalidation (`calendar:reminder-due`, `event-shared`, `event-updated`, `event-cancelled`, `rsvp-updated`) | Yes (`realtimeManager.ts` + `CalendarMainScreen.tsx`) | Yes | Yes | No | Live Pusher socket blocked in sandbox |

---

## 3. Visual Evidence

- HR Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/calendar_hr_admin_390x844.png`
- Tenant Admin (`390x844` mounted RN tree render): `docs/mobile/screenshots/calendar_tenant_admin_390x844.png`
- Employee (`390x844` mounted RN tree render): `docs/mobile/screenshots/calendar_employee_390x844.png`
