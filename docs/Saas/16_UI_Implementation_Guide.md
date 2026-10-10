# 16. UI Implementation Guide (all portals, add-ons and platform flows)

Planning document. It defines how every screen is built so that API, DB, realtime and UI always ship together. Companion files: `17_Platform_Operations_Flows.md` (flow-level UI, API, DB), `18_Addon_Routing_and_Implementation_Playbook.md` (add-on prefixes and slice template), `15_Settings_Realtime_ZeroMock_CRUD_Completion_Plan.md` (settings UI and zero-mock), `hrms-plan/01` and `02` (HR and Employee pages).

Stack: React + TypeScript + Vite, TanStack Router (file-based) and Query, Tailwind with shadcn components, Socket.io client.

---

## 1. Principles

1. **Server is the authority; UI renders what the server allows** (`allowedActions[]`, entitlement and permission flags).
2. **Every screen has five states:** loading (skeleton), empty, error (with retry and request id), forbidden (403), locked (not entitled, with upgrade call to action).
3. **Live by default:** data screens subscribe to realtime events and refresh without reload.
4. **No literal strings, no hardcoded data:** text through i18n keys, formats through settings utilities, lists through master data.
5. **One component per job:** list engine, form engine, detail engine, settings engine, uploader, picker; features compose them.
6. **Responsive and accessible from the first commit** (360 px up, keyboard, screen reader, dark mode).

---

## 2. Folder and naming structure

```
src/
  routes/                        thin route files only (declare route, guard, load, render feature)
    _authenticated/
      hr/ me/ tenant/ super/ client/ crm/ accounts/ pos/ inventory/ projects/ support/ it/
      {addon-slug}/              one folder per add-on prefix (route.tsx layout + pages)
  features/{module-or-addon}/    pages, components, hooks, api client, schemas, i18n namespace
  components/
    ui/                          design-system primitives (button, input, dialog, table, tabs, toast ...)
    app/                         shell pieces (AppLauncher, Sidebar, Topbar, LanguageSwitcher, NotificationBell,
                                 PortalSwitcher, ImpersonationBanner, MaintenanceBanner, CommandPalette)
    data/                        ListEngine, FormEngine, DetailEngine, SettingsSection, ProviderCard, StatusBadge,
                                 SecretField, CopyField, ImageUploader, MediaPicker, StateViews (Empty/Error/Locked)
  nav/registry.ts                Navigation Registry (menus as data, built from manifests)
  lib/
    api/                         typed client, error mapper, idempotency, interceptors
    realtime/                    socket client, event bus, query invalidation map
    i18n/                        i18n setup, namespace loader, formatters
    settings/                    useAppConfig, useSettings, formatters from settings
    auth/                        session, portals, permissions, entitlements, <Can>, <Entitled>
    routes.ts                    typed path constants (only place URLs are written)
```

Rules: a route file is under ~40 lines; features never import from other features (shared code goes to `components` or `lib`); add-on code is lazy-loaded per prefix.

---

## 3. Application shell

| Piece | Behavior |
|---|---|
| **Workspace bootstrap** | Root route loads `/public/app-config` (host-based tenant): branding, locale defaults, enabled login providers, maintenance, languages; then session and `/me/entitlements` after login |
| **App Launcher (9-dot)** | Grid of entitled apps and add-ons with icons; locked ones greyed with "Add-on" chip linking to the marketplace detail; search; recents |
| **Portal switcher** | Tenant, HR, Employee (and any app the user has) with remembered last choice |
| **Sidebar** | Rendered from the Navigation Registry for the **active prefix only**; collapsible groups; active highlight from the route; badges from realtime counters; mini-rail on tablet; drawer on phone |
| **Topbar** | App launcher, breadcrumb, global search / command palette, **language switcher**, notification bell, theme toggle, user menu (profile, preferences, sessions, sign out), workspace name and logo |
| **Banners** (stacked at top) | Impersonation banner (red, timer, Exit), maintenance countdown, critical broadcast, trial/payment-due notice, sandbox-mode notice, offline/reconnecting indicator |
| **Layout variants** | Dashboard grid, list-detail, full-width table, wizard, settings shell, kanban, calendar, document editor |
| **Error boundary** | Per route; shows friendly error with request id and "report" button that opens a support ticket prefilled |

---

## 4. Page templates

| Template | Used for | Includes |
|---|---|---|
| **List** | Masters, records, requests | Search, filters (URL state), saved views, column chooser, bulk actions, pagination (server), export, row actions from `allowedActions`, "N new updates" chip on realtime events |
| **Detail** | Records | Header with status chip and actions, tabs, timeline (history + comments), related records, attachments, audit link |
| **Form** | Create/edit | Schema validation shared with backend, inline errors, draft autosave for long forms, dirty guard, attachment uploader, custom fields, i18n labels |
| **Wizard** | Employee creation, onboarding, checkout | Steps with validation, progress, save and resume |
| **Settings** | All settings groups | Section-level save bar, status badges, Test buttons, secret fields, live preview, history tab |
| **Dashboard** | Per portal | Widget grid, each widget has own query, states, filters, drag-reorder (per user), responsive reflow |
| **Kanban** | Pipelines, tasks, tickets | Drag and drop with optimistic move and server confirm, realtime card moves |
| **Calendar/Roster** | Calendar, shifts, leave, meetings | Layers, drag to reschedule where allowed |
| **Report** | Analytics, registers | Parameters, run as job, progress, export Excel/PDF |
| **Editor** | Documents, strategy canvases, templates | Rich text and variable picker, versions, comments |

---

## 5. Data layer conventions

- **TanStack Query keys:** `[module, resource, scope, params]`, for example `['leave','applications','me',{status}]`; single `queryKeys.ts` per feature.
- **Mutations:** optimistic only for safe actions (mark read, toggle, drag); others wait for server; idempotency key on create/action; errors mapped from `{code, params}` to localized messages (never raw server text).
- **Realtime invalidation map** (`lib/realtime/invalidation.ts`): event type -> query keys, for example `leave.application.status_changed` -> `['leave','applications']`, `['approvals']`, `['dashboard']`. Adding an event means adding one line here.
- **Event handling:** dedupe by `eventId`; on reconnect call catch-up endpoint, or invalidate active queries if the gap is large; show "reconnecting" indicator.
- **Entitlements and permissions:** `useEntitlement('crm')`, `<Entitled key="biometric-sync" fallback={<LockedView/>}>`, `<Can perm="hr.leave.application.approve">`; both read from the session payload, which refreshes on `entitlement.changed` and `permissions.changed`.
- **Formatting:** `formatDate`, `formatTime`, `formatMoney`, `formatNumber` from settings and locale; no direct `toLocaleString` or literal symbols in components.
- **Files:** one uploader/picker; resources store `mediaId`; private files via signed URLs.

---

## 6. States and feedback

| State | UI |
|---|---|
| Loading | Skeletons matching layout (never a blank page or spinner-only) |
| Empty | Illustration, one-line explanation, primary action (create/import), link to docs |
| Error | Message from error code, retry, request id, "contact support" prefilled |
| Forbidden | "You don't have access" with the missing permission name for admins, link back |
| Locked | Product/add-on name, what it does, price from, **Start trial / Add to cart / Ask admin** depending on role |
| Offline/realtime down | Subtle top indicator; polling fallback for critical widgets |
| Success | Toast with undo where possible |
| Destructive | Confirm dialog with typed confirmation for irreversible actions (restore, delete tenant data) |

---

## 7. Responsive and accessibility rules

- Breakpoints: 360, 640, 768, 1024, 1280, 1536. Mobile-first CSS.
- No horizontal page scroll; wide tables scroll inside containers or switch to card rows below 640 px.
- Touch targets at least 44 px; sticky action bars on mobile forms.
- Charts resize and simplify on small screens; tooltips accessible by tap.
- Keyboard: all actions reachable, visible focus, dialogs trap focus, escape closes; sidebar and menus follow ARIA patterns.
- Color contrast checked on theme accent color (auto-warn in branding settings); dark mode tokens; reduced-motion respected.
- Direction-aware (LTR/RTL) with logical CSS properties so Arabic can be added without rework.

---

## 8. Internationalization in UI (summary; full flow in file 17 section 9)

- Every visible string through `t('namespace:key')`; ESLint rule blocks literal strings in JSX in CI.
- Namespaces per feature (`common`, `hr`, `me`, `crm`, add-on slug); lazy-loaded with version hash; bundles refresh on `locale.updated`.
- **Language switcher** in the topbar of every portal, on the public site, and on login/signup pages; saves to the user profile (or cookie when logged out).
- Dates, numbers, currency via `Intl` plus tenant settings; plurals via ICU.
- Layouts tolerate 40% longer text; no fixed-width labels; icons never carry text.

---

## 9. Platform flow screens (UI inventory)

| Flow | Screens (route) | Key components |
|---|---|---|
| Impersonation | `/super/tenants/:id` (Impersonate dialog), `/super/impersonations` (active and history), `/tenant/settings/support-access` (tenant policy and sessions), banner in every portal | `ImpersonationDialog`, `ImpersonationBanner`, `ActiveSessionsTable` |
| Banned IPs | `/super/security/ip-bans`, `/tenant/settings/security/ip-rules` | `IpRuleTable`, `CheckIpTool`, `AutoBanRulesForm` |
| Scheduled jobs | `/super/system/jobs`, `/tenant/settings/jobs` | `JobsTable` (live), `JobRunDrawer`, `CronEditor` |
| Backup and restore | `/super/system/backups`, `/tenant/data/backups` (also `/backup-restore/*`) | `BackupPolicyForm`, `BackupList`, `RestoreWizard`, `ProgressPanel` |
| Support tickets | `/me/helpdesk`, `/support/*` (agents), `/tenant/support` (to platform), `/super/support` | `TicketList`, `TicketThread`, `SlaBadge`, `EscalateDialog` |
| Broadcasts | `/super/broadcasts`, `/tenant/broadcasts` (and HR announcements), user banner/inbox | `BroadcastComposer`, `AudiencePicker`, `DeliveryStats` |
| Email templates | `/super/email-templates`, `/tenant/settings/email-templates` | `TemplateEditor`, `VariablePicker`, `DiffView`, `UpgradeBanner` |
| Platform analytics | `/super/analytics/*` | `KpiCard`, `CohortChart`, `FunnelChart`, `TenantHealthTable` |
| Localization | `/super/localization`, `/tenant/settings/localization`, language switcher | `TranslationEditor`, `MissingKeysPanel`, `ImportExport` |
| Add-on shells | `/{addon-slug}/*` | Standard add-on layout (section 10) |

Detailed fields, actions and realtime behavior for each are in file 17.

---

## 10. Standard add-on layout (every `/{addon-slug}/*`)

1. **Layout route** `routes/_authenticated/{slug}/route.tsx`: guard (auth, entitlement key from manifest, permission), lazy chunk, sidebar from the manifest's `provides.nav`, breadcrumb root = add-on name, locked state redirects to `/addons/{slug}` in the marketplace.
2. **Pages** from the engine template (file 18 section 4): Overview dashboard, main list/detail pages, Settings (group `addon.{slug}`), Activity/Logs.
3. **Settings** appear inside the add-on and in Tenant Settings under Integrations/Add-ons, driven by the registry.
4. **Realtime:** the add-on declares events; the invalidation map is generated from the manifest.
5. **i18n namespace** named after the slug; **permissions** `{slug}.{resource}.{action}`.

---

## 11. Performance rules

Code-split per portal and add-on; prefetch on hover for sidebar links; virtualize long lists; debounce search; cache lookups; limit initial payload by splitting dashboard widgets; images lazy-loaded with size hints; Lighthouse budget per portal (LCP under 2.5 s on a mid phone).

---

## 12. UI testing and Definition of Done

Each page is done when: route and menu registered; five states implemented; permission, entitlement and tenant checks verified; i18n keys present (no literal strings); responsive check at 360 and 1280; accessibility check (axe, keyboard); realtime update verified in a second browser; zero mock data; unit tests for hooks/forms; Playwright e2e for the main path; visual snapshot for key screens.

CI gates: literal-string lint, denylist grep for mock/dummy, accessibility smoke, bundle-size budget, e2e smoke per portal.

---

## 13. Build order for the UI work

1. Shell pieces (launcher, sidebar from registry, topbar, banners, language switcher, state views).
2. Engines (list, form, detail, settings, uploader) and realtime invalidation map.
3. i18n foundation and string extraction codemod (file 17 section 9).
4. Platform flow screens (section 9) in the order of file 17.
5. Add-on shells by engine (file 18), starting with Wave 1.
6. Per-portal dashboards and CRUD gap closure (file 15 sections 6 and 8).
