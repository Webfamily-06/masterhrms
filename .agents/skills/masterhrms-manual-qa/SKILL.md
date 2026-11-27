---
name: masterhrms-manual-qa
description: Reusable end-to-end multi-agent manual QA playbook for MasterHRMS covering Playwright MCP isolated role sessions, Chrome DevTools screencasts, workflow handoff protocols, defect triage templates, deadlock recovery, and repeatable Playwright regression generation.
---

# MasterHRMS — Multi-Agent End-to-End Manual QA Skill

## 1. Authoritative Testing Contract
1. **Source of Truth**: Always verify against the live MasterHRMS codebase (`CMS/`, `server/`), live PostgreSQL database, and real UI interactions. Never assume routes, permissions, or features exist without checking.
2. **Zero Silent Fixes**: Never modify application source code (`CMS/src/**`, `server/src/**`) during the initial manual QA pass. Log defects with evidence and continue executing independent tests.
3. **Zero Fabrication**: Never mock responses, fabricate screenshots/videos, or mark untested items as `PASS`.
4. **Authorized Test Environment Gate**: Before running destructive operations or external payment flows, confirm:
   - `NODE_ENV=development` (or authorized staging)
   - `BASE_DOMAIN=localhost` (or authorized test host)
   - Live payment keys (`rzp_live_*`, `sk_live_*`) are NOT invoked with real money; sandbox/test flows only.
5. **Credential Hygiene**: Never write plaintext passwords, JWTs, cookies, or session IDs into screenshots, markdown reports, or committed files.

## 2. Verified Tooling Matrix & Concurrency Rules

| Capability | Primary Tool | Backup / Complement | Session Isolation & Concurrency Rules |
|---|---|---|---|
| **UI Interaction** | `playwright` MCP (`browser_navigate`, `browser_click`, `browser_fill_form`, `browser_type`, `browser_select_option`, `browser_snapshot`) | Local `playwright` v1.64.1 (`BrowserContext`) | Use `browser_tabs({ action: "new", isolatedContext: "<role>" })` so every role has isolated cookies, `localStorage`, and `sessionStorage`. |
| **Screenshots** | `playwright` MCP `browser_take_screenshot({ filename, scale: "css" })` | `chrome-devtools-mcp` `take_screenshot` | Save PNGs under `test-results/screenshots/<category>/<WORKFLOW>_<Agent>_<Action>.png`. |
| **Video Recording** | Local Playwright v1.64.1 `browser.newContext({ recordVideo: { dir: "test-results/videos/" } })` + `chrome-devtools-mcp` `screencast_start` / `screencast_stop` | Frame-by-frame PNG sequence if headless video unavailable | Never claim a video exists unless the `.webm` / `.mp4` file is verified on disk under `test-results/videos/`. |
| **Traces** | Playwright `context.tracing.start({ screenshots: true, snapshots: true })` | `chrome-devtools-mcp` `performance_start_trace` | Save `.zip` traces under `test-results/traces/`. |
| **Network & Console** | `playwright` MCP `browser_network_requests`, `browser_network_request`, `browser_console_messages` | `chrome-devtools-mcp` `list_network_requests`, `list_console_messages` | Capture failing HTTP payloads (redacting `Authorization`, `Cookie`, and passwords) into `test-results/api-evidence/`. |
| **Multi-Agent Orchestration** | `QA Coordinator` (orchestrator) + Isolated Playwright `BrowserContext` per role (`super-admin`, `tenant-admin`, `tenant-hr`, `emp-1`..`emp-10`) | `invoke_subagent` for non-conflicting read-only analysis | **CRITICAL LIMITATION**: Parallel subagents calling the same `playwright` MCP server race on its single active-tab cursor. Coordinate sequential MCP tab switches OR dedicated isolated Playwright `BrowserContext`s via the QA Coordinator. Never assume spawning agents automatically isolates browser storage. |

## 3. Role Session Naming Convention
Every role MUST bind to a unique `isolatedContext` name:
- `super-admin` — Super Admin portal (`/super06` -> `/super/**`)
- `tenant-admin` — Tenant Owner / Admin (`Kovai Textails`)
- `tenant-hr` — Tenant HR Manager (`Kovai Textails`)
- `emp-1` through `emp-10` — 10 isolated Employee sessions (`/me/**`)
- `cross-tenant-probe` — Secondary tenant session for cross-tenant isolation testing

## 4. Standardized Test Status Definitions
- **PASS**: Real UI action completed, backend persisted, and verified in dependent sessions with zero blocking errors.
- **FAIL**: Actual behavior contradicts expected behavior (must link `DEFECT-XXX`).
- **BLOCKED**: Cannot proceed due to prerequisite, environment, permission, or upstream defect (must log in `test-results/blocked-workflows.md`).
- **PARTIAL**: Core step works, but secondary requirement (e.g., notification, balance recalculation, sandwich rule, audit trail) is missing or broken.
- **NOT TESTED**: Outside scope or skipped with documented reason.

## 5. Workflow Handoff Protocol (Deadlock Prevention)
Every cross-role workflow MUST be tracked on `test-results/agent-coordination-log.md`:
```markdown
- **Workflow ID**: LEAVE-001
- **Current Agent**: Employee 1 (`emp-1`)
- **Current Page**: `/me/leave`
- **Action**: Submit Casual Leave request
- **Expected Result**: Request persisted with ID and visible in Leave History
- **Dependency**: Active employee account + leave balance allocated
- **Next Agent**: Tenant HR (`tenant-hr`)
- **Next Action**: Open `/hr/leave/requests`, inspect balance/policy/sandwich rules, approve request
- **Completion Condition**: HR decision persisted AND Employee 1 verifies updated status, balance, and notification
```

### Failure Recovery Rules
When a step fails or stalls:
1. Capture screenshot (`test-results/screenshots/defects/DEFECT-XXX_<slug>.png`).
2. Capture console errors & failing API request/response (sanitized).
3. Record defect in `test-results/defect-register.md` (separating **Confirmed Root Cause** from **Investigation Hypotheses**).
4. Mark workflow `FAIL` or `BLOCKED` on `test-results/agent-coordination-log.md` and `test-results/blocked-workflows.md`.
5. Never retry the exact same failing UI click in a loop without new evidence. Move immediately to the next independent test case.

## 6. Test Case & Defect Templates

### Test Case Row Format (`test-results/test-plan.md`)
`| Test ID | Module | Page | Role | Preconditions | Steps | Expected Result | Actual Result | Status | Evidence | Defect ID |`

### Defect Record Format (`test-results/defect-register.md`)
- Defect ID / Title / Module / Page URL / Affected Role / Affected Agent / Workflow ID
- Severity (`Critical` | `High` | `Medium` | `Low`) & Priority (`P0`–`P3`)
- Environment & Preconditions
- Steps to Reproduce
- Expected Result vs. Actual Result
- Evidence: Screenshot Reference, Video Timestamp, Console Error, Sanitized API Request/Response, DB Persistence Check
- Root Cause Analysis (Confirmed vs. Hypothesis)
- Recommended Resolution, Workaround, Related Test Cases, Regression Test Recommendation, Retest Status

## 7. Post-Manual-QA Repeatable Playwright Suite
After manual workflows succeed, encode verified critical flows as repeatable Playwright Test specs under `tests/e2e/masterhrms-critical-workflows.spec.ts` using environment variables (`QA_SUPER_EMAIL`, `QA_SUPER_PASSWORD`, `QA_BASE_URL`) so no credentials are hardcoded.
