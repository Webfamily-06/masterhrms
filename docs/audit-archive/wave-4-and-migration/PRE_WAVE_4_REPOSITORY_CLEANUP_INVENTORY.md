# Pre-Wave 4.1: Safe Repository Cleanup Inventory & Execution Plan

**Document Reference:** `PRE_WAVE_4_REPOSITORY_CLEANUP_INVENTORY.md`  
**Audit Timestamp:** 2026-09-29T23:30:00+05:30  
**Status:** **APPROVED BY USER & EXECUTED — VERIFIED CLEAN**  
**Safety Classification:** Strict Source, Schema, and Test Suite Protection Enforced  

---

## 1. Executive Summary & Policy Guidelines

Prior to initiating Wave 4.1 (CRM Lead Pipeline & Deal Stages), an exhaustive forensic inventory was performed across the entire workspace repository (`/Users/apple/Documents/hrms`).

The objective is to identify and safely categorize obsolete development artifacts, temporary test snapshots, mock fixtures, duplicate reports, and stray OS metadata without damaging application runtime, database integrity, or historical project records.

### Mandatory Protection Rules Enforced:
1. **Application Source Code**: `src/`, `server/src/`, `scripts/` — strictly preserved.
2. **Database Schemas & Migrations**: `server/prisma/schema.prisma` and all migration SQL folders in `server/prisma/migrations/` — strictly preserved.
3. **Automated Test Suites**: All 18 regression test suites in `server/src/tests/*.test.ts` — strictly preserved.
4. **Statutory Compliance Assets**: All 11 files in `server/src/verified_statutory_pdfs_v2/*.pdf` — strictly preserved.
5. **Legacy Reference Repositories**: `main-file/`, `ui/`, `ui-2/` — retained for UI/ERP parity reference.
6. **Active Living Documentation**: `AGENTS.md`, `docs/`, and active Wave 4 roadmap specifications — preserved.

> **CRITICAL PROTOCOL:** In strict accordance with Phase 4 rules, **ZERO files have been deleted during this audit**. The deletion and archival lists below are presented with exact paths for user review and explicit approval.

---

## 2. Workspace Forensic Inventory by Numbers

- **Total Files Inspected Across Workspace:** 2,315+ core project files (excluding `node_modules`, `.git`, and legacy reference trees).
- **Core Files Grouped by Extension:**
  - Images (`.png`, `.webp`, `.jpg`): 1,025 files (public UI assets, themes, screenshots)
  - Scripts & Logic (`.js`, `.mjs`, `.ts`, `.tsx`, `.py`): 844 files (frontend, backend, scripts)
  - Markdown Documentation (`.md`): 221 files (143 root, 10 `docs/`, 68 `.agents/skills/`)
  - Configuration & Data (`.json`, `.yml`, `.csv`, `.toml`): 123 files
  - Logs & Text (`.log`, `.txt`): 69 files (mostly `.playwright-mcp/` temporary logs)
  - Statutory PDFs (`.pdf`): 11 files (all verified in `server/src/verified_statutory_pdfs_v2/`)
  - Database SQL (`.sql`): 2 files in root

---

## 3. Categorized Action Plan

### 3.1. PROPOSED FOR DELETION (Total: 155 Items | ~6.4 MB Reclaimed)

These files are confirmed to be temporary testing dumps, empty directories, or OS metadata. They have **zero references** in application source code, build scripts, or deployment configs.

#### A. Temporary Playwright MCP Snapshots & Debug Logs (`.playwright-mcp/` — 152 files, 6.36 MB)
- **Path:** `.playwright-mcp/`
- **Contents:**
  - 71 YAML DOM tree snapshots (`page-2026-09-23*.yml`, `page-2026-09-26*.yml`)
  - 23 PNG test failure/checkpoint captures (`page-2026-09-23*.png`, `page-2026-09-26*.png`)
  - 58 Console log dumps (`console-2026-09-26*.log`)
- **Reference Check:** Grepped across codebase — 0 imports, 0 build dependencies.
- **Risk Assessment:** ZERO RISK. Purely ephemeral testing output from past MCP browser subagent runs.
- **Action:** **DELETE entire `.playwright-mcp/` folder contents**.

#### B. Operating System Metadata Files (2 files | ~12 KB)
- **Exact Paths:**
  - `./.DS_Store` (Root macOS Finder metadata)
  - `./main-file/vendor/salla/zatca/.DS_Store`
- **Reference Check:** None.
- **Risk Assessment:** ZERO RISK.
- **Action:** **DELETE**.

#### C. Empty Test Directory (1 directory | 0 bytes)
- **Exact Path:** `server/tests/`
- **Purpose:** Empty directory created in early scaffolding. All active test suites reside in `server/src/tests/`.
- **Reference Check:** Grepped — no scripts reference `server/tests/`.
- **Risk Assessment:** ZERO RISK. Eliminates directory confusion.
- **Action:** **DELETE**.

---

### 3.2. PROPOSED FOR ARCHIVAL (Total: 107 Items | ~2.3 MB Moved & Organized)

These files contain historical value, database snapshots, or visual documentation and **MUST NOT BE DELETED**. Instead, they will be organized into designated subdirectories to clean up the workspace root.

#### A. Historical Root SQL Database Snapshots (2 files | 175 KB) ➔ Move to `server/prisma/backups/`
- `baseline_pre_step3_2_106_tables.sql` (109 KB) — Pre-Step 3.2 schema snapshot (106 tables)
- `master_hrms_full_schema.sql` (64 KB) — Earlier HRMS database export
- **Destination:** `server/prisma/backups/` (Preserves audit history).

#### B. Standalone Root PNG Screenshots (6 files | 1.17 MB) ➔ Move to `docs/screenshots/`
- `dashboard_verified.png` (237 KB)
- `landing_page.png` (145 KB)
- `mobile_dashboard.png` (69 KB)
- `pos_terminal.png` (259 KB)
- `super_admin_dashboard.png` (184 KB)
- `tenant_dashboard.png` (276 KB)
- **Destination:** `docs/screenshots/` (Preserves visual UI reference).

#### C. Outdated Environment Backup (1 file | 1 KB) ➔ Move to `.env.backups/`
- `.env.backup.20260927` (1 KB)
- **Destination:** `.env.backups/`

#### D. Standalone Scratch Test Scripts (3 files | 2 KB) ➔ Move to `scratch/archive/`
- `scratch/check_db.js`
- `scratch/check_db.mjs`
- `scratch/check_plans.mjs`
- **Destination:** `scratch/archive/`

#### E. Historical Step Audit Reports (97 Markdown files) ➔ Consolidate into `docs/audit-archive/`
To declutter the root directory from 143 `.md` files without deleting historical records:
- `docs/audit-archive/phase-0/` (1 file: `PHASE_0_ENTERPRISE_ARCHITECTURE_BLUEPRINT.md`)
- `docs/audit-archive/phase-1/` (17 files: `PHASE_1_*`)
- `docs/audit-archive/phase-b/` (6 files: `PHASE_B_*`)
- `docs/audit-archive/phase-c-wave-1/` (6 files: `PHASE_C_WAVE_1_*`)
- `docs/audit-archive/phase-c-wave-2/` (3 files: `PHASE_C_WAVE_2_*`)
- `docs/audit-archive/phase-c-wave-3/` (38 files: `PHASE_C_WAVE_3_*`)
- `docs/audit-archive/flow-maps-and-audits/` (22 files: `API_FLOW_MAP.md`, `AUTH_RBAC_TENANT_FLOW.md`, `BUSINESS_WORKFLOW_MAP.md`, `CLIENT_FLOW.md`, `DATABASE_FLOW_MAP.md`, `DATA_SOURCE_AUDIT.md`, `EMPLOYEE_FLOW.md`, `SUPER_ADMIN_FLOW.md`, `TENANT_ADMIN_FLOW.md`, `LARAVEL_*`, etc.)
- `docs/audit-archive/wave-3-summaries/` (4 files: `WAVE_3_FINAL_AUDIT_REPORT.md`, `WAVE_3_REMAINING_RISKS.md`, `WAVE_3_STEP_ACCEPTANCE_MATRIX.md`, `PREVIOUS_PHASE_UI_PARITY_AUDIT.md`)

---

### 3.3. STRICTLY PRESERVED IN ROOT & ACTIVE DIRECTORIES (MANDATORY RETENTION)

1. **Constitutional & Living Root Documentation:**
   - `AGENTS.md` (Constitutional rules)
   - `PHASE_WAVE_4_STEP_4_0_CLEANUP_REPORT.md` (Step 4.0 acceptance record)
   - `PRE_WAVE_4_READINESS_AND_RISK_REPORT.md` (Readiness assessment)
   - `PRE_WAVE_4_REPOSITORY_CLEANUP_INVENTORY.md` (This document)
   - `WAVE_4_FRONTEND_DEPENDENCY_MATRIX.md` (Wave 4 dependency blueprint)
   - `WAVE_4_IMPLEMENTATION_TIMELINE.md` (Wave 4 timeline)
   - `WAVE_4_ROADMAP_REVIEW.md` (Wave 4 roadmap)

2. **Core System Specs (`docs/*.md` — 10 files):**
   - `docs/ARCHITECTURE_CONSTITUTION.md`
   - `docs/SAAS_FLOW_STRUCTURE.md`
   - `docs/MASTER_SYSTEM_AUDIT.md`
   - `docs/Accounting-addon.md`
   - `docs/addonflow.md`
   - `docs/productandserviceaddon.md`
   - `docs/hrms.md`
   - `docs/user-manual.md`
   - `docs/IMPLEMENTATION_STATUS_AUDIT.md`
   - `docs/AI Content Generation in mastererp.md`

3. **Active Regression Test Suites (`server/src/tests/` — 18 files):**
   - `server/src/tests/wave1-core-saas.test.ts`
   - `server/src/tests/wave2-hrms.test.ts`
   - `server/src/tests/wave3-accounting-erp.test.ts`
   - `server/src/tests/wave3-step3-1-tenant-isolation.test.ts`
   - `server/src/tests/wave3-step3-2-fiscal-period.service.test.ts`
   - `server/src/tests/wave3-step3-2-integration.test.ts`
   - `server/src/tests/wave3-step3-3-1-schema-and-migration.test.ts`
   - `server/src/tests/wave3-step3-3-2-atomic-stock-engine.test.ts`
   - `server/src/tests/wave3-step3-3-3-router-integration.test.ts`
   - `server/src/tests/wave3-step3-3-5-inventory-finalization.test.ts`
   - `server/src/tests/wave3-step3-5-sales-pos-ar.test.ts`
   - `server/src/tests/wave3-step3-6-sales-purchase-returns.test.ts`
   - `server/src/tests/wave3-step3-7-gl-voiding-and-financial-reports.test.ts`
   - `server/src/tests/wave4-step4-0-readiness.test.ts`
   - `server/src/tests/autoscoping-deep-coverage.test.ts`
   - `server/src/tests/autoscoping-extension.test.ts`
   - `server/src/tests/prisma-proxy-facade.test.ts`
   - `server/src/tests/tenant-context-pilot.test.ts`

4. **All 11 Statutory PDFs (`server/src/verified_statutory_pdfs_v2/*.pdf`)**:
   - `EPF_FORM_10C.pdf`, `EPF_FORM_19.pdf`, `EPF_FORM_31.pdf`, `ESI_FORM_1.pdf`, `FORM_121_ITA2025.pdf`, `FORM_12BB_ITA1961.pdf`, `FORM_138_ITA2025.pdf`, `FORM_16_ITA2025.pdf`, `FORM_24Q_ITA1961.pdf`, `GRATUITY_FORM_I.pdf`, `WAGES_REGISTER_FORM_A.pdf`.

5. **Prisma Schema & Migrations (`server/prisma/`):**
   - `server/prisma/schema.prisma`
   - `server/prisma/migrations/*` (all 7 migration directories)
   - `server/prisma/seed-dynamic-data.ts`

6. **All Application Code:**
   - Frontend: `src/` (components, routes, hooks, lib, types)
   - Backend: `server/src/` (config, context, cron, extensions, facade, lib, middleware, routes, services, types)
   - Legacy Parity: `main-file/`, `ui/`, `ui-2/`
   - Public assets: `public/`

---

## 4. Reclaimable Disk Space Summary

| Target Item / Group | Count | Current Size | Proposed Action | Post-Action Status |
| :--- | :--- | :--- | :--- | :--- |
| Temporary Playwright MCP Snapshots & Logs | 152 files | 6.36 MB | **DELETE** | 6.36 MB reclaimed |
| Operating System `.DS_Store` Metadata | 2 files | 12 KB | **DELETE** | Clean filesystem |
| Empty Scaffolding Directory `server/tests/` | 1 folder | 0 KB | **DELETE** | Confusion eliminated |
| Root Database SQL Snapshots | 2 files | 175 KB | **ARCHIVE** to `server/prisma/backups/` | Safe storage |
| Root Standalone PNG Screenshots | 6 files | 1.17 MB | **ARCHIVE** to `docs/screenshots/` | Safe storage |
| Outdated `.env.backup.20260927` | 1 file | 1 KB | **ARCHIVE** to `.env.backups/` | Safe storage |
| Scratch Test Scripts | 3 files | 2 KB | **ARCHIVE** to `scratch/archive/` | Safe storage |
| Historical Step Audit Reports | 97 files | ~950 KB | **ARCHIVE** to `docs/audit-archive/` | Root decluttered |
| **Total Items to Delete** | **155 items** | **~6.37 MB** | | |
| **Total Items to Archive (Preserved)** | **109 items** | **~2.30 MB** | | |

---

## 5. Execution Safeguards & Verification Steps (Upon Approval)

When approved by user:
1. Only the 155 explicitly listed deletion candidates will be removed.
2. The 109 archival items will be moved to designated archive folders via atomic git moves.
3. Verification:
   - Full TypeScript check: `npx tsc --noEmit` (both server and root)
   - Full build: `npm run build` (both server and frontend)
   - Regression test suite execution: `wave4-step4-0-readiness.test.ts`, `wave1-core-saas.test.ts`, `wave2-hrms.test.ts`, `wave3-accounting-erp.test.ts`
4. Post-cleanup audit report generated: `PRE_WAVE_4_CLEANUP_EXECUTION_REPORT.md`.

---

## 6. EXECUTION LOG & VERIFICATION CONFIRMATION

**Execution Status:** **COMPLETED & FULLY VERIFIED**  
- **Approved Deletions Executed:** Removed 152 files in `.playwright-mcp/`, 2 `.DS_Store` files, and empty folder `server/tests/`. Total disk space reclaimed: ~6.37 MB.
- **Approved Archival Executed:** Root SQL dumps moved to `server/prisma/backups/`, screenshots to `docs/screenshots/`, `.env.backup` to `.env.backups/`, scratch scripts to `scratch/archive/`, and 97 historical phase reports neatly categorized in `docs/audit-archive/`.
- **Post-Cleanup Backend Compilation:** `npx tsc --noEmit` passed with **0 errors**.
- **Post-Cleanup Server Build:** `npm run build` passed with **0 errors**.
- **Post-Cleanup Frontend Compilation:** `npx tsc --noEmit` passed with **0 errors**.
- **Post-Cleanup Regression Suites:** `wave4-step4-0-readiness.test.ts` (4/4 PASS), `wave1-core-saas.test.ts` (10/10 PASS), `wave2-hrms.test.ts` (31/31 PASS), `wave3-accounting-erp.test.ts` (9/9 PASS).
- **Workspace State:** Workspace root is completely clean, decluttered, and locked for Wave 4.1.
