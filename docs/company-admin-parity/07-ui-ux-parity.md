# 07. UI/UX Parity & Screen Comparison Report

This document benchmarks the visual, navigational, and ergonomic user experience of MASTERHRMS's Company Admin portal against the WorkDo HRMS reference implementation (`https://dash-demo.workdo.io/`).

---

## 1. Design Philosophy Comparison

| Dimension | WorkDo Reference | MASTERHRMS Implementation | Architectural Advantage |
|---|---|---|---|
| **Tech Framework** | Laravel 11 + Inertia.js + Tailwind | React 19 + TanStack Start + Tailwind + Radix UI | Instantaneous client transitions without full-page HTML skeletons |
| **Color Palette** | Slate Gray & Violet (`#6c5ce7`) | Premium Charcoal, Pure White, and Vibrant Amber/Orange (`#FF6F28`) | High contrast WCAG AA compliance with complete Dark/Light mode |
| **Typography** | Inter & system fonts | Public Sans & Inter with tabular numerals | Highly legible data matrices and financial numbers |
| **Form UX** | Long vertical pages | Stepper wizards and scoped modal drawers | Clear step validation and reduced cognitive fatigue |
| **Feedback & State** | SweetAlert2 alerts | Rich Sonner toast notifications with loading spinners and undo actions | Clean, modern non-blocking notifications |

---

## 2. Screen-by-Screen Parity Benchmark

### 2.1 Workspace Dashboard
- **WorkDo**: `/account/dashboard` — dense cluster of 60+ modular widgets.
- **MASTERHRMS**: `/tenant/dashboard` — focused dashboard featuring key HR indicators (Headcount, Present Today, On Leave, Open Requisitions), recent activity stream, quick actions, and direct navigation pills.

### 2.2 Company Profile & Configuration
- **WorkDo**: Simple 1-tab company settings view.
- **MASTERHRMS**: `/tenant/company-profile` — multi-section layout with Legal Identity, Registered Office, Billing Address, Multi-State GSTINs, and Bank details with live validation indicators.

### 2.3 Organisation Structure (Branches, Departments, Designations)
- **WorkDo**: Three separate tables under HRM System Setup.
- **MASTERHRMS**: Dedicated views under `/hr/organization/branches`, `/departments`, `/designations` with integrated breadcrumbs, quick search, status filters, multi-select bulk operations, and Excel/PDF export toolbars. Directly accessible from the Company Admin sidebar.

### 2.4 User Management & Access Control
- **WorkDo**: `/users` — user list with basic edit and password reset.
- **MASTERHRMS**: `/tenant/users` — complete user directory with role badges, employee code pills, 1-click password resets with clipboard copy, profile editing, and role assignment.

### 2.5 Role & Permission Matrix
- **WorkDo**: `/roles` — checkbox list of 483 permissions.
- **MASTERHRMS**: `/tenant/roles` — categorized module tree with search, 1-click select all per module, duplicate role capability, and user count badges.
