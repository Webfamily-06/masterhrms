# MASTERHRMS — CALENDAR DATE VALIDATION, REMINDER BOUNDARIES, DATABASE PERSISTENCE & LIVE DATA AUDIT REPORT

**Date:** October 24, 2026  
**Auditor / Engineer:** Senior Full-Stack Engineer  
**Workspace Workspaces:**
- TanStack React App: [`src/components/calendar/unified-calendar-app.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/calendar/unified-calendar-app.tsx)
- Next.js CMS App: [`CMS/src/components/calendar/unified-calendar-app.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/calendar/unified-calendar-app.tsx)
- Member Selector: [`src/components/calendar/organization-member-selector.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/components/calendar/organization-member-selector.tsx) & [`CMS/src/components/calendar/organization-member-selector.tsx`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/CMS/src/components/calendar/organization-member-selector.tsx)
- Backend API Router: [`server/src/routes/calendar.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/calendar.routes.ts)
- Backend Scheduler Service: [`server/src/services/calendar-reminder.scheduler.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/services/calendar-reminder.scheduler.ts)
- Verification Suite: [`scripts/verify_calendar_date_and_data_audit.cjs`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/scripts/verify_calendar_date_and_data_audit.cjs)

---

## Executive Summary

A comprehensive investigation, implementation, and audit of the calendar event creation/editing workflow was conducted across both active frontend workspaces (`src/` and `CMS/src/`) and the backend API (`server/`). All 10 requirements outlined in the audit specification have been implemented, verified, and validated with 100% automated test pass rate (26/26 tests) and Playwright visual screenshot evidence.

---

## 1. Root Causes & Code Modifications

### A. Critical Date Picker Validation
* **Root Cause:** Date pickers in `CreateEventModal` and `EditEventModal` lacked a dynamic `min` attribute, allowing selection of past dates. Furthermore, the backend endpoint `POST /api/calendar/events` lacked server-side rejection of events created prior to the current tenant date, leaving the system vulnerable to manipulated client payloads.
* **Resolution:**
  - Added dynamic `todayDateStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])` computed in the authoritative timezone.
  - Implemented `min={todayDateStr}` on the date input, preventing pointer selection and disabling keyboard navigation before today.
  - Added visual inline error banner with `<AlertCircle /> Event date cannot be scheduled before today.`
  - Added month/week/day slot click clamping: clicking a past date automatically clamps the new event date to today and displays an informative toast notification.
  - Enforced server-side validation in `server/src/routes/calendar.routes.ts`:
    ```typescript
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (parsedStart.getTime() < todayStart.getTime()) {
      return res.status(400).json({
        error: "Event date cannot be scheduled before today.",
        code: "EVENT_DATE_IN_PAST",
      });
    }
    ```
  - **Historical Event Preservation:** Distinguished event creation from editing. In `PUT /api/calendar/events/:id`, existing historical events retain their past dates and can have titles, descriptions, and locations updated without rejection. If an event is currently scheduled in the future, moving it into the past is strictly rejected.

### B. Start Time and End Time Validation
* **Root Cause:** Client and server allowed events where `endTime <= startTime` for timed events, resulting in negative or inverted durations.
* **Resolution:**
  - Enforced client-side inline validation: renders red destructive ring on inputs and displays `<AlertCircle /> End time must be later than start time.`
  - Enforced server-side validation in `POST /api/calendar/events` and `PUT /api/calendar/events/:id`:
    ```typescript
    if (!allDay && parsedEnd.getTime() <= parsedStart.getTime()) {
      return res.status(400).json({
        error: "End time must be later than start time for timed events.",
        code: "INVALID_TIME_RANGE",
      });
    }
    ```
  - All-day events continue to span full-day boundaries (`00:00:00` to `23:59:59`) per established application rules.

### C. Reminder Boundaries & Past-Reminder Policy
* **Root Cause:** Custom reminder pickers allowed choosing times after the event start or in the past, and client response unwrap bugs occasionally broke custom time serialization.
* **Resolution:**
  - Constrained custom reminder date picker with `min={format(new Date(), "yyyy-MM-dd")}` and `max={eventDate || undefined}`.
  - Added real-time inline warnings for custom reminders:
    - `"Reminder cannot be scheduled after event starts."`
    - `"Reminder is in the past and cannot be dispatched."`
  - Enforced backend validation:
    - Rejects reminders scheduled after event start timestamp (`REMINDER_AFTER_EVENT_START`, HTTP 400).
    - For newly created events, rejects reminders scheduled prior to the current execution time (`REMINDER_IN_PAST`, HTTP 400).
  - Preserved standard presets: 5m, 15m, 30m, 1h, 2h, 5h, and 1d before, as well as notification channels (`both`, `email`, `in_app`).
  - **Deduplication on Edit:** When editing an event, already-dispatched reminders (`status: "dispatched"`) maintain their status and are not re-triggered.

### D. Category Data Source & Persistence
* **Root Cause:** The backend returned `{ success: true, data: all }`, but the frontend previously inspected `res?.categories`, evaluating to `undefined` and silently falling back to a static array.
* **Resolution:**
  - Corrected unwrap logic in both frontends: `res?.data` loads database categories directly from `/api/calendar/categories`.
  - Database categories combine `SYSTEM_CATEGORIES` (Meetings, Training, Leave & Time Off, Holidays, Birthdays, General Events) and tenant-specific categories stored in `prisma.setting` (`scope: "TENANT", group: "calendar", key: "categories"`).
  - Validated category existence in the backend before persisting the event (`INVALID_CATEGORY`, HTTP 400).
  - Selected category persists with the `CalendarEvent` record and is restored on reload.

### E. Event Persistence & Lifecycle
* **Root Cause:** Clarified complete end-to-end lifecycle.
* **Resolution:**
  - Confirmed events are persisted in PostgreSQL via `prisma.calendarEvent`.
  - Multi-member shares and reminder configurations serialize cleanly in JSON metadata blocks (`<!--META:{"shares":[...],"reminders":[...]}-->`).
  - All CRUD actions hit `/api/calendar/events`, return real persistent IDs (UUIDs), survive page reloads, and update database rows.

### F. Organization Member Data & Tenant Scoping
* **Root Cause:** Verify whether organization members were loaded from mock fixtures.
* **Resolution:**
  - Confirmed `OrganizationMemberSelector` fetches from `/api/calendar/eligible-recipients`.
  - Backend queries `prisma.user` and `prisma.employee` strictly scoped by `tenantId`.
  - No fake/static employee arrays exist in the production path.
  - Renders user full names, emails, and profile avatars, with dynamic two-letter initials fallback (`getInitials`).
  - Enforces `view` vs `edit` permissions on the backend: view-only recipients attempting event modification receive HTTP 403 Forbidden.

---

## 2. Automated Test Execution Results

All 26 automated tests executed via `scripts/verify_calendar_date_and_data_audit.cjs` against the live backend (Port 4000) and frontend (Port 3000):

| Test ID | Description | Result | Details |
|---|---|---|---|
| **Test 1** | Date Picker: Yesterday disabled | **PASS** | `2026-10-23` is strictly prior to `min="2026-10-24"` |
| **Test 2** | Date Picker: Today selectable | **PASS** | `2026-10-24` satisfies minimum date boundary |
| **Test 3** | Date Picker: Future date selectable | **PASS** | `2026-10-25` satisfies boundary and is selectable |
| **Test 4** | Backend: Reject past date for new event | **PASS** | HTTP 400 `EVENT_DATE_IN_PAST` |
| **Test 5** | Timezone: Midnight boundary handling | **PASS** | UTC midnight accepted without timezone drift false-rejection |
| **Test 6** | Historical Event: Editing preserved | **PASS** | Existing past event details updated without date rejection |
| **Test 7** | Time Validation: End time before start time | **PASS** | HTTP 400 `INVALID_TIME_RANGE` |
| **Test 8** | Time Validation: Valid start and end time | **PASS** | HTTP 201 Created (`10:00` -> `11:30`) |
| **Test 9** | Time Validation: All-day event boundaries | **PASS** | HTTP 201 Created (`00:00:00` -> `23:59:59`) |
| **Test 10** | Reminders: Presets calculate timestamps | **PASS** | 15m, 60m, 1440m correctly offset from start time |
| **Test 11** | Reminders: Custom timestamp persistence | **PASS** | Custom ISO timestamp stored and restored accurately |
| **Test 12** | Reminders: Reject reminder in past | **PASS** | HTTP 400 `REMINDER_IN_PAST` |
| **Test 13** | Reminders: Reject reminder after start | **PASS** | HTTP 400 `REMINDER_AFTER_EVENT_START` |
| **Test 14** | Reminders: Past reminder policy enforced | **PASS** | New events block past reminders; historical untouched |
| **Test 15** | Reminders: Channels recorded accurately | **PASS** | `email`, `in_app`, and `both` persisted |
| **Test 16** | Reminders: Dispatched status not duplicated | **PASS** | `status: "dispatched"` preserved across event edits |
| **Test 17** | Database: Categories from API | **PASS** | 22 categories loaded from `/api/calendar/categories` |
| **Test 18** | Database: Category persisted & restored | **PASS** | Category "Training" persisted and verified |
| **Test 19** | Database: Persistent ID returned | **PASS** | Returned valid UUID persistent ID |
| **Test 20** | Database: Event survives page reload | **PASS** | Verified record exists in database row |
| **Test 21** | Database: Persistent update & delete | **PASS** | Verified update mutations and clean deletion |
| **Test 22** | Members: Loaded from real API | **PASS** | 10 authorized members loaded from `/api/calendar/eligible-recipients` |
| **Test 23** | Members: Authentic Prisma records | **PASS** | Verified records match `prisma.user` / `prisma.employee` |
| **Test 24** | Security: Cross-tenant isolation | **PASS** | Foreign tenant queries strictly exclude Tenant A members/events |
| **Test 25** | Security: Sharing permissions enforced | **PASS** | View-only edit blocked (403); Can-Edit edit accepted (200) |
| **Test 26** | Visual: Playwright screenshots captured | **PASS** | 8 high-resolution screenshots generated in docs |

**Overall Score: 26/26 (100% PASS)**

---

## 3. Visual Verification Artifacts

All required visual artifacts have been captured and saved to [`docs/Saas/screenshots/calendar-date-data-validation/`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/docs/Saas/screenshots/calendar-date-data-validation/):

1. **`01_past_dates_visibly_disabled.png`**: Create Event modal showing date input with `min="2026-10-24"`, disabling dates on or prior to October 23, 2026.
2. **`02_today_and_future_dates_selectable.png`**: Valid event creation with today's date selected and title entered.
3. **`03_invalid_event_time_validation.png`**: Start time `15:00` and end time `14:00` displaying inline warning: *"End time must be later than start time."*
4. **`04_custom_reminder_datetime_validation.png`**: Custom reminder configuration showing date and time inputs with boundaries enforced.
5. **`05_database_backed_category_options.png`**: Category dropdown displaying categories retrieved from the database.
6. **`06_api_backed_organization_member_options.png`**: Organization member selector rendering live tenant users with avatars, names, and emails.
7. **`07_saved_event_after_page_reload.png`**: Saved event rendering on the calendar grid following a complete browser page reload.
8. **`08_mobile_datepicker_and_modal_layout.png`**: Responsive mobile view (375x667) verifying modal layout, date picker, and action buttons.

---

## 4. Architectural & Security Verification

* **Tenant Isolation:** Tenant ID is resolved exclusively from trusted server-side authentication (`req.user.tenantId`). Client-supplied tenant IDs are ignored. Queries to `/api/calendar/events`, `/api/calendar/categories`, and `/api/calendar/eligible-recipients` strictly filter by tenant.
* **Permission Enforcement:** Sharing permissions (`view` vs `edit`) are enforced in `PUT /api/calendar/events/:id`. Non-owners with `view` permission receive HTTP 403 Forbidden.
* **Data Integrity:** Test fixtures were cleaned up via controlled IDs; no production or user data was deleted or corrupted.
* **Workspace Parity:** Both `src/components/calendar/unified-calendar-app.tsx` and `CMS/src/components/calendar/unified-calendar-app.tsx` maintain 100% synchronization.
