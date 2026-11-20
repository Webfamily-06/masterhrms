# 08. API and Database Changes Report

This document records the exact backend endpoints, service methods, frontend routes, and database models touched during Phase 2.

---

## 1. Backend API Additions (`server/src/routes/workspace.routes.ts`)

| HTTP Method | Route URL | Guard Middleware | Request Payload | Response Contract |
|---|---|---|---|---|
| `POST` | `/api/workspace/users` | `requireAuth`, `requireWorkspaceAdminGuard` | `{ fullName, email, password?, roleId?, employeeId?, legacyRole? }` | `201 Created: { message, user: { id, email, fullName }, temporaryPassword? }` |
| `PUT` | `/api/workspace/users/:userId` | `requireAuth`, `requireWorkspaceAdminGuard` | `{ fullName?, roleId?, employeeId? }` | `200 OK: { message: "User profile updated successfully" }` |
| `POST` | `/api/workspace/users/:userId/reset-password` | `requireAuth`, `requireWorkspaceAdminGuard` | `{ newPassword? }` | `200 OK: { message: "Password reset successfully", temporaryPassword }` |
| `DELETE` | `/api/workspace/users/:userId` | `requireAuth`, `requireWorkspaceAdminGuard` | None | `200 OK: { message: "User removed from workspace successfully" }` |

---

## 2. Frontend Route & Navigation Updates

1. **`src/routes/_authenticated/tenant/users.tsx`**:
   - Replaced basic invite-only table with comprehensive User Management console.
   - Added `Add User` dialog with optional employee mapping.
   - Added `Edit User` dialog with live role assignment.
   - Added `Reset Password` dialog with instant clipboard copy.
   - Added `Remove User` confirmation dialog.
   - Switched data source from `/users` to `/workspace/users`.
2. **`src/nav/registry.ts`**:
   - Integrated `tenant-org-structure` with child items for `Branches`, `Departments`, and `Designations` under the Company Admin `Workspace` menu.

---

## 3. Database Schema Impact

- **Models Utilized**: `WorkspaceRole`, `Permission`, `RolePermission`, `UserRoleAssignment`, `Branch`, `Department`, `Designation`, `Employee`, `Profile`, `User`.
- **Schema Migration Status**: **Zero schema migrations required.** All necessary relations were already present in `server/prisma/schema.prisma`.
- **Integrity**: Existing tenant and employee data remains completely untouched and preserved.
