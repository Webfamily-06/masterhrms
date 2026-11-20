# 14 — Cross-Document Contradiction & Remediation Register

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Audit Standard:** Multi-Document Forensic Consistency Audit  
**Date:** November 19, 2026  
**Documents Audited:** Reports 00 through 35 in `docs/reverse-engineering/workdo-saas/`  
**Total Contradictions Logged:** 11 Major Architectural & Evidentiary Contradictions  

---

## 1. Executive Summary

A comprehensive cross-document reconciliation was performed across all 36 historical investigation reports, comparing their claims against each other, against captured evidentiary artifacts, and against the actual MASTERHRMS source code.

A total of **11 major contradictions** were identified where historical documents asserted mutually inconsistent figures, claimed operational statuses contradicted by source code, or cited non-existent line numbers and files.

---

## 2. Master Contradiction Register

| ID | Historical Document A | Historical Document B | Conflicting Assertions | Codebase & Evidentiary Reality | Correct Architectural Interpretation | Required Documentation Remediation |
|---|---|---|---|---|---|---|
| **CTR-01** | `33-COMPLETE-SECURITY-REGISTER.md` (Sec 2 & 3) | `server/prisma/schema.prisma` | Doc 33 claims Layer 4 PostgreSQL RLS makes leakage "physically impossible" | Zero `CREATE POLICY` or RLS statements exist in `schema.prisma` or SQL files | Isolation is application-level via Prisma extensions and middleware, NOT database RLS | Downgrade claim from VERIFIED to CONTRADICTED; document application-level boundary |
| **CTR-02** | `27-ADDITIONAL-FUNCTION-COVERAGE-REGISTER.md` | `functions/` (All 64 reports) | Doc 27 and individual reports mark 100% of 64 functions as `**WORKING**` | AST audit reveals only 36 fully implemented; 17 partial, 7 spec only, 4 missing | The "100% WORKING" label was an unverified optimistic generalization | Apply strict 8-tier evidence standard; classify each function objectively |
| **CTR-03** | `functions/core-hr/full-final-fnf-settlement-relieving-code.md` | `server/src/routes/offboarding.routes.ts` | Doc claims UI, API, and DB WORKING for issuing Relieving Letter | Code only generates random string `REL-${rand}`; no PDF/DOCX generated or stored | Milestone M5 relieving letter document generation is incomplete | Downgrade FN-057 to PARTIALLY IMPLEMENTED; log M5 implementation gap |
| **CTR-04** | `29-COMPLETE-API-AND-CRUD-REGISTRY.md` | `server/src/routes/` & `server/src/modules/` | Doc 29 claims 1,629 RESTful API endpoints across 122 route modules | AST audit discovers 2,084 declared route handlers across 130 Express files | 1,629 was an October 2026 snapshot from `discovered_endpoints.json` | Reconcile count to 2,084 current endpoints; explain dual-mount prefixes |
| **CTR-05** | `addons_inertia.json` (`props.packages`) | `addons_inertia.json` (`props.addOns`) | `props.packages` contains 332 entries; `props.addOns` contains 326 entries | 13 packages in `props.packages` are core ERP/admin modules; 2 tiles are duplicates | Counts represent different layers (raw packages vs marketplace display tiles) | Document exact reconciliation: 332 raw = 13 core + 319 pkgs (326 tiles = 324 unique + 2 dupes) |
| **CTR-06** | `30-COMPLETE-QUEUE-AND-BACKGROUND-JOBS.md` | `server/src/index.ts` & `server/src/cron/` | Doc 30 claims 7 background cron workers actively scheduled | Only 3 crons are scheduled in `index.ts`; 3 are manual triggers, 1 is orphaned | 7 files exist on disk, but continuous background runtime is limited to 3 | Reconcile active runtime crons (3) vs on-demand modules (3) vs orphaned (1) |
| **CTR-07** | `34-PLAYWRIGHT-E2E-VERIFICATION-REGISTER.md` | `evidence/screenshots/` & test dirs | Doc 34 claims 8 E2E test suites executed (PW-01 to PW-08); cites 7 PNGs | No `.spec.ts` files exist; `screenshots/super_admin_dashboard.png` is missing | Suites were interactive MCP browser sessions, not executable code test suites | Classify PW-01..08 as Category A/B/C browser sessions; record missing screenshot |
| **CTR-08** | `13-PAYMENT-GATEWAY-CALLBACK-FLOW.md` | `server/src/routes/payments.routes.ts` | Historical docs imply 58 payment gateway adapters exist in MASTERHRMS | `payments.routes.ts` natively implements Razorpay only; other gateways absent | 58 gateways are WorkDo marketplace add-ons; MASTERHRMS has 1 native gateway | Clarify that 58 gateways exist in reference catalog; MASTERHRMS implements Razorpay |
| **CTR-09** | `03-SUPER-ADMIN-SETTINGS-DEEP-DIVE.md` | `server/src/services/factories/mailer.factory.ts` | Doc 03 asserts 27 discrete email transport drivers are implemented | Code implements NodeMailer with SMTP pool; 27 providers are WorkDo UI presets | WorkDo defines 27 host presets; MASTERHRMS connects to any SMTP via unified pool | Reconcile WorkDo UI presets with MASTERHRMS centralized MailerFactory |
| **CTR-10** | `35-FINAL-ENTERPRISE-REPORT.md` (Table 1) | `src/routes/` & `src/nav/registry.ts` | Doc 35 claims 220 live menu nodes vs 134 typed file-based routes | 220 is WorkDo sidebar count; MASTERHRMS has 210 nav items and 545 routes | 134 was a snapshot of `hr-sidebar.ts` (130 routes); total frontend is 545 routes | Disambiguate WorkDo reference menus (220) from MASTERHRMS navigation items (210) |
| **CTR-11** | `functions/core-hr/full-final-fnf-settlement-relieving-code.md` | `server/src/routes/offboarding.routes.ts` | Line citation claims settlement logic is at `offboarding.routes.ts line 160` | Line 160 is an error catch block for GET exit; settlement logic is lines 296-353 | Author recorded line number from error handler rather than handler definition | Correct line reference to lines 296-353 in authoritative v2 documentation |
