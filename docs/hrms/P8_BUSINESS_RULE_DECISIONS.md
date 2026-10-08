# MASTERHRMS — PHASE P8
## BUSINESS-RULE DECISIONS REGISTER

**PHASE:** P8 Collaboration & Final Polish  
**STATUS:** LOCKED & AUTHORITATIVE  
**DATE:** 2026-10-07  

---

### P8-BR-001: Global Workplace Calendar as a Projection Model
- **Domain:** Calendar / Collaboration
- **Rule:** The Global Workplace Calendar is strictly a read-model projection over existing authoritative domain records. No duplicate calendar table or secondary source of truth is introduced.
- **Authoritative Sources:**
  1. `Meeting` (where `tenantId`, `status != 'cancelled'`)
  2. `TrainingSession` (where `tenantId`, `status != 'cancelled'`)
  3. `LeaveApplication` (where `tenantId`, `status == 'APPROVED'`)
  4. `Holiday` (where `tenantId`)
  5. `CalendarEvent` (ad-hoc personal & company events where `tenantId`)
- **Impact:** Read queries dynamically merge these 5 streams into a normalized `CalendarEventDTO[]`.
- **Status:** **LOCKED**

---

### P8-BR-002: Calendar Employee Privacy & Scoping
- **Domain:** Calendar / Data Privacy
- **Rule:** When queried from Employee Self-Service (`/api/v1/me/calendar/events`):
  1. Meetings: Only includes meetings where the employee is the organizer or an invited attendee (`MeetingAttendee`).
  2. Training Sessions: Only includes sessions for courses the employee is enrolled in or public cohort sessions.
  3. Leave: Only includes the employee's own approved leaves. Colleague leave reasons are never exposed.
  4. Holidays: Includes official public holidays applicable to the employee's tenant/branch.
  5. Personal Events: Only includes `CalendarEvent` created by the employee.
- **Status:** **LOCKED**

---

### P8-BR-003: HR Calendar Scope & Department Filtering
- **Domain:** Calendar / HR Operations
- **Rule:** When queried from HR Administration (`/api/v1/hr/calendar/events`):
  1. Surfaces tenant-wide meetings, training sessions, approved employee leaves, official holidays, and company events.
  2. Supports filtering by date interval (`startDate`, `endDate`), category (`meeting`, `training`, `leave`, `holiday`, `event`), and department.
- **Status:** **LOCKED**

---

### P8-BR-004: Ad-Hoc Calendar Event Management
- **Domain:** Calendar
- **Rule:** Users can create, update, and delete custom `CalendarEvent` records. Mutations must enforce `tenantId` fail-closed and check ownership (`userId == req.user.userId` or HR role).
- **Status:** **LOCKED**

---

### P8-BR-005: Unified Todo as an Authoritative Task Index
- **Domain:** Todo / Action Items
- **Rule:** The Unified Todo layer is an aggregated projection index over actionable enterprise records. One business task = one authoritative source record.
- **Projected Sources:**
  1. `MeetingActionItem`: Deliverables assigned to employee.
  2. `ApprovalRequest`: Pending workflow approval tasks assigned to the user.
  3. `AssetAssignment`: Pending digital custody handover acknowledgements (`status == 'assigned'` and `acknowledgedAt == null`).
  4. `DocumentAcknowledgement`: Mandatory policy campaign sign-offs pending employee action.
  5. `WorkspaceTodo`: Personal ad-hoc todos created by the user.
- **Status:** **LOCKED**

---

### P8-BR-006: Task Mutation Ownership & Delegation
- **Domain:** Todo / State Transitions
- **Rule:** Completing or updating a task from the Todo UI must delegate to the owning domain:
  - `meeting_action`: Updates `MeetingActionItem` status (`open` -> `in_progress` -> `completed`).
  - `approval`: Calls `WorkflowService` approve/reject.
  - `asset_handover`: Calls `AssetService.acknowledgeAssignment()`.
  - `document_ack`: Calls `DocumentService.acknowledgeDocument()`.
  - `workspace_todo`: Updates `WorkspaceTodo` completion flag.
- **Status:** **LOCKED**

---

### P8-BR-007: Employee Todo Scoping
- **Domain:** Todo / Employee Self-Service
- **Rule:** `/api/v1/me/todo/items` strictly filters to items where `assigneeId == req.user.employeeId` or `userId == req.user.userId`. Employees cannot see other employees' pending action items or approvals.
- **Status:** **LOCKED**

---

### P8-BR-008: HR Todo Scoping
- **Domain:** Todo / HR Management
- **Rule:** `/api/v1/hr/todo/items` surfaces pending management approvals, high-priority open meeting action items across departments, and admin personal tasks.
- **Status:** **LOCKED**

---

### P8-BR-009: Global Notification Ingestion & State Machine
- **Domain:** Notifications
- **Rule:** Notifications utilize the existing `Notification` model and `NotificationService`. State transitions:
  - `unread`: `readAt == null`
  - `read`: `readAt = new Date()`
  - Single mark-read: updates specific notification for `(id, tenantId, userId)`.
  - Bulk mark-read: updates all notifications for `(tenantId, userId, readAt: null)`.
- **Status:** **LOCKED**

---

### P8-BR-010: Notification Realtime Event Emission
- **Domain:** Notifications / Realtime
- **Rule:** Realtime event emissions (`notification:new`, `tenant:notification`) broadcast minimal invalidation payloads to `user:${userId}`. Clients refetch the authorized list through `/api/v1/shared/notifications`.
- **Status:** **LOCKED**

---

### P8-BR-011: Tenant Branding Dynamic Injection
- **Domain:** UI / Shell Theming
- **Rule:** Sidebars, topbars, and portal switchers must derive tenant branding (workspace name, logoUrl, primary color) dynamically using `useTenantBranding()`. Static hardcoded branding strings or fallback logos must only appear when no tenant workspace is resolved.
- **Status:** **LOCKED**

---

### P8-BR-012: Role-Based Navigation & Menu Visibility
- **Domain:** UI / RBAC
- **Rule:** Menus and profile options that the user's role cannot execute must not be rendered in the UI. Server endpoints must reject unauthorized requests with `403 Forbidden` rather than relying solely on UI concealment.
- **Status:** **LOCKED**

---

### P8-BR-013: Enterprise Iconography & Clean UI Standard
- **Domain:** UI Design System
- **Rule:** No decorative emojis in enterprise navigation, headers, or data tables. All icons must be stroke-consistent Lucide icons. All pages must use canonical UIAble components: `PageHeader`, `StatCard`, `FilterToolbar`, `DataTable`, `EmptyState`, `Badge`, `Button`, `Dialog`.
- **Status:** **LOCKED**
