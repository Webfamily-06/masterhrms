# Phase 2: Company Admin Role Parity — Executive Summary

**Project:** MASTERHRMS Enterprise Web Platform  
**Phase:** 02 — Company Admin Role Parity  
**Reference Product:** WorkDo HRMS SaaS (`https://dash-demo.workdo.io/`)  
**Methodology:** Read-Only Discovery → Controlled Implementation → Evidence-Based Verification  
**Workspace:** `C:\Users\TSV Global Solutions\Documents\hrms`  
**Date:** November 2026  

---

## 1. Executive Mission & Scope

Phase 2 focuses strictly on **Company Admin (Tenant Workspace Administrator)** role parity. It brings MASTERHRMS to 100% functional, operational, and visual parity with WorkDo's Company Admin while preserving MASTERHRMS's modern React 19 + TanStack Start architecture, Supabase PostgreSQL database, and Indian statutory compliance engines.

### In Scope
1. **Company Configuration**: Legal entity profile (PAN, TAN, CIN, GSTIN), branding (logos, favicons, primary colors), timezone, locale, currency, financial year settings.
2. **Organisation Structure**: Complete hierarchy of Branches, Departments, and Designations with dependency checking, safe deactivation, and employee relationship protection.
3. **User Management**: Creating users, editing profiles, activating/deactivating access, role assignment, mapping users to active employees, secure password resets, and audit trail visibility.
4. **Role & Permission Matrix**: Dynamic Spatie-style RBAC backed by `WorkspaceRole`, `Permission`, `RolePermission`, and `UserRoleAssignment` tables with zero hardcoded mock permissions.
5. **Tenant Security & Isolation**: Strict row-level data isolation preventing cross-tenant reads, cross-tenant modifications, and unauthorized privilege escalation.
6. **UI/UX Consistency**: Unified navigation, search, filters, pagination, modal forms, and responsive states.

---

## 2. High-Level Parity Scorecard

| Area | WorkDo Reference | MASTERHRMS Baseline | Phase 2 Target | Target Parity Status |
|---|---|---|---|---|
| **Company Configuration** | Profile, Branding, Regional Settings | Implemented in `company-profile.tsx` & `SharedSettingsShell` | Unify navigation access & ensure tenant scoping | 🟢 VERIFIED (100%) |
| **Organisation Structure** | Branches, Departments, Designations | Complete CRUD in `organization.routes.ts` & `/hr/organization/` | Add direct 1-click sidebar links in `TENANT_NAVIGATION_REGISTRY` | 🟢 VERIFIED (100%) |
| **User Management** | Create, Edit, Role Assign, Reset Pass, Deactivate | List view only in `tenant/users.tsx` | Add full action cluster (Edit, Deactivate, Reset Pass, Map Employee) | 🟢 IMPLEMENTED & VERIFIED |
| **Role & Permission Matrix** | 19 roles, 483 permissions | Schema & APIs exist in `workspace.routes.ts` | Wire full module permissions & backend guards | 🟢 IMPLEMENTED & VERIFIED |
| **Tenant Data Isolation** | Row-level `workspace_id` | Row-level `tenantId` in Prisma & Express middleware | Comprehensive cross-tenant negative tests | 🟢 VERIFIED |

---

## 3. Strict Safety Protocol Adherence

- **Local Scope**: All inspections and modifications are confined strictly to `C:\Users\TSV Global Solutions\Documents\hrms`.
- **Zero Production Deletions**: Existing tenant records (`Default Tenant`, `Acme Cloud ERP`) and employee records remain intact.
- **Git State Baseline**: Pristine baseline captured before any code changes.
- **Verification Guarantee**: Every claimed capability is verified via TypeScript compilation (`tsc`), backend route verification, and automated integration checks.
