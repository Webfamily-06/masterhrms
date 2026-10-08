# MASTERHRMS — PHASE P8
## COLLABORATION & FINAL POLISH: DISCOVERY & ARCHITECTURE AUDIT

**PHASE:** P8 Collaboration & Final Polish  
**DATE:** 2026-10-07  
**AUDIT TARGETS:** Calendar, Todo/Action Items, Notifications, Realtime Collaboration, Shell & Navigation, Theming & Branding, Role & Profile Consistency.  
**STATUS:** COMPLETE

---

## 1. Existing Collaboration Infrastructure

- **Socket.IO Realtime Engine:** `server/src/socket.ts` provides centralized WebSocket server with authentication middleware, room joining (`user:{userId}`, `tenant:{tenantId}`, `record:{type}:{id}`), and broadcast helpers.
- **Transactional Outbox:** `server/src/services/outbox.service.ts` and `OutboxEvent` table reliably dispatch post-commit events.
- **Catch-Up Mechanism:** `GET /api/v1/shared/events` supports offline catchup using cursor-based timestamps.
- **Chat Infrastructure:** `server/src/routes/chat.routes.ts` and `ChatMessage` model exist with tenant scoping and basic thread messaging.

---

## 2. Existing Calendar Functionality

- **Legacy Flat Route:** `src/routes/_authenticated/_app/calendar.tsx` provides a 685-line flat UI bound to `GET /api/calendar/events`. It only reads ad-hoc `CalendarEvent` records and does NOT aggregate meetings, training cohorts, approved employee leaves, or company holidays.
- **HR & Employee Gaps:**
  - `/hr/calendar`: Route missing in `src/routes/_authenticated/hr/`.
  - `/me/calendar`: Route missing in `src/routes/_authenticated/me/`.
- **Authoritative Domain Sources to Project:**
  - `Meeting` (from Phase P7 Meetings domain)
  - `TrainingSession` (from Phase P7 Training domain)
  - `LeaveApplication` with status `APPROVED` (from Phase P3 Leave domain)
  - `Holiday` (from Phase P2 Organization domain)
  - `CalendarEvent` (ad-hoc company & personal schedules)
- **Architecture Mandate:** The global calendar must be a **read-model projection**, NOT an independent source of truth. It must not duplicate records.

---

## 3. Existing Action-Item / Task Functionality

- **Legacy Flat Route:** `src/routes/_authenticated/_app/todo.tsx` queries `WorkspaceTodo` table only.
- **P7 Action Items:** `MeetingActionItem` table created in P7 with assignees, due dates, and statuses (`open`, `in_progress`, `completed`, `cancelled`).
- **Workflow Approvals:** `ApprovalRequest` table created in P1 with pending steps for leaves, resignations, and transfers.
- **Asset Digital Handovers:** `AssetAssignment` with `acknowledgedAt == null` requiring employee sign-off.
- **Policy Sign-Off Campaigns:** `DocumentAcknowledgement` requiring employee compliance sign-off.
- **HR & Employee Gaps:**
  - `/hr/todo`: Route missing in `src/routes/_authenticated/hr/`.
  - `/me/todo`: Route missing in `src/routes/_authenticated/me/`.
- **Architecture Mandate:** A unified task projection must aggregate actionable items from all owning domains without creating duplicate records. Action mutations must delegate to the authoritative domain services.

---

## 4. Existing Notification Infrastructure

- **Service:** `server/src/services/notification.service.ts` provides `createNotification()`, `getUserNotifications()`, `markAsRead()`, `markAllAsRead()`.
- **API:** Mounted in `platform-foundation.routes.ts` at `/api/v1/shared/notifications`.
- **Database Model:** `Notification` model with `tenantId`, `userId`, `title`, `body`, `module`, `channel`, `linkTo`, `readAt`. Registered in `DIRECT_TENANT_MODELS`.
- **Client Header Component:** `src/components/realtime-notification-drawer.tsx` is integrated in `HrPortalLayout` and `EmployeePortalLayout`, listening to Socket.IO events.
- **Gaps:** Dedicated `/hr/notifications` and `/me/notifications` full-page views provide enhanced filterable history and bulk actions beyond the popover drawer.

---

## 5. Existing Shell, Navigation & UI Consistency

- **Sidebars:**
  - `HrSidebar` and `EmployeeSidebar` in `src/components/navigation/portal-sidebar.tsx`.
  - Driven centrally by `src/lib/navigation-registry.ts`.
- **Portal Switcher:** `src/components/portal-switcher.tsx` dynamically evaluates user roles and available portals (`hr`, `me`, `sa`, `client`).
- **Tenant Branding:**
  - `src/lib/useTenantBranding.ts` resolves tenant workspace branding (name, logoUrl, primaryColor, etc.).
  - `PortalSidebar` had hardcoded "M" and "MASTERHRMS" in its header instead of consuming `branding.name`, `branding.logoUrl`, and dynamic tenant identity.
- **Theme Variables:** CSS variables `--primary`, `--card`, `--background` support dynamic color injection without breaking accessibility.

---

## 6. What Can Be Reused

1. `server/src/services/notification.service.ts` (100% reusable, tenant-isolated).
2. `server/src/services/meeting.service.ts` (action item and meeting queries).
3. `server/src/services/workflow.service.ts` (approval requests).
4. `server/src/services/asset.service.ts` & `document.service.ts` (handover and acknowledgement queries).
5. `src/components/realtime-notification-drawer.tsx` (header popover).
6. UIAble design system components: `PageHeader`, `StatCard`, `FilterToolbar`, `DataTable`, `EmptyState`, `ConfirmationDialog`, `Badge`, `Button`, `Dialog`.

---

## 7. What Requires Extension

1. **Calendar Projection Engine (`calendar.service.ts`):** Must query and assemble composite events across `Meeting`, `TrainingSession`, `LeaveApplication`, `Holiday`, and `CalendarEvent` with role-aware scoping and employee privacy filtering.
2. **Todo Unified Projection Engine (`todo.service.ts`):** Must query and assemble actionable tasks across `MeetingActionItem`, `ApprovalRequest`, `AssetAssignment`, `DocumentAcknowledgement`, and `WorkspaceTodo`, with state mutation delegation.
3. **API Routes:**
   - Mount `/api/v1/hr/calendar` & `/api/v1/me/calendar`
   - Mount `/api/v1/hr/todo` & `/api/v1/me/todo`
   - Mount `/api/v1/hr/notifications` & `/api/v1/me/notifications` (aliasing shared notifications with portal context)
4. **Shell Branding Integration:** Update `portal-sidebar.tsx` to display dynamic tenant name, logo, and active portal subtitle using `useTenantBranding()`.
5. **Navigation Registry:** Register `/hr/calendar`, `/hr/todo`, `/hr/notifications` and `/me/calendar`, `/me/todo`, `/me/notifications`.

---

## 8. What Genuinely Requires New Implementation

1. Canonical HR & Employee Calendar screens:
   - `src/routes/_authenticated/hr/calendar.tsx`
   - `src/routes/_authenticated/me/calendar.tsx`
2. Canonical HR & Employee Todo screens:
   - `src/routes/_authenticated/hr/todo.tsx`
   - `src/routes/_authenticated/me/todo.tsx`
3. Canonical HR & Employee Notification Center screens:
   - `src/routes/_authenticated/hr/notifications.tsx`
   - `src/routes/_authenticated/me/notifications.tsx`
4. Backend services:
   - `server/src/services/calendar.service.ts`
   - `server/src/services/todo.service.ts`
5. REST Routers:
   - `server/src/routes/hr-collaboration.routes.ts`
   - `server/src/routes/me-collaboration.routes.ts`
6. Automated Test Suite:
   - `server/src/tests/p8-collaboration-final-polish.test.ts`

---

## 9. Security & Tenant-Isolation Implications

- **Calendar Privacy:** Employees viewing `/me/calendar` MUST NOT see other employees' private leaves, personal calendar events, or meetings they are not invited to.
- **Todo Isolation:** Action items and approval requests must strictly check `assigneeId == req.user.employeeId` or `userId == req.user.userId`.
- **Fail-Closed Multi-Tenancy:** All projection queries must inject `tenantId = req.user.tenantId` fail-closed.
- **Branding Security:** Dynamic tenant branding resolution must never leak across tenant hostnames.

---

## 10. Audit Conclusion

All P0–P7 domains are protected. No database schema changes are required because the calendar and todo unification are pure projections over authoritative existing tables (`Meeting`, `TrainingSession`, `LeaveApplication`, `Holiday`, `CalendarEvent`, `MeetingActionItem`, `ApprovalRequest`, `AssetAssignment`, `DocumentAcknowledgement`, `WorkspaceTodo`, `Notification`).

Proceed to **BUSINESS-RULE LOCK** (`P8_BUSINESS_RULE_DECISIONS.md`).
