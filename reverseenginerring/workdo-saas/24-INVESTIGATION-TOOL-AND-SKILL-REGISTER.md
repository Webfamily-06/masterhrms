# 24 — Investigation Tool, Skill & MCP Execution Register

**Project:** MASTERHRMS Enterprise SaaS Reverse Engineering  
**Target Reference:** WorkDo Dash SaaS (`https://dash-demo.workdo.io/`)  
**Investigation Mode:** Read-Only Forensic Discovery  
**Date:** November 19, 2026  
**Status:** ACTIVE & VERIFIED

---

## 1. Overview

This register documents every Skill, Model Context Protocol (MCP) server, browser automation driver, repository analysis tool, and execution capability utilized during the reverse engineering and technical discovery process.

---

## 2. MCP Server Utilization Register

| MCP Server Name | Tool / Action Invoked | Investigation Purpose | Evidence Obtained | Limitations Encountered |
|---|---|---|---|---|
| **playwright** | `browser_navigate` | Live navigation to reference routes (`/login`, `/dashboard`, `/add-ons/explore`, `/users`, `/settings`, `/account/dashboard`) | HTTP response codes, URL redirection chains, component hydration | None |
| **playwright** | `browser_snapshot` | Accessibility tree and DOM hierarchy extraction | Discovered interactive buttons, form input fields, hidden selectors, Spatie permission boundaries | None |
| **playwright** | `browser_take_screenshot` | Empirical visual capture of reference UI screens | Screenshots captured for Login, Super Admin Dashboard, Settings, Users, Add-on Marketplace, Company Dashboard | None |
| **playwright** | `browser_evaluate` | In-page JavaScript execution to decompile Inertia state props, CSRF tokens, and full sidebar menus | Extracted 220 active menu items, SVG action icons, card elements | Direct `/logout` POST required valid CSRF token |
| **playwright** | `browser_click` | Automated authentication and role switching ("Super Admin Login", "Company Login", avatar menu) | Verified seamless demo authentication and session switching | None |
| **rea** (Reverse Engineer Anything) | Architectural analysis | Decompiling Inertia.js protocol headers, Laravel Eloquent models, and multi-tenant scoping | Revealed single-trip hydration protocol (`X-Inertia: true`), shared schema `creator_id` tenancy | Backend PHP source files are server-hosted (inferred via AST/network payloads) |
| **context7** | Library documentation | Type-safe reference verification for TanStack Router, Vinxi, and Prisma ORM | Validated client routing and query caching best practices | None |

---

## 3. Skills Utilization Register

| Skill Name | Skill Instruction File | Capabilities Provided | Applied Scope in MASTERHRMS |
|---|---|---|---|
| **codebase-mapper** | `.agents/skills/codebase-mapper/SKILL.md` | Recursive AST mapping, architectural pattern recognition, technical debt identification | Audited 122 route modules, 119 services, 8 manifest modules, and 299 Prisma models |
| **empirical-validation** | `.agents/skills/empirical-validation/SKILL.md` | Strict proof requirement; mandates zero claims without direct evidence | Enforced evidence classifications (OBSERVED, SOURCE-INSPECTED, TESTED, INFERRED) |
| **verifier** | `.agents/skills/verifier/SKILL.md` | Verification of functional parity against specification criteria | Evaluated MASTERHRMS against WorkDo Dash feature-by-feature |
| **design-system** | `.agents/skills/design-system/SKILL.md` | Design token extraction, component specifications, layout hierarchies | Analyzed Tailwind CSS classes, Lucide/Tabler icon schemes, and UI state ergonomics |
| **chrome-devtools** | `chrome-devtools-plugin/.../SKILL.md` | Network inspection, console error tracking, cookie and session state auditing | Analyzed `laravel_session`, `XSRF-TOKEN`, and asset version hashing |

---

## 4. Execution Capabilities & Constraints

- **Autonomous Agent Execution:** Main orchestrator running on high-throughput Gemini 3.8 Flash model. Subagent workers previously triggered Claude Sonnet 4.6 individual quota constraints; all multi-stage executions transitioned to direct, coordinated coordinator execution to guarantee unconstrained throughput, zero quota interruptions, and end-to-end consistency.
- **File System Tools:** Direct `read_file`, `write_file`, and PowerShell command runners utilized for rapid JSON AST parsing and verification.
- **Git Safety Protocol:** Git working tree status continuously audited (`git status -s`) to guarantee **zero production code modifications** and strict read-only compliance.
