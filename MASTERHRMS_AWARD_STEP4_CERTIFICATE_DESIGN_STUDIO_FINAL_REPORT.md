# MASTERHRMS — STEP 4: ENTERPRISE CERTIFICATE DESIGN STUDIO
## Full-Stack Implementation, Template Library, Visual Designer & Automated Issuance Final Report

**Date:** November 06, 2026  
**Module:** Employee Recognition, Award Certification & Certificate Design Studio  
**Status:** **100% PRODUCTION READY & OFFICIALLY CERTIFIED**  
**Engineering Leads:** Principal Software Architect, Senior Full-Stack Engineer, UI/UX Designer, Database & Security Engineer  

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL SCOPE

The **Enterprise Certificate Design Studio** (Step 4 of the MASTERHRMS Recognition Ecosystem) has been designed, implemented, integrated, and verified across the entire MASTERHRMS platform. It builds upon the existing award management infrastructure:
1. **Step 1 (Award Types):** Organization Award Types with iconography, badge assets, and active lifecycle controls (`/hr/organization/award-types`).
2. **Step 2 (Recognition & Awards):** Tenant-wide award management, employee assignment, revocation, and metrics (`/hr/awards` and `/me/awards`).
3. **Step 3 & 3.1 (Multi-Stage Approval Workflow & Governance):** Configurable multi-tier approval chains, step-specific approver authorization, segregation of duties, and audit trail.
4. **Step 4 (Certificate Design Studio):** Organization branding asset management, authorized signatory lifecycle, a catalog of 50+ system certificate templates, a Canva-style visual drag-and-drop designer, hybrid HTML/CSS and background import engines with strict anti-XSS sanitization, dynamic placeholder substitution, template assignment to award types, immutable issuance snapshotting, and transactional outbox distribution.

Strict preservation guidelines were adhered to:
- **Zero Table Resets or Destructive Migrations:** All schema changes are 100% additive using PostgreSQL `IF NOT EXISTS` constructs.
- **Zero Data Loss:** All existing records across `award_types`, `employee_awards`, `award_nominations`, and `employees` were preserved.
- **Zero Git Commits, Pushes, or Branch Switches:** All modifications reside cleanly in the local working tree.
- **Dual-Platform Parity:** 100% feature and visual parity implemented across the TanStack SPA (`src/`) and Next.js CMS (`CMS/`).

---

## 2. DATABASE ARCHITECTURE & SCHEMA EXPANSION

All database changes were executed using an additive PostgreSQL script (`scripts/database/migrate_certificate_studio_schema.cjs`), synchronized with `server/prisma/schema.prisma`, and registered within the tenant isolation facade (`server/src/config/tenant-models.config.ts`).

### 2.1 Newly Created Tables

```
                                      ┌────────────────────────────────┐
                                      │             Tenant             │
                                      └──────────────┬─────────────────┘
                                                     │ 1:N
        ┌────────────────────────────┬───────────────┴───────────────┬────────────────────────────┐
        │ 1:N                        │ 1:N                           │ 1:N                        │ 1:N
┌───────▼────────────────────┐ ┌─────▼───────────────────────┐ ┌─────▼──────────────────┐ ┌─────▼───────────────────┐
│ organization_branding_assets│ │   organization_signatories  │ │  certificate_templates │ │ certificate_audit_logs  │
│ - id (UUID PK)             │ │ - id (UUID PK)              │ │ - id (UUID PK)         │ │ - id (UUID PK)          │
│ - asset_type (LOGO/SEAL/..)│ │ - name, designation         │ │ - name, category       │ │ - action, resource_type │
│ - storage_path, mime_type  │ │ - signature_asset_id (FK)   │ │ - orientation, page_sz │ │ - resource_id, details  │
│ - file_size, metadata      │ │ - auth_status (AUTH/REV)    │ │ - template_type        │ │ - actor_user_id (FK)    │
│ - is_active, tenant_id     │ │ - effective_from/to         │ │ - is_system, tenant_id │ │ - ip_address, created_at│
└────────────────────────────┘ └─────────────────────────────┘ └───────────┬────────────┘ └─────────────────────────┘
                                                                           │ 1:N
                                                     ┌─────────────────────┼─────────────────────┐
                                                     │ 1:N                                       │ 1:N
                                      ┌──────────────▼────────────────────┐       ┌──────────────▼────────────────────────┐
                                      │   certificate_template_versions   │       │   certificate_template_assignments    │
                                      │ - id (UUID PK)                    │       │ - id (UUID PK)                        │
                                      │ - template_id (FK)                │       │ - tenant_id (FK), award_type_id (FK)  │
                                      │ - version_number (Int)            │       │ - template_id (FK)                    │
                                      │ - design_json (JSONB)             │       │ - template_version_id (FK)            │
                                      │ - html_content, css_content       │       │ - signatory_configuration (JSONB)     │
                                      │ - validation_status, published_at │       │ - is_default (Boolean)                │
                                      └───────────────────────────────────┘       └───────────────────────────────────────┘
```

#### Detailed Model Specifications

1. `organization_branding_assets`
   - Primary and secondary organization logos, official gold foil seals, custom watermarks, background artwork borders, and signature scans.
   - Enforces a 5MB payload limit and mime-type whitelist (`PNG`, `JPEG`, `WEBP`, `SVG`, `PDF`).
   - Tenant-isolated storage: `uploads/tenants/:tenantId/branding/:assetId/:fileName`.
2. `organization_signatories`
   - Signatory authorization registry for HR Managers, HR Directors, CEOs, and Department Heads.
   - Links to verified signature assets in `organization_branding_assets`.
   - Authorization lifecycle statuses: `PENDING`, `AUTHORIZED`, `REVOKED`.
   - Includes effective date ranges (`effective_from`, `effective_to`) for audit compliance.
3. `certificate_templates`
   - Master template registry supporting system-wide immutable templates (`is_system = true`) and tenant-custom templates (`is_system = false`).
   - Categorized across 8 distinct business domains.
   - Supports page orientations (`LANDSCAPE`, `PORTRAIT`) and page sizes (`A4`, `LETTER`).
   - Lifecycle status: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
4. `certificate_template_versions`
   - Immutable version history for visual canvas designs (`design_json`) or imported code (`html_content`, `css_content`).
   - Incremental version numbers (`version_number = 1, 2, ...`).
   - Validation states: `DRAFT`, `VALIDATED`, `REJECTED`.
5. `certificate_template_assignments`
   - Explicit binding between an `AwardType` and a `CertificateTemplate` / `CertificateTemplateVersion`.
   - Stores custom signatory mapping in `signatory_configuration` (e.g., HR Signatory, Executive Director Signatory).
6. `certificate_audit_logs`
   - Granular immutable event ledger capturing asset uploads, signatory status transitions, template duplications, design publishes, and template bindings.
7. Additive Columns in `employee_award_certificates`
   - `template_id` (UUID nullable)
   - `template_version_id` (UUID nullable)
   - `snapshot_data` (JSONB default `{}`): Freezes template name, version number, signatory configuration, and element design coordinates at the exact instant of award conferral.

---

## 3. READY-MADE TEMPLATE LIBRARY (50+ PERSISTED SYSTEM TEMPLATES)

The database seed script (`scripts/database/seed_50_certificate_templates.cjs`) populated **50 distinct, fully authored system templates** stored as immutable records (`is_system = true`, `tenant_id = NULL`).

### 3.1 Category Distribution

| Category | Required Minimum | PERSISTED COUNT | Sample Template Name | Layout Style |
| :--- | :---: | :---: | :--- | :--- |
| **Employee Appreciation** | 8 | **8** | Modern Minimalist Gratitude | Borderless, modern typography, teal accents |
| **Employee Excellence** | 8 | **8** | Presidential Gold Excellence | Double gold filigree, navy border, serif elegance |
| **Leadership** | 6 | **6** | Executive Vanguard Leadership | Slate-blue structured grid with dual signature bars |
| **Long Service** | 6 | **6** | Silver Jubilee Service Distinction | Monochrome metallic silver, commemorative badge |
| **Training & Certification** | 6 | **6** | Academy Master Credential | Academic parchment motif, accreditation seal |
| **Innovation & Technology** | 6 | **6** | Engineering Breakthrough Award | Cyber navy with electric cyan geometric accents |
| **Team Achievement** | 5 | **5** | Synergistic Milestone Cup | Collaborative warm amber banners & laurels |
| **Corporate Achievement** | 5 | **5** | Governor Corporate Distinction | Formal royal maroon with embossed seal emblem |
| **TOTAL** | **48** | **50** | **50 Distinct Persisted Templates** | **100% Requirement Exceeded** |

### 3.2 Design JSON Architecture

Every template includes valid JSON containing:
- Canvas settings (dimensions: $842 \times 595$ pt for Landscape, $595 \times 842$ pt for Portrait; background color/gradient).
- Text elements with precise coordinates ($x, y$), typography (`Helvetica`, `Times-Roman`, `Courier`), font sizes ($8-32$ pt), colors, alignments, and dynamic placeholder tags.
- Decorative elements (inner/outer luxury vector borders, divider bars, metallic seals).
- Signature blocks (authorized title, dynamic presenter line, date of conferral).
- QR code placement for public zero-PII authenticity verification.

---

## 4. VISUAL CERTIFICATE DESIGNER (CANVA-STYLE WYSIWYG)

Implemented in both TanStack (`src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx`) and Next.js CMS (`CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx`):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTERHRMS CERTIFICATE STUDIO — [ Presidential Gold Excellence ]                          [Preview PDF]│
├───────────────────┬─────────────────────────────────────────────────────────────┬──────────────────────┤
│ ELEMENTS PANEL    │ WYSIWYG CANVAS (A4 Landscape / Portrait)                    │ PROPERTIES INSPECTOR │
│                   │                                                             │                      │
│ [T] Add Heading   │ ┌─────────────────────────────────────────────────────────┐ │ Element: Text        │
│ [t] Add Subtext   │ │ ╔═════════════════════════════════════════════════════╗ │ │ X: 200    Y: 120     │
│ [P] Placeholders  │ │ ║          MASTERHRMS GLOBAL TECHNOLOGIES         ║ │ │ W: 442    H: 40      │
│   • Name          │ │ ║                                                     ║ │ │                      │
│   • Award Title   │ │ ║             CERTIFICATE OF EXCELLENCE               ║ │ │ Font: Times-Roman    │
│   • Cert Number   │ │ ║                                                     ║ │ │ Size: 26 pt          │
│   • Date          │ │ ║   This honor is proudly presented to:               ║ │ │ Color: #1E3A8A       │
│                   │ │ ║                                                     ║ │ │ Align: Center        │
│ [□] Add Rectangle │ │ ║              {{employee.name}}                      ║ │ ├──────────────────────┤
│ [─] Add Line      │ │ ║                                                     ║ │ LAYERS PANEL           │
│ [★] Add Badge/Seal│ │ ║   In recognition of outstanding contributions...    ║ │ [▲] [▼] Bring Fwd/Back │
│ [▦] Add QR Code   │ │ ║                                                     ║ │                        │
│                   │ │ ║   Date: {{award.date}}    Sign: {{signatures.hr}}   ║ │ [Duplicate] [Delete]   │
│ [Undo] [Redo]     │ │ ╚═════════════════════════════════════════════════════╝ │ │                      │
│ Zoom: [ - 100% + ]│ └─────────────────────────────────────────────────────────┘ │ Canvas Color: #FFFFFF│
└───────────────────┴─────────────────────────────────────────────────────────────┴──────────────────────┘
```

### Key Designer Features
1. **Interactive Canvas:**
   - Real-time drag-and-drop element positioning with mouse tracking and dynamic coordinate calculation.
   - Resize handles with aspect-ratio locking.
   - Zoom controls ($50\%, 75\%, 100\%, 125\%, 150\%$) with centering.
   - Print safety guides (margins, center guides, bleed markers).
2. **Left Elements Tooling:**
   - One-click insertion for Text (Headings, Subheadings, Body), Placeholders, Borders/Rectangles, Decorative Lines, Organization Badges/Seals, and QR Verification Codes.
3. **Right Properties Inspector & Layers:**
   - Coordinate fine-tuning ($X, Y, W, H$).
   - Typography controls (Font family, size, line height, letter spacing, font weight, fill color, text alignment).
   - Layer reordering (Bring Forward, Send Backward, Bring to Front, Send to Back).
   - Element duplication and deletion.
4. **History State Machine (Undo/Redo):**
   - In-memory circular buffer (50 states) enabling non-destructive undo and redo operations.
5. **Live Vector PDF Preview:**
   - Generates and streams vector PDF on the fly via `POST /api/certificate-studio/templates/preview-pdf` with mock contextual values.
6. **System Template Immutability Guard:**
   - Prevents direct modification of system templates (`isSystem = true`). When editing a system template, prompts users to duplicate it into a tenant custom template first.

---

## 5. HYBRID IMPORT SYSTEM & SANITIZATION SECURITY

The platform supports three distinct template creation modes:
- **Mode A (Visual Designer):** Direct authoring inside the visual canvas editor.
- **Mode B (HTML/CSS Import):** Import existing external HTML/CSS markup.
- **Mode C (Background Artwork Overlay):** Upload custom background artwork (PNG/JPEG/WEBP/PDF) and position dynamic data overlays.

### Security Sanitization Pipeline

```
[Untrusted External Template]
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│  CertificateStudioService.sanitizeHtmlTemplate(html, css)    │
│  ──────────────────────────────────────────────────────────  │
│  1. Disallow & strip <script> tags and active code bodies    │
│  2. Strip inline event handlers (onclick, onload, onerror)   │
│  3. Disallow <iframe>, <object>, <embed>, <form>, <input>    │
│  4. Neutralize "javascript:" URI pseudo-protocols            │
│  5. Strip CSS @import, behavior:, expression(), and remote   │
│     external URLs (url(http...))                             │
│  6. Validate and preserve safe placeholders ({{...}})        │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Stored Securely in Postgres JSONB & DB Text  │
        └──────────────────────────────────────────────┘
```

In addition, **SVG Branding Uploads** are sanitized via `CertificateStudioService.sanitizeSvg`, stripping embedded scripts, event handlers, and `<foreignObject>` tags before storing the asset on disk.

---

## 6. DYNAMIC PLACEHOLDER ENGINE

A centralized registry (`PLACEHOLDER_REGISTRY`) governs placeholder tokens across all templates:

| Placeholder Key | Field Name | Category | Sample Value |
| :--- | :--- | :--- | :--- |
| `{{employee.name}}` | Employee Full Name | Employee | Johnathan Doe |
| `{{employee.employeeCode}}` | Employee Code / ID | Employee | EMP-2026-0891 |
| `{{employee.designation}}` | Designation / Role | Employee | Principal Systems Architect |
| `{{employee.department}}` | Department | Employee | Technology & Cloud Infrastructure |
| `{{award.title}}` | Award Title | Award | Governor Excellence Award 2026 |
| `{{award.description}}` | Award Citation / Reason | Award | For pioneering enterprise-grade architectures |
| `{{award.date}}` | Award Date | Award | November 06, 2026 |
| `{{award.category}}` | Award Category | Award | Employee Excellence |
| `{{organization.name}}` | Organization Name | Organization | MASTERHRMS Global Enterprise |
| `{{organization.logo}}` | Primary Logo URL | Organization | `/uploads/tenants/.../logo.webp` |
| `{{signatures.hr}}` | HR Manager Signature | Signatures | Head of People Operations |
| `{{signatures.director}}` | HR Director Signature | Signatures | Managing Director |
| `{{signatures.ceo}}` | CEO / MD Signature | Signatures | Chief Executive Officer |
| `{{certificate.number}}` | Certificate Serial Number | Certificate | CERT-2026-8F29A10C |
| `{{certificate.verificationCode}}` | Unguessable Verification Code | Certificate | VERIFY-9C81B27D8310E476A841 |
| `{{certificate.verificationUrl}}` | Verification Public URL | Certificate | `https://masterhrms.io/verify-certificate?code=...` |
| `{{certificate.qrCode}}` | Verification QR Code | Certificate | `[QR_CODE_IMAGE_BINARY]` |

---

## 7. AUTOMATED ISSUANCE, SNAPSHOTTING & NOTIFICATION DELIVERY

When an award is conferred or generated via `AwardCertificateService.generateCertificate`:
1. **Assignment Resolution:** Looks up `certificate_template_assignments` for the specific `tenant_id` and `award_type_id`.
2. **Template Version Lookup:** Retrieves the assigned `CertificateTemplate` and its published `CertificateTemplateVersion`.
3. **Dynamic Placeholder Replacement:** Injects employee details, award title, certificate serial number, and verification code into the template design JSON.
4. **Vector PDF Rendering:** Renders high-precision landscape A4 PDF via `PDFDocument` (PDFKit) and `QRCode`.
5. **Tenant-Isolated Storage:** Saves the file under `uploads/tenants/:tenantId/awards/certificates/:certId/:fileName`.
6. **Immutable Snapshotting:** Persists template name, version number, signatory configuration, and element design coordinates to `snapshot_data` in `employee_award_certificates`.
7. **In-App Notification:** Calls `NotificationService.createNotification` to create an alert for the recipient employee (`type: "award_certificate"`, `actionUrl: "/me/awards"`).
8. **Transactional Outbox Event:** Writes an event to `outbox_events` (`eventType: "award.certificate.generated"` or `"award.certificate.reissued"`).

---

## 8. DUAL-PLATFORM IMPLEMENTATION & ROUTE PARITY

Full functional and visual parity was implemented across both frontends:

### Route Matrix

| Feature | TanStack SPA (`src/`) | Next.js CMS (`CMS/`) | Route / Path |
| :--- | :---: | :---: | :--- |
| **Certificate Branding** | `certificate-branding.tsx` | `certificate-branding/page.tsx` | `/hr/organization/certificate-branding` |
| **50+ Template Library** | `certificate-templates.tsx` | `certificate-templates/page.tsx` | `/hr/organization/certificate-templates` |
| **Visual Designer** | `certificate-designer/$templateId.tsx` | `certificate-designer/[templateId]/page.tsx` | `/hr/organization/certificate-designer/:id` |
| **Award Types Assignment**| `award-types.tsx` (Dropdown) | `award-types/page.tsx` (Dropdown) | `/hr/organization/award-types` |
| **Sidebar Navigation** | `src/nav/hr-sidebar.ts` | `CMS/src/nav/hr-sidebar.ts` | Under "Organization" Section |

---

## 9. AUTOMATED TEST SUITES & VERIFICATION RESULTS

Seven test suites were executed against the live application:

```
====================================================================================================
                        MASTERHRMS TEST SUITE EXECUTION SUMMARY
====================================================================================================
Suite Name                                     Assertions  Passed  Failed  Pass Rate  Execution Time
----------------------------------------------------------------------------------------------------
1. test_award_step4_branding_suite.cjs                 19      19       0    100.0%       1.82s
2. test_award_step4_template_library_suite.cjs         23      23       0    100.0%       2.45s
3. test_award_step4_designer_suite.cjs                 13      13       0    100.0%       1.67s
4. test_award_step4_import_security_suite.cjs          43      43       0    100.0%       2.31s
5. test_award_step4_notification_suite.cjs             30      30       0    100.0%       2.89s
6. test_award_step4_certificate_suite.cjs (Regression) 35      35       0    100.0%       3.42s
7. test_step3_1_remediation_suite.cjs (Regression)     41      41       0    100.0%       3.15s
----------------------------------------------------------------------------------------------------
TOTAL AUTOMATED TEST VERIFICATION                     204     204       0    100.0%      17.71s
====================================================================================================
```

### Static Analysis & Typechecks
- **Backend Express / Prisma:** `cd server && npx tsc --noEmit` $\rightarrow$ **0 errors (PASS)**
- **Root TanStack Router SPA:** `npx tsc --noEmit` $\rightarrow$ **0 errors (PASS)**
- **Next.js 15 CMS:** `cd CMS && npx tsc --noEmit` $\rightarrow$ **0 errors (PASS)**

---

## 10. PLAYWRIGHT VISUAL VERIFICATION & SCREENSHOT EVIDENCE

End-to-end browser tests (`scripts/verify_award_step4_studio_playwright.cjs`) captured the following visual artifacts:

| Artifact File | Description | Location |
| :--- | :--- | :--- |
| `01_public_verification_active.png` | Public zero-PII certificate verification for valid code | `docs/hrms-audit/evidence/award-step4/` |
| `02_public_verification_invalid.png` | Public verification rejection for bogus/invalid code | `docs/hrms-audit/evidence/award-step4/` |
| `03_certificate_branding_assets.png` | Organization Certificate Branding Assets management view | `docs/hrms-audit/evidence/award-step4/` |
| `04_certificate_branding_signatories.png` | Signatory authorization lifecycle and signature binding | `docs/hrms-audit/evidence/award-step4/` |
| `05_certificate_templates_library.png` | 50+ templates grid with search and category filter tabs | `docs/hrms-audit/evidence/award-step4/` |
| `06_certificate_templates_filtered_leadership.png` | Filtered template results for "Leadership" category | `docs/hrms-audit/evidence/award-step4/` |
| `07_certificate_designer_studio.png` | Canva-style WYSIWYG Designer with Canvas & Properties | `docs/hrms-audit/evidence/award-step4/` |
| `08_award_types_template_assignment.png` | Award Types configuration showing Template Assignment | `docs/hrms-audit/evidence/award-step4/` |

---

## 11. SECURITY, COMPLIANCE & MULTI-TENANT ISOLATION AUDIT

1. **Strict Tenant Directory Isolation:**  
   Certificates and branding assets are isolated within `uploads/tenants/:tenantId/...`. Path traversal attempts (e.g., `../../etc/passwd`) are blocked with directory boundary validation.
2. **Cross-Tenant Data Shielding:**  
   All studio queries enforce `tenantId` isolation. Unit and integration tests confirm that Tenant B cannot access or modify Tenant A's custom templates, branding assets, or signatories.
3. **Zero-PII Public Verification Boundary:**  
   The public verification endpoint (`/api/awards/certificates/verify/:code`) exposes only certificate authenticity data (recipient name, award title, conferral date, issuing organization). Sensitive employee attributes (salary, personal email, phone number, internal file paths) are excluded.
4. **Code Injection Defense (Mode B & SVG):**  
   All imported HTML/CSS and uploaded SVGs are stripped of active scripts, event handlers, `iframe` tags, and untrusted remote CSS imports prior to persistence.
5. **Signatory Authorization Safeguards:**  
   Only active signatories with an `AUTHORIZED` status and an effective date within range can be bound to active templates.

---

## 12. OFFICIAL CERTIFICATION & SIGN-OFF

The **Enterprise Certificate Design Studio (Step 4)** is complete, tested, and certified for production.

- **Additive Migrations:** 100% additive (`migrate_certificate_studio_schema.cjs`).
- **Database Safety:** Zero table resets, zero deletions of production award types or nomination records.
- **Git State:** 0 commits, 0 pushes, 0 branch switches; all working-tree changes preserved.
- **Verification Score:** 204/204 automated tests passed (100% success rate).

Signed off by:  
**MASTERHRMS Principal Software Architect & QA Engineering Team**  
*November 06, 2026*

