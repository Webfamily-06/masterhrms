# 02. Company Configuration Parity Report

This document details the audit and implementation of Company Configuration capabilities for the Company Admin role, verifying persistent storage, backend validation, tenant ownership, and complete isolation from Super-Admin-only controls.

---

## 1. Verified Configuration Capabilities

### 1.1 Legal Identity & Billing Profile
- **Component**: `src/components/settings/company-profile-settings.tsx`
- **Route**: `/tenant/company-profile`
- **Backend API**: `GET /api/v1/company-profile`, `POST /api/v1/company-profile`
- **Persisted Entity**: `CompanyProfile` & `GstRegistration` in PostgreSQL
- **Fields Captured**:
  - `legalName`, `tradeName`, `businessType` (Pvt Ltd, LLP, Sole Prop, etc.)
  - `pan`: Regex validated (`/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/`)
  - `tan`: Regex validated (`/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/`)
  - `cin`: Regex validated for Indian MCA standards
  - `email`, `phone`, `website`
  - Registered office address (Lines 1 & 2, City, State, Pincode, Country)
  - Dedicated Billing address (with "Same as Registered" toggle)
  - Multi-state GSTIN registrations (Regular, Composition, SEZ)

---

### 1.2 Branding & Visual Identity
- **Component**: `src/components/settings/workspace-branding-settings.tsx` & `shared-settings-shell.tsx`
- **Route**: `/tenant/branding` (and `/tenant/settings?tab=branding`)
- **Backend API**: `PUT /api/workspace/settings/brand`, `PUT /v1/settings/TENANT/branding`
- **Capabilities**:
  - Dark Mode Logo upload (PNG, SVG, WebP)
  - Light Mode Logo upload
  - Favicon upload
  - Accent Color picker (`--primary` and `--sidebar-primary` CSS variables)
  - Footer copyright text customization
  - Real-time client CSS synchronization via `useTenantBranding()` hook

---

### 1.3 Regional & Localization Preferences
- **Component**: `src/components/settings/shared-settings-shell.tsx` (Category: `general`)
- **Route**: `/tenant/settings?tab=general`
- **Backend API**: `PUT /v1/settings/TENANT/locale`
- **Persisted Settings**:
  - `timezone`: Default `Asia/Kolkata` (configurable to global IANA timezones)
  - `dateFormat`: `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`
  - `timeFormat`: `12h` or `24h`
  - `currency`: Default `INR (₹)` (configurable to `USD ($)`, `EUR (€)`, `GBP (£)`)
  - `fiscalYearStart`: Default `April 1` (standard Indian financial cycle) to `March 31`

---

### 1.4 Indian Statutory & Labor Compliance Settings
- **Component**: `src/routes/_authenticated/hr/payroll/settings.tsx`
- **Route**: `/hr/payroll/settings`
- **Backend API**: `GET /api/payroll/settings/statutory`, `POST /api/payroll/settings/statutory`
- **Statutory Engines**:
  - **EPF**: 12% employee contribution, 3.67% employer EPF, 8.33% EPS (capped at ₹1,250), ₹15,000 statutory wage ceiling, Voluntary PF (VPF) toggle.
  - **ESIC**: 0.75% employee rate, 3.25% employer rate, ₹21,000 gross ceiling.
  - **Professional Tax (PT)**: Automatic state-based bracket deduction (Karnataka, Maharashtra, Tamil Nadu, etc.).
  - **TDS**: Income-tax Act, 2025 Section 392 regime options (New vs Old tax regime calculation).

---

## 2. Security & Tenant Scoping Verification

1. **Tenant Ownership**: Every configuration record is explicitly bound to `req.user.tenantId`. Attempting to pass an arbitrary `tenantId` in the body or query parameter is superseded by the verified session JWT claim.
2. **Super-Admin Protection**: Global platform settings (e.g., SMTP global relay, root payment gateways, SaaS plan configurations) cannot be accessed or modified from `/tenant/settings`.
