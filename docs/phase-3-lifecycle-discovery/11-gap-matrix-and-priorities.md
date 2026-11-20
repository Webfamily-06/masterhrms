# MASTERHRMS — Phase 3: Lifecycle Discovery
## Document 11: Gap Matrix & Priority Assessment

**Document Version:** 1.0.0  
**Phase:** Phase 3 – Lifecycle Discovery  
**Reference Benchmark:** WorkDo HRMS SaaS  
**Source of Truth:** MASTERHRMS Local Source Code  

---

### 1. Comprehensive Lifecycle Gap Matrix

| Functional Module | Feature / Capability | WorkDo Reference | MASTERHRMS Current State | Status | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HR Operations** | Realtime Attendance Roster | In-line table with status | Present in `/api/dashboard/hrm-hub` | **VERIFIED** | Baseline |
| **HR Operations** | Dynamic Shift-aware Late Mark | Shift grace period | Static 9:30 AM IST fallback in fast aggregator | **PARTIAL** | **P1** |
| **Employee Directory** | 360-Degree Profile View | Multi-tab card | 13 comprehensive tabs in `$id.tsx` | **VERIFIED** | Baseline |
| **Employee Directory** | Account Deactivation / Activation | Status toggle | Supported with session revocation | **VERIFIED** | Baseline |
| **Employee Directory** | Secure Password Reset | Modal with temp pass | Implemented with bcrypt hash + 1-click copy | **VERIFIED** | Baseline |
| **Recruitment ATS** | Kanban Pipeline to Candidate Table | Table / Kanban switch | Present in `candidates.tsx` & `pipeline.tsx` | **VERIFIED** | Baseline |
| **Recruitment ATS** | 1-Click Convert to Employee | Card action button | Implemented on Hired stage cards | **VERIFIED** | Baseline |
| **Onboarding** | Categorized Checklists | Standard task list | Categorized with offset due dates | **VERIFIED** | Baseline |
| **Onboarding** | External Pre-boarding Upload Link | One-time token link | Not yet exposed without login | **MISSING** | **P2** |
| **Employee Self-Service** | Web Clock-in with Geolocation | Button with location | Server UTC punch + location + IP | **VERIFIED** | Baseline |
| **Employee Self-Service** | Attendance Regularization | Request form | Full regularization workflow with reason | **VERIFIED** | Baseline |
| **Employee Self-Service** | Leave Balance Ledger | Number display | Detailed ledger (opening, taken, reserved) | **VERIFIED** | Baseline |
| **Employee Self-Service** | Leave Dry-Run Breakdown | Not available | Pre-flight calculation with sandwich rules | **SUPERIOR** | Baseline |
| **Employee Self-Service** | Comp-Off Earning & Expiration | Not supported | Dedicated FIFO comp-off expiration engine | **SUPERIOR** | Baseline |
| **Employee Self-Service** | Leave Encashment Batching | Manual adjustment | Formula-driven batching into payroll | **SUPERIOR** | Baseline |
| **Employee Self-Service** | Profile Change Request Workflow | Direct edit or ticket | Snapshot change center with correction loop | **VERIFIED** | Baseline |
| **Employee Self-Service** | Tax Declarations & Proofs Upload | Form upload | UI route exists, automated proof audit needed | **PARTIAL** | **P1** |
| **Manager Self-Service** | Direct Reports View | Team list | Present in `/me/team` with contact cards | **VERIFIED** | Baseline |
| **Manager Self-Service** | Unified Approvals Queue | Dispersed pages | Consolidated `/me/approvals` hub | **VERIFIED** | Baseline |
| **Manager Self-Service** | Multi-Select Bulk Approval | Checkbox bulk action | Requests currently approved individually | **MISSING** | **P1** |
| **Manager Self-Service** | Team Leave Calendar | Month grid | Present in `/me/leave/team-calendar` | **VERIFIED** | Baseline |
| **Hierarchy Management** | Anti-Cycle Traversal Engine | Dropdown restriction | Graph BFS traversal blocks circular loops | **VERIFIED** | Baseline |
| **Lifecycle & Exits** | Voluntary Resignation Submission | Employee form | Present in `/me/lifecycle/resignation` | **VERIFIED** | Baseline |
| **Lifecycle & Exits** | Notice Period Auto-Calculation | Manual date entry | Auto-calculated Last Working Day | **VERIFIED** | Baseline |
| **Lifecycle & Exits** | 4-Department No-Due Clearance | Basic status | IT/Admin/Finance/HR clearance matrix | **VERIFIED** | Baseline |
| **Lifecycle & Exits** | Automated F&F Settlement | Manual payroll run | Formula calculation with gratuity/TDS | **VERIFIED** | Baseline |
| **Lifecycle & Exits** | Automated Relieving Letter Issuance | Manual document | Document generator present; auto-trigger needed | **PARTIAL** | **P1** |
| **Notifications** | Realtime In-App Bell & Counter | Realtime bell | Socket.io + Pusher + Unread badge | **VERIFIED** | Baseline |
| **Notifications** | Interactive Toast Push on Event | Basic alerts | Sonner toast trigger upon live Pusher event | **PARTIAL** | **P1** |

---

### 2. Prioritized Action Items for Implementation

#### Priority 0 (P0) — Critical Core Parity & Quality Gates
1. Verify end-to-end integration of employee clock-in, leave application, and manager approvals across live browser views.
2. Confirm 1-click Convert to Employee seamlessly creates the user account and seeds initial leave balances.

#### Priority 1 (P1) — Operational Efficiency Enhancements
1. **Manager Bulk Approval Action**: Add multi-select checkboxes to `/me/approvals` so managers can approve multiple leave requests and attendance regularizations in a single click.
2. **Dynamic Shift-Aware Late Mark**: Connect employee's assigned `Shift` grace period directly into the HR Dashboard realtime attendance widget.
3. **Automated Relieving Letter Trigger**: When F&F settlement is marked `PAID`, automatically generate the Relieving Letter PDF using the template studio and attach to the exit record.
4. **Live In-App Toast Dispatches**: Wire incoming Pusher events to an interactive Sonner toast with a direct "View Request" button.

#### Priority 2 (P2) — Secondary Feature Additions
1. Pre-boarding external candidate upload portal.
2. Optional web camera selfie punch.
3. Alumni read-only access portal for post-exit tax document retrieval.
