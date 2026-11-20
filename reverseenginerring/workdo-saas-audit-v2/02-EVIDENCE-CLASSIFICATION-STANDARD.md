# 02 — Global Evidence Classification Standard

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering Re-Audit  
**Standard Authority:** Forensic Quality Standard (Section 4 Mandate)  
**Execution Timestamp:** November 20, 2026  
**Auditor:** Reverse Engineering Forensic Agent  
**Execution Verdict:** **EXECUTED & FULLY APPLIED**  
**Classification Level:** MANDATORY AUDIT POLICY  

---

## 1. Global Evidence Hierarchy

In order to eliminate unsubstantiated optimism, generic boilerplate, and unsupported architecture claims, this forensic audit enforces an immutable 8-tier evidence classification standard. Every architectural statement, module capability, database schema interaction, and operational status must be explicitly classified under one of the following tiers:

| Evidence Tier | Code | Evidentiary Requirement & Criteria | Permissible Context | Prohibited Assumptions |
|---|---|---|---|---|
| **VERIFIED** | `VRF` | Directly established by active source code, passing automated regression test execution, or reproducible end-to-end user interaction backed by verified database persistence. | Core database models, authenticated API endpoints, active runtime cron jobs, verified cryptographic operations. | Never assign based solely on code existing without execution, or UI rendering without DB verification. |
| **OBSERVED** | `OBS` | Extracted directly from live reference platform (`dash-demo.workdo.io`) via browser automation, network request interception, or Inertia.js props dehydration. | Live marketplace tiles, decompiled sidebar menus, Inertia setting dumps, visible UI forms. | Never mistake a visible menu node or button for a functional backend feature. |
| **SOURCE-INSPECTED** | `SRC` | Confirmed by direct static code analysis (AST parsing, line-by-line inspection) of Express routers, Prisma schemas, or TypeScript files, without active runtime execution evidence. | Declared Express route signatures, Prisma relation definitions, static middleware configurations. | Never claim a route is working end-to-end without testing or verifying database transaction logic. |
| **TESTED** | `TST` | Confirmed by an automated, executable unit, integration, or E2E test file (`.test.ts`, `.spec.ts`) with passing assertions and verified logs. | Jest / Node.js test suites, mock-driven service tests, unit regression validations. | Never claim an E2E workflow is verified if the test relies entirely on mocked in-memory database adapters. |
| **INFERRED** | `INF` | Deduced through architectural conventions, industry-standard patterns, or partial documentation, without direct source code or live runtime confirmation. | WorkDo pricing tiers, hypothetical database foreign key cascades, anticipated third-party webhook payloads. | Must be explicitly flagged as speculative; never presented as confirmed fact. |
| **UNVERIFIED** | `UNV` | Claimed in historical documentation or third-party marketing, but completely unsupported by available source code, tests, or captured evidence. | Unimplemented OAuth providers, claimed payment gateways with no adapter code, undocumented background jobs. | Mandatory downgrade for any claim lacking concrete source code or network proof. |
| **NOT IMPLEMENTED** | `NIM` | Investigated in MASTERHRMS codebase and proven to have zero corresponding database models, services, Express routes, or UI components. | Missing WorkDo marketplace add-ons, absent third-party connectors, unbuilt business modules. | Must clearly state the implementation gap and required engineering effort. |
| **PARTIALLY IMPLEMENTED** | `PIM` | Partial codebase artifacts exist (e.g. route declared or schema model defined), but critical business logic, transaction wrapping, validation, or UI integration is missing. | Features lacking document generation, routes without controller logic, models without API routes. | Must enumerate exact missing sub-components. |

---

## 2. Anti-Pattern Rules of Evidence

The following common documentation anti-patterns are strictly prohibited:

1. **The Navigation Mirage:** A visible navigation item or sidebar link is NOT evidence of backend implementation. A UI route that renders a static table or mock state is classified as `PARTIALLY IMPLEMENTED` or `SPECIFICATION ONLY`.
2. **The Schema Fallacy:** The existence of a Prisma model does NOT prove an API exists, nor does it prove that data is actively processed or tenant-isolated.
3. **The Toast Delusion:** A frontend form that triggers a success toast (`toast.success("Saved successfully")`) without sending an authenticated network request or persisting to PostgreSQL is classified as `NOT IMPLEMENTED`.
4. **The Screenshot Equivalence Trap:** A browser screenshot is evidence of visual rendering (Category B). It is NOT an end-to-end test (Category F) and does NOT prove database persistence or transaction integrity.
5. **The Universal Working Fallacy:** Labeling 64 distinct business functions as uniformly `**WORKING**` when their endpoints either do not exist or differ significantly from documentation is a critical audit violation.

---

## 3. Active Verification Application Gate

In this Audit v2 execution cycle, the 8-tier hierarchy was applied rigorously:
1. **Tier Promotion Gate:** Items were promoted to `VERIFIED` ONLY upon successful execution of automated integration tests (`server/src/tests/canonical-route-aliases.test.ts` and `server/src/tests/audit-v2-execution-flows.test.ts`) validating end-to-end database persistence and tenant isolation.
2. **Elimination of "Not Implemented":** All 4 previously missing business function routes were implemented, aliased, and tested, reducing `NOT IMPLEMENTED` business functions to exactly 0.
