# Phase 14 — Development Impact Map

| Defect / Task | Frontend Files | Backend Files | Prisma Models | Dependent Workflows |
|---|---|---|---|---|
| **REM-001 (`DEFECT-016`)** | — | `server/src/routes/hr-lifecycle.routes.ts`, `server/src/middleware/auth.ts` | `EmployeeExit`, `Employee`, `DeviceSession`, `User` | Employee Termination (`GM-012`), Auth Session Guard |
| **REM-002 (`DEFECT-011`)** | — | `server/src/services/workflow.service.ts`, `server/src/routes/awards.routes.ts` | `WorkflowDefinition`, `WorkflowStep`, `AwardNomination`, `ApprovalRequest` | Employee Award Nomination & Approval (`GM-010`) |
| **REM-003 (`DEFECT-020`)** | — | `server/src/routes/files.routes.ts` | `MediaFile` | HR File Manager Org View (`GM-013`) |
| **REM-004 (`DEFECT-019`)** | `CMS/src/app/(workspace)/me/lifecycle/trips/page.tsx` (+ shared callers) | `server/src/routes/me-lifecycle.routes.ts` | `EmployeeTrip` | Employee Trips & File Manager (`GM-011`, `GM-013`) |
| **REM-005 (`DEFECT-017`)** | — | `server/src/routes/hr-meetings.routes.ts` | `Meeting`, `MeetingAttendee`, `MeetingRoom` | HR Meetings Creation & Invites (`GM-007`) |
| **REM-006 (`DEFECT-015`)** | `CMS/src/app/super/tenants/page.tsx`, `CMS/src/components/layout/WorkspaceShell.tsx` | `server/src/routes/super.routes.ts` | `Tenant`, `DeviceSession` | Super Admin Enter Tenant (`GM-001` -> `GM-002`/`GM-003`) |
| **REM-007 (`DEFECT-018`)** | `CMS/src/components/todo/unified-todo-app.tsx` | `server/src/routes/todos.routes.ts` | `WorkspaceTodo` | HR 10-Employee Task Assignment & Tracking (`GM-004`) |
| **REM-008 (`DEFECT-012`)** | — | `server/src/routes/me-lifecycle.routes.ts`, `server/src/services/lifecycle.service.ts` | `EmployeeTrip` | Employee Trip Validation & Error Hygiene (`GM-011`) |
| **REM-009 (`DEFECT-013`)** | — | `server/src/routes/files.routes.ts` | `MediaFile` | File Manager Upload Error Handling (`GM-013`) |
| **REM-010 (`DEFECT-003`/`004`)** | `CMS/src/components/dreams-sidebar.tsx` | — | — | HR & Tenant Admin Navigation |
| **REM-011 (`DEFECT-009`)** | — | `server/src/routes/hr-meetings.routes.ts`, `organization.routes.ts`, `todos.routes.ts` | `Notification`, `AuditLog` | Cross-Module Notification & Audit Integrity (`GM-014`) |
| **REM-012 (`DEFECT-001`)** | — | `server/src/index.ts` | — | Super Admin `/api/v1/super/*` Routing Parity |
| **REM-013 (`DEFECT-005`)** | `CMS/src/lib/useTenantBranding.ts`, `CMS/src/components/layout/WorkspaceShell.tsx`, `CMS/src/components/realtime-notification-drawer.tsx`, `CMS/src/lib/pusher-client.ts` | `server/src/index.ts` | — | All Workspace Dashboards & Route Transitions (`GM-015`) |
