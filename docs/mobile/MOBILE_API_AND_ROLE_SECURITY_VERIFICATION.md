# MasterHRMS Mobile App — API & Role Security Verification Report

**Date:** November 18, 2026  
**Subproject:** `mobile-app/src/core/`  
**Security Lead Verification**

---

## 1. Zero Backend Modifications Assurance

A strict non-negotiable requirement of this remediation was to ensure **ZERO BACKEND CHANGES**.
We empirically verify this constraint:
- Run `git status` on root repository.
- Verify `git diff --name-only origin/main`:
  Only files in `mobile-app/` and documentation in `docs/mobile/` were touched.
  Zero files in `server/`, `prisma/`, or database migrations were created or modified.

---

## 2. Multi-Tenant Isolation & Cache Security

1. **Tenant-Scoped Cache Keys:**
   All React Query cache keys are partitioned using `createTenantQueryKey(['scope', 'resource'])`, guaranteeing that data from one tenant workspace cannot leak into another upon logout/login or workspace switching.
2. **Strict Request Interceptors:**
   The HTTP client (`apiClient`) attaches:
   - `Authorization: Bearer <token>`
   - `x-tenant-slug: <tenant>`
   - `x-client-platform: mobile`
   - `x-mobile-app: true`
   On HTTP 401, the interceptor securely handles token refresh or clears session securely.
3. **Secure Hardware Storage:**
   Tokens are stored exclusively in iOS Keychain and Android Keystore via `expo-secure-store` (`secureStorage`), never in unencrypted AsyncStorage.

---

## 3. Role-Based Access Control (RBAC) Verification

The mobile application enforces backend-authoritative role checks across 6 roles:
1. `employee`: Access restricted to ESS routes (My Profile, Attendance Punch, Leave, Regularization, Timesheets, Shifts, Calendar, Payslips, Chat).
2. `manager`: Elevated access to Team approvals (Team Leaves, Team Regularizations, Shift Swaps).
3. `hr_admin`: Administrative access to workspace employees, attendance summaries, company policies, and announcements.
4. `tenant_admin`: Organization settings, subscription tiers, seat limits, and audit logs.
5. `super_admin`: Multi-tenant platform overview and system maintenance metrics.

---

## 4. Input Validation & Data Sanitization

1. **Timesheets:** Hours are validated as positive numbers (`isNaN` and `<= 0` checks). Approved timesheets are immutable.
2. **Shift Swaps:** Self-swaps are prohibited (`requesterEmployeeId !== targetEmployeeId`). Reason and date are strictly validated before submission.
3. **Location & Media:** All GPS coordinates are typed floats. File sizes are derived from genuine filesystem metadata.
