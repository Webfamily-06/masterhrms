# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 03: Employee Onboarding & Lifecycle Discovery

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Domain:** Candidate-to-Employee Transition, Onboarding Checklists & Lifecycle Milestones  
**Date:** November 19, 2026  
**Reference Target:** WorkDo HRMS Onboarding & Candidate Pipeline  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Module Overview & Functional Scope

The Onboarding and Lifecycle module manages the critical bridge between recruitment (ATS) and authoritative employment. It orchestrates:
1. Converting hired applicants into active employee profiles.
2. Managing onboarding checklists (pre-boarding document collection, IT asset provisioning, orientation).
3. Tracking lifecycle events across an employee's tenure (awards, promotions, transfers, warnings, probation, and separations).

In MASTERHRMS:
- Frontend Routes:
  - `/hr/recruitment/candidate-onboarding.tsx` ([candidate-onboarding.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/recruitment/candidate-onboarding.tsx))
  - `/hr/recruitment/onboarding-checklists.tsx` ([onboarding-checklists.tsx](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/src/routes/_authenticated/hr/recruitment/onboarding-checklists.tsx))
  - `/hr/recruitment/pipeline.tsx` (ATS Pipeline with 1-click Convert to Employee)
- Backend Endpoints:
  - `/api/hr/recruitment/candidate-onboarding` in [hr-recruitment.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/hr-recruitment.routes.ts)
  - `/api/hr/lifecycle/*` in [hr-lifecycle.routes.ts](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/hr-lifecycle.routes.ts)

---

### 2. Onboarding Workflow & Checklist Architecture

1. **Pre-Joining Checklist Engine**:
   - Model: `OnboardingChecklist` & `OnboardingTask`.
   - Categories: `document` (KYC, relieving letter, educational degrees), `it_hardware` (laptop, monitor, security badge), `verification` (background check, police clearance), `hr_orientation` (policy sign-off, buddy assignment).
   - Dynamic Offset Days: Tasks compute relative deadlines (`dueOffsetDays`) based on the candidate's agreed joining date.
2. **Atomic Convert-to-Employee Workflow**:
   - Endpoint: `POST /api/hr/recruitment/candidates/:id/convert-to-employee`.
   - Copies candidate's verified name, email, phone, applied position, department, and salary into an authoritative `Employee` record.
   - Generates sequential `employeeCode` (`EMP-XXX`).
   - Links onboarding tasks directly to the new employee ID.

---

### 3. Backend Endpoints Inventory

| Endpoint | Method | Role Guard | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/hr/recruitment/candidate-onboarding` | `GET` | `requireHrAdmin` | Lists onboarding pipelines with completion percentages. | **VERIFIED** |
| `/api/hr/recruitment/candidate-onboarding/tasks/:taskId` | `POST` | `requireHrAdmin` | Updates task status (`pending`, `verified`, `waived`). | **VERIFIED** |
| `/api/hr/recruitment/onboarding-checklists` | `GET`, `POST` | `requireHrAdmin` | CRUD for reusable checklist templates with configurable mandatory flags. | **VERIFIED** |
| `/api/hr/lifecycle/overview` | `GET` | `requireHrAdmin` | Aggregated lifecycle KPI stats (active probations, awards, transfers). | **VERIFIED** |
| `/api/hr/lifecycle/timeline/:employeeId` | `GET` | `requireHrAdmin` | Unified chronological feed of all historical lifecycle events for an employee. | **VERIFIED** |

---

### 4. Parity Comparison vs WorkDo HRMS

| Feature | WorkDo HRMS | MASTERHRMS | Parity Status |
| :--- | :--- | :--- | :--- |
| **Candidate Conversion** | Manual profile copy | 1-click ATS Kanban button + automated code assignment | **VERIFIED** |
| **Checklist Templates** | Basic task list | Rich categorized checklist engine with offset due dates | **SUPERIOR TO WORKDO** |
| **Progress Tracking** | Progress bar on candidate | Progress bar + badge (`In Progress`, `Completed`) | **VERIFIED** |
| **Welcome Email Trigger** | Email alert sent | Automated SMTP welcome email dispatch with portal link | **VERIFIED** |

---

### 5. Identified Gaps & Phase 3 Recommendations

1. **Self-Service Candidate Portal (P1)**: Allow candidates prior to their official Day 1 to upload documents securely via an external one-time token link without needing a full tenant account.
2. **IT Asset Auto-Reservation (P2)**: When an onboarding task of category `it_hardware` is completed, automatically link to `Asset` inventory to reserve an unallocated laptop.
