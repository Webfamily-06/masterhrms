# 23. Add-on Placement and Order Matrix (HR `/hr/*`, Employee `/me/*`, Tenant `/tenant/*`, Public)

Planning document. **This file decides, before any implementation, where every page of every add-on lives and in what order things are built.** It supersedes the `/addons/{slug}/*` URLs written in files 18 and 20 to 22; the fields, CRUD, realtime, expiry and zero-mock rules in those files stay valid. Each add-on's pages are split by who uses them, following the role split in the guides where the guides state one, and our HR and Employee page specs where they do not.

Evidence legend used below: **[Guide]** the guide explicitly describes this role/side; **[Added]** not in the guide, placed by us from `hrms-plan/01` and `02` or by a reasonable assumption you can reverse.

---

## 1. Decision: path scheme (confirm Q-PL01)

```
HR / admin side      {workspace}.{BASE_DOMAIN}/hr/addons/{slug}/...
Employee side        {workspace}.{BASE_DOMAIN}/me/addons/{slug}/...
Tenant admin side    {workspace}.{BASE_DOMAIN}/tenant/addons/{slug}/...      (cross-cutting integrations only)
Public pages         {workspace}.{BASE_DOMAIN}/public/{slug}/...             (careers alias /careers)
```

Why this form: it keeps your existing portals (`/hr`, `/me`, `/tenant`), keeps the `/addons/{slug}` naming you asked for, prevents collisions with core HR and employee pages, and lets one add-on appear in both portals with different pages.

**Alternative (Option B):** `/hr/{slug}/*` and `/me/{slug}/*` without the `addons` segment (this matches your already built `/hr/recruitment`, `/me/recruitment`, `/hr/training`, `/me/performance`). The route tables below are generated from a manifest `portalRoutes` block, so switching is a one-line prefix change. **Default is Option A**; the agent keeps old URLs as redirects either way.

APIs mirror the scope (same service layer behind all):
```
Admin/org scope      /api/v1/addons/{slug}/*
Self scope           /api/v1/me/addons/{slug}/*          (employee derived from the token, never from input)
Manager/team scope   /api/v1/team/addons/{slug}/*
Public               /api/v1/public/{slug}/*
Desktop app          /api/v1/addons/time-tracker/app/*
```

Folder structure (TanStack file routes) and features:
```
src/routes/_authenticated/hr/addons/{slug}/...        thin route files (HR/admin pages)
src/routes/_authenticated/me/addons/{slug}/...        thin route files (employee pages)
src/routes/_authenticated/tenant/addons/{slug}/...    thin route files (tenant pages)
src/routes/public/{slug}/...                          public pages
src/features/addons/{slug}/{hr|me|tenant|shared}/     page components, hooks, api client, schemas, i18n namespace
```

---

## 2. Rules that apply to every placement

1. **One domain service, three scopes.** HR and ME pages call the same service; HR endpoints are organization-scoped, ME endpoints are self-scoped, team endpoints use the reporting line. No duplicated business logic.
2. **Portal access is not add-on access.** A page needs: authenticated, tenant host, add-on entitlement active (or the Renewal Block), the portal permission (`hr.*` or `me.*`), and the add-on permission (`{slug}.{resource}.{action}`, with self-scope permissions such as `me.addons.{slug}.view`).
3. **Tenant Admin** has every HR permission and can use `/hr/addons/*`; the Tenant portal only hosts cross-cutting add-ons (Webhook, AI Assistant settings).
4. **Sidebar is generated** from the manifest (`portalRoutes`, `sidebar.heading`, `sidebar.order`). An item appears only when the add-on is installed and the user has the page's view permission. Expired: lock badge, opens the Renewal Block page (admins: Renew; employees: Ask admin).
5. **Employees never see admin pages.** Direct URL to an HR page returns 403; HR users who are employees use `/me` for their own data.
6. **Legacy URLs redirect** (301) to the new location for at least two releases; slug history is kept.
7. **Same record, different pages:** HR page `.../models/:id` and ME page `.../models/:id` show the same record with scope-appropriate fields and actions (for example employees cannot see internal ratings or other people's records).
8. **Public pages** are unauthenticated, rate limited, themed from add-on settings, and show a neutral unavailable page when the add-on is expired.

---

## 3. Summary matrix: who gets which portal

| # | Add-on (slug) | HR `/hr/addons` | ME `/me/addons` | Tenant `/tenant/addons` | Public | Evidence |
|---|---|---|---|---|---|---|
| 1 | Webhook (`webhook`) | no | no | **yes** (all pages) | no | [Guide] company-level System Settings |
| 2 | AI Assistant (`ai-assistant`) | no | history only | **yes** (settings, rules, usage) + global "Generate with AI" button in HR and ME forms | no | [Guide] admin config; button for users |
| 3 | AI Document (`ai-document`) | **yes** (templates, categories, tones, analytics) | **yes** (generate, my history) | provider settings are shared with AI Assistant | no | [Guide] generator and templates; ME side [Added] |
| 4 | Planning (`planning`) | **yes** (setup, challenges, charters) | **yes** (my charters, challenges read-only) | no | no | [Guide] users/roles assigned to models; ME [Added] |
| 5 | SWOT (`swot-analysis`) | **yes** | **yes** (member view) | no | no | same |
| 6 | PESTEL (`pestel-analysis`) | **yes** | **yes** (member view) | no | no | same |
| 7 | Porter's Five Forces (`porters-five-forces`) | **yes** | **yes** (member view) | no | no | same |
| 8 | McKinsey 7-S (`mckinsey-7s`) | **yes** | **yes** (member view) | no | no | same |
| 9 | Business Model (`business-model`) | **yes** | **yes** (member view) | no | no | same |
| 10 | Business Plan (`business-plan`) | **yes** | **yes** (member view) | no | no | same |
| 11 | Marketing Plan (`marketing-plan`) | **yes** | **yes** (member view) | no | no | same |
| 12 | Recruitment (`recruitment`) | **yes** (full) | **yes** (interviewer, onboarding, assessments, referrals, read-only masters) | no | **yes** careers | [Guide] company; ME and careers from guide + `hrms-plan/02` |
| 13 | Job Search (`job-search`) | **yes** (jobs, applications) | **yes** (browse, apply, my applications, profile) | no | no | **[Guide] explicit Company Login and Staff Login** |
| 14 | Training (`training`) | **yes** | **yes** (my trainings, tasks, feedback, sessions) | no | no | [Guide] HR side; staff tasks/feedback implied by assignment |
| 15 | Performance (`performance`) | **yes** | **yes** (my goals, reviews, team reviews for managers) | no | no | [Guide] HR side; ME [Added] |
| 16 | Performance Indicator (`performance-indicator`) | **yes** (admin) | **yes** (member and team leader dashboards, my teams/tasks) | no | no | **[Guide] role-based dashboards: admin, team leader, employee** |
| 17 | Team Workload (`team-workload`) | **yes** | **yes** (my workload, my timesheet, team workload for managers) | no | no | [Guide] staff are the workload subjects; ME [Added] |
| 18 | Time Tracker (`time-tracker`) | **yes** | **yes** (my sessions, my screenshots, assigned tasks, app setup) | no | desktop app API | [Guide] assigned users track via app; ME [Added] |
| 19 | Procurement (`procurement`) | **yes** | **yes** (staff dashboard, interviews as panelist, RFx read-only) | no | **yes** vendor portal | **[Guide] explicit Company & HR Dashboard and Staff Dashboard** |
| 20 | LMS (`lms`) | **yes** (admin and website management) | **yes** (internal learners) | no | **yes** LMS website for external students | [Guide] company + students (public site); internal learners [Added] |

---

## 4. Exact route tables (paths are relative to each base)

Bases: `HR=/hr/addons/{slug}`, `ME=/me/addons/{slug}`, `TEN=/tenant/addons/{slug}`, `PUB=/public/{slug}`. Notation: `X (+ /new, /:id, /:id/edit)` means list plus create, view and edit pages (each a separate route). Every list page also has the standard filters, search and export described in the add-on blocks.

### 4.1 Webhook (`webhook`), Tenant portal only
- TEN: `/endpoints (+ /new, /:id, /:id/edit)`, `/events`, `/logs (+ /:id)`, `/settings`
- Redirect: Tenant Settings > Webhook Settings -> `/tenant/addons/webhook/endpoints`

### 4.2 AI Assistant (`ai-assistant`)
- TEN: `/settings`, `/fields`, `/usage`, `/history (+ /:id)`
- HR/ME: no pages; the **Generate with AI** component appears inside HR and ME forms that declare `aiFields` (appears only if the user has `ai-assistant.use`)
- ME: `/history` (own generations)

### 4.3 AI Document (`ai-document`)
- HR: `/templates (+ /new, /:id/edit)`, `/template-categories`, `/tones`, `/history (+ /:id)` (all users, admin scope), `/analytics`, `/generate`
- ME: `/generate`, `/history (+ /:id)` (own documents)
- Provider and key: managed at `TEN /tenant/addons/ai-assistant/settings` (shared), link shown on the HR page

### 4.4 Planning (`planning`)
- HR: `/dashboard`, `/challenges (+ /new, /:id, /:id/edit)`, `/charters`, `/charters/grid`, `/charters/kanban`, `/charters/tree`, `/charters/new`, `/charters/:id`, `/charters/:id/edit`, `/setup/categories`, `/setup/stages`, `/setup/statuses`
- ME: `/charters` (only charters where I am a member), `/charters/grid`, `/charters/:id` (view, comment, rate; edit sections only with permission), `/challenges` (read-only list), `/challenges/:id`

### 4.5 Strategy tools (apply to each of `swot-analysis`, `pestel-analysis`, `porters-five-forces`, `mckinsey-7s`, `business-model`, `business-plan`, `marketing-plan`)
- HR: `/models`, `/models/grid`, `/models/kanban`, `/models/tree`, `/models/new`, `/models/:id`, `/models/:id/edit` (+ for marketing-plan: `/setup/channels`)
- ME: `/models` (only models I am a member of), `/models/grid`, `/models/:id` (view, comment with attachments, rate; section edit only with permission)
- Create/delete for employees is off by default; grant `me.addons.{slug}.create` per role if you want employees to author.
- Dependency: all require `planning`; if Planning is missing or expired they lock.

### 4.6 Recruitment (`recruitment`)
- HR: `/dashboard`, `/job-postings (+ /new, /:id, /:id/edit)`, `/pipeline`, `/candidates (+ /new, /:id, /:id/edit)`, `/interviews (+ /new, /:id)`, `/interviews/calendar`, `/offers (+ /new, /:id, /:id/edit)`, `/candidate-onboarding (+ /:id)`, `/assessments (+ /templates, /:id/results)`, `/referrals`, `/career-site`, `/setup/job-categories`, `/setup/job-types`, `/setup/job-locations`, `/setup/candidate-sources`, `/setup/interview-types`, `/setup/interview-rounds`, `/setup/offer-templates`, `/setup/onboarding-checklists`, `/setup/check-items`, `/setup/custom-questions`, `/setup/job-stages`
- ME: `/my-interviews (+ /:id feedback)`, `/my-onboarding`, `/my-assessments (+ /:id take)`, `/my-referrals (+ /new)`, and the read-only pages you listed in the employee menu: `/job-postings` (read-only list; apply is in Job Search), `/job-locations`, `/interview-rounds` (permission-gated, read-only)
- PUB: `/jobs`, `/jobs/:slug`, `/jobs/:slug/apply`, `/track`, alias `/careers/*`
- Existing pages to migrate: `/hr/recruitment/*`, `/me/recruitment/*`

### 4.7 Job Search (`job-search`)  [Guide: Company Login vs Staff Login]
- HR: `/jobs (+ /:id)`, `/applications`, `/applications/grid`, `/applications/:id`
- ME: `/browse (+ /:id, /:id/apply)`, `/my-applications (+ /grid, /:id)`, `/profile` (Job Seeker profile; also reachable from Edit Profile)
- Depends on `recruitment`.

### 4.8 Training (`training`)
- HR: `/dashboard`, `/types (+ /new, /:id/edit)`, `/trainers (+ /new, /:id, /:id/edit)`, `/trainings (+ /new, /:id, /:id/edit)`, `/trainings/calendar`, `/trainings/:id/participants`, `/trainings/:id/tasks (+ /new, /:taskId/edit)`, `/trainings/:id/tasks/:taskId/feedbacks`, `/reports`
- ME: `/my-trainings (+ /:id)`, `/my-trainings/:id/tasks`, `/my-trainings/:id/tasks/:taskId/feedback`, `/sessions` (upcoming trainings, register/cancel; this is your employee menu "Training Sessions"), `/programs` (training types catalog; your "Training Programs")
- Existing pages to migrate: `/hr/training/*`, `/me/training/*`

### 4.9 Performance (`performance`)
- HR: `/dashboard`, `/indicators (+ /new, /:id/edit)`, `/goals (+ /new, /:id, /:id/edit)`, `/cycles (+ /new, /:id/edit)`, `/reviews (+ /new, /:id, /:id/conduct)`, `/setup/indicator-categories`, `/setup/goal-types`
- ME: `/my-goals (+ /new, /:id, /:id/edit when permitted; progress updates)`, `/my-reviews (+ /:id self-assessment)`, `/cycles` (read-only), `/indicators` (read-only), `/team-reviews (+ /:id/conduct)` (managers, reporting-line scope), `/team-goals` (managers)
- Existing pages to migrate: `/hr/performance/*`, `/me/performance/*`

### 4.10 Performance Indicator (`performance-indicator`)  [Guide: admin, team leader, employee dashboards]
- HR: `/dashboard`, `/challenges (+ /new, /:id, /:id/edit, /:id/scores)`, `/achievements (+ /new, /:id, /:id/edit)`, `/leaderboard`, `/teams (+ /new, /:id, /:id/edit)`, `/team-tasks (+ /new, /:id/edit)`, `/progress`, `/setup/criterias`, `/setup/levels`, `/setup/categories`, `/setup/reward-types`, `/setup/settings`
- ME: `/dashboard` (employee), `/dashboard/team-leader` (team leaders), `/leaderboard`, `/my-challenges (+ /:id)`, `/my-achievements`, `/my-team (+ /:id)`, `/my-tasks (+ /:id)`, `/progress`
- Landing redirect by role: admin -> HR dashboard; team leader -> ME team-leader dashboard; employee -> ME dashboard.

### 4.11 Team Workload (`team-workload`)
- HR: `/workload`, `/report`, `/staff-shifting (+ /new, /:id/edit)`, `/planned-hours (+ /new, /:id/edit)`, `/holidays` (read-only from HR Holidays), `/timesheets (+ /new, /:id/edit)`
- ME: `/my-workload`, `/my-timesheet (+ /new, /:id/edit)`, `/team` (managers: team workload and report, reporting-line scope)

### 4.12 Time Tracker (`time-tracker`)
- HR: `/dashboard`, `/projects (+ /new, /:id, /:id/edit)`, `/tasks (+ /new, /:id/edit)`, `/sessions`, `/sessions/:id/screenshots`, `/reports`, `/devices`, `/settings`
- ME: `/my-time` (own sessions), `/my-time/:id/screenshots` (own), `/my-projects`, `/my-tasks`, `/app` (desktop app download, setup instructions, device registration code), `/team` (managers with `view-team-sessions`)
- App API: `/api/v1/addons/time-tracker/app/*`

### 4.13 Procurement (`procurement`)  [Guide: Company & HR Dashboard and Staff Dashboard]
- HR: `/dashboard`, `/rfx (+ /new, /:id, /:id/edit)`, `/applicants (+ /new, /:id, /:id/edit)`, `/applications`, `/applications/grid`, `/applications/kanban`, `/applications/archived`, `/applications/new`, `/applications/:id`, `/interviews (+ /new, /:id)`, `/interviews/calendar`, `/onboardings (+ /new, /:id)`, `/vendors (+ /:id)`, `/items (+ /new, /:id/edit)`, `/setup/categories`, `/setup/stages`, `/setup/budget-types`, `/setup/locations`, `/setup/contract-types`, `/setup/custom-questions`, `/setup/brand`, `/setup/about`, `/setup/help`, `/setup/proposal-tips`, `/setup/what-happens-next`, `/setup/faq`
- ME: `/dashboard` (staff dashboard), `/rfx (+ /:id)` (read-only for permitted staff), `/my-interviews (+ /:id)` (panelist), `/my-tasks`
- PUB (vendor portal): `/rfx`, `/rfx/:code`, `/rfx/:code/apply`, `/track`, `/about`, `/help`

### 4.14 LMS (`lms`)
- HR: `/dashboard`, theme pages `/theme/brand`, `/theme/colors-typography`, `/theme/home/hero`, `/theme/home/stats`, `/theme/home/featured-courses`, `/theme/home/offer-banner`, `/theme/home/categories`, `/theme/home/testimonials`, `/theme/home/newsletter`, `/theme/about`, `/theme/blog`, `/theme/course-pages`, `/theme/auth-pages`, `/theme/contact-support`, `/theme/ecommerce`; `/categories (+ /new, /:id/edit)`, `/courses (+ /new, /:id, /:id/edit, /:id/content, /:id/students)`, `/students (+ /new, /:id, /:id/edit)`, `/orders (+ /new, /:id, /:id/edit)`, `/website-orders (+ /:id)`, `/pages (+ /new, /:id/edit)`, `/blogs (+ /new, /:id/edit, /categories)`, `/subscribers`, `/contacts (+ /:id)`, `/testimonials (+ /new, /:id/edit)`, `/wishlists`, `/carts`, `/coupons (+ /new, /:id, /:id/edit)`, `/certificates`, `/reports`
- ME (internal learners): `/catalog`, `/my-learning`, `/my-learning/:courseId` (player), `/certificates`
- PUB (external students and visitors): `/` (home), `/courses`, `/courses/:slug`, `/cart`, `/checkout`, `/login`, `/register`, `/account` (student dashboard), `/learn/:courseId`, `/certificates`, `/blog`, `/blog/:slug`, `/pages/:slug`, `/contact`

---

## 5. Sidebar placement and order

Order values are relative inside each heading (core items keep their current positions; add-on menus sit exactly where the core menu was, or after it). A menu hides entirely when the add-on is not installed.

### 5.1 HR sidebar (`/hr`)
| Heading (existing order) | Order inside heading |
|---|---|
| 1 Overview | Dashboard, Calendar, Chat (core) |
| 2 Workforce Management | Employees, Organization Structure, Attendance, Leave Management (core), then **Time Tracker**, **Team Workload** |
| 3 Talent & Growth | **Recruitment** (add-on, at its current position), **Job Search**, Employee Lifecycle (core), **Performance** (add-on, current position), **Performance Indicator**, **Training** (add-on, current position), **LMS** |
| 4 Finance & Assets | Payroll Management (core), Asset Management (current), then **Procurement** |
| 5 Communication & Content | Meeting (core), Document & Contract (core), then **AI Document** |
| 6 Strategy & Planning (**new heading**, shown only if Planning is installed) | **Planning**, SWOT Analysis, PESTEL Analysis, Porter's Five Forces, McKinsey 7-S, Business Model, Business Plan, Marketing Plan (tools only when installed) |
| Footer | Media Library, My Profile |

### 5.2 Employee sidebar (`/me`)
| Heading | Order inside heading |
|---|---|
| 1 Overview | Dashboard, Calendar, Todo, Chat (core) |
| 2 Workspace Management | Employee, Organization Structure, Attendance, Leave (core), then **My Time** (Time Tracker), **My Workload** (Team Workload) |
| 3 Talent & Growth | **Recruitment** (my interviews, onboarding, assessments, referrals, read-only job pages), **Job Search**, Employee Lifecycle (core), **Performance** (goals, reviews, cycles, indicators, team reviews for managers), **Performance Indicator**, **Training**, **My Learning** (LMS) |
| 4 Finance & Assets | Payroll Management (core), Assets Management (core), then **Procurement** (staff) |
| 5 Communication & Content | Meetings, Documents & Contracts (core), then **AI Document** |
| 6 Strategy & Planning (new, shown only if the user is a member of at least one model or holds the permission) | **Planning**, tools in the same order as HR |
| Footer | Media Library, My Profile |

### 5.3 Tenant sidebar (`/tenant`)
Heading **Integrations and AI**: **Webhook**, **AI Assistant** (after the core Integrations/Settings items). The whole HR panel remains available as a collapsible group for Tenant Admin, including all `/hr/addons/*` menus in the order of 5.1.

### 5.4 Manifest fields that drive this
`portalRoutes: { hr: {base, nav[]}, me: {base, nav[]}, tenant: {base, nav[]}, public: {base} }`, per nav item `{labelKey, icon, route, permission, heading, order, badgeSource}`, plus `requires[]` and `expiry` behavior. Sidebar components contain no hardcoded items.

---

## 6. Existing routes to migrate (redirect table seed)

| Existing | New (Option A) |
|---|---|
| `/hr/recruitment/*` | `/hr/addons/recruitment/*` |
| `/me/recruitment/job-postings` | `/me/addons/job-search/browse` (if Job Search installed) else `/me/addons/recruitment/job-postings` (read-only) |
| `/me/recruitment/interviews`, `/onboarding`, `/assessments` | `/me/addons/recruitment/my-interviews`, `/my-onboarding`, `/my-assessments` |
| `/me/recruitment/career` | `/me/addons/job-search/browse` |
| `/me/recruitment/job-locations`, `/interview-rounds` | `/me/addons/recruitment/job-locations`, `/interview-rounds` |
| `/hr/training/*` | `/hr/addons/training/*` (types, trainers, trainings; map old programs/sessions/employee-trainings to Training List + Participants) |
| `/me/training/*` | `/me/addons/training/*` |
| `/hr/performance/*` | `/hr/addons/performance/*` |
| `/me/performance/*` | `/me/addons/performance/*` |
| `/careers/*` | stays as public alias of `/public/recruitment/*` |
| `/addons/{slug}/*` (from earlier prompts, not built yet) | not created; use the scheme above |

Any other existing `/hr/*` or `/me/*` page that belongs to one of these 20 add-ons must be listed by the agent in the AD0 audit and added to this table.

---

## 7. Implementation order (placement first, then add-ons)

**Step P0: Placement foundation (no add-on features yet).** Manifest `portalRoutes`, route file generator/folders for hr/me/tenant/public add-on bases, Navigation Registry headings and order (section 5), role visibility, redirect table, Renewal Block page per portal, URL-map CI test (every route in section 4 resolves to a registered page or a "not yet built" locked stub that is hidden from sidebars).

**Then per add-on, always in this internal order:**
1. Shared DB models, services, validation, permissions, events (single source).
2. HR/admin pages and APIs.
3. ME pages and self-scope APIs (same services).
4. Tenant pages (only where listed).
5. Public pages (only where listed) with rate limits, captcha, expiry page.
6. Realtime, notifications, webhook events, AI fields, jobs.
7. Expiry/renewal behavior in each portal; sidebar order check.
8. Tests per portal and cross-portal consistency, then report and approval.

**Add-on order (dependency-safe):**
| Order | Add-on | Portals built |
|---|---|---|
| 1 | Webhook | Tenant |
| 2 | AI Assistant | Tenant, ME history, global modal in HR/ME |
| 3 | AI Document | HR, ME |
| 4 | Planning (+ shared strategy engine) | HR, ME |
| 5 to 11 | SWOT, PESTEL, Porter, McKinsey 7-S, Business Model, Business Plan, Marketing Plan | HR, ME each |
| 12 | Recruitment | HR, ME, Public |
| 13 | Job Search | HR, ME |
| 14 | Training | HR, ME |
| 15 | Performance | HR, ME |
| 16 | Performance Indicator | HR, ME |
| 17 | Team Workload | HR, ME |
| 18 | Time Tracker | HR, ME, App API |
| 19 | Procurement | HR, ME, Public |
| 20 | LMS | HR, ME, Public |

(Phase R and Step P0 come first; the existing built modules Recruitment, Training and Performance are migrated, not rebuilt.)

---

## 8. Paste-ready placement override (add to the start of every add-on run)

```text
PLACEMENT OVERRIDE (this supersedes any /addons/{slug}/* URL in the add-on block; fields, CRUD, realtime, expiry and zero-mock rules stay)
Use the route scheme from 23_Addon_Placement_and_Order_Matrix.md:
 HR/admin pages  /hr/addons/{slug}/...     | Employee pages /me/addons/{slug}/...
 Tenant pages    /tenant/addons/{slug}/... | Public pages   /public/{slug}/...
APIs: admin /api/v1/addons/{slug}/*, self /api/v1/me/addons/{slug}/*, team /api/v1/team/addons/{slug}/*, public /api/v1/public/{slug}/*.
Implement ONLY the routes listed for this add-on in section 4 of that file, in the order: shared models/services -> HR pages -> ME pages -> tenant pages (if listed) -> public pages (if listed) -> realtime/jobs/webhooks -> expiry blocks in each portal -> tests.
Sidebar: place menus per section 5 (heading and order) from the manifest; no hardcoded sidebar items; items appear only when installed, entitled and permitted.
ME pages must use self-scope APIs (employee from token) and the same domain service as HR pages. Employees must never reach HR pages (403) or other people's records (404).
Keep existing URLs as 301 redirects (section 6). Report routes created per portal, redirects added, permissions per route and test results per portal.
```

---

## 9. Acceptance tests for placement

1. Every route in section 4 resolves (page or hidden locked stub); no route exists outside the table.
2. Sidebar order in HR, ME and Tenant matches section 5 for a tenant with all 20 installed, and shows only installed add-ons for a smaller tenant.
3. Role visibility: Employee sees only ME pages permitted; HR Admin sees HR pages; Tenant Admin sees Tenant plus HR; direct URL tests return 403 for forbidden pages and 404 for foreign records.
4. Same record opened from HR and ME shows scope-appropriate fields (no internal notes for employees).
5. Legacy URLs redirect and deep links from notifications and emails land in the correct portal via `linkTo`.
6. Expired add-on: HR users see Renew, employees see Ask admin, public pages unavailable; dependents lock.
7. Public pages (careers, vendor portal, LMS) work only under `/public/{slug}` plus the `/careers` alias.
8. Switching to Option B changes prefixes by config only (no code changes).

---

## 10. Questions for you

| ID | Question |
|---|---|
| Q-PL01 | Option A (`/hr/addons/{slug}`, `/me/addons/{slug}`) or Option B (`/hr/{slug}`, `/me/{slug}`)? |
| Q-PL02 | Should employees see Strategy tools only as assigned members (default), or also be allowed to create their own models? |
| Q-PL03 | AI Assistant and Webhook in the Tenant portal (default) or inside HR? |
| Q-PL04 | LMS for internal employees at `/me/addons/lms` in addition to the external student website (default yes) |
| Q-PL05 | Team Workload and Time Tracker employee self-views and manager team views (default yes, scope by reporting line) |
| Q-PL06 | Procurement staff pages: what should staff do beyond dashboard, panelist interviews and read-only RFx (guide shows only a Staff Dashboard)? |
| Q-PL07 | Keep Job Locations and Interview Rounds visible (read-only) in the employee Recruitment menu as you listed, or hide them? |
