# 21. Add-on Execution Prompts, Set 1 (Part 1: Webhook, AI, Planning and Strategy tools)

> **ROUTE PRECEDENCE NOTICE (added with file 23):** the URLs written as `/addons/{slug}/*` in this file are superseded by `23_Addon_Placement_and_Order_Matrix.md`. Add-on pages now live inside the portals: HR/admin `/hr/addons/{slug}/...`, employee `/me/addons/{slug}/...`, tenant `/tenant/addons/{slug}/...`, public `/public/{slug}/...`. Use the per-add-on route tables and sidebar order in file 23 (paste its PLACEMENT OVERRIDE block with each add-on run). Fields, CRUD, realtime, expiry, zero-mock and test requirements in this file remain valid.


Paste `20_Addon_Master_Execution_Prompt.md` Part A first (once), get Phase R accepted, then paste the blocks below **one per run**, in the order of section 14 of file 20. Part 2 (Recruitment, Job Search, Training, Performance, Performance Indicator, Team Workload, Time Tracker, Procurement, LMS) is in `22_Addon_Execution_Prompts_Set1_Part2.md`.

Conventions in every block: route prefix `/addons/{slug}/*`, API prefix `/api/v1/addons/{slug}/*`, every sidebar item is its own page, list/grid/kanban/tree "views" are separate routes (links in a segmented control, not tabs), all dropdowns come from tables, all texts from i18n, realtime through outbox, entitlement expiry block per master prompt section 6. "Standard CRUD" means: list (search, filters, sort, pagination), create, view, edit (with version check), soft delete with usage check, bulk delete where listed, CSV export, audit entries, permission keys `{slug}.{resource}.{view|create|update|delete|export}`.

---

## BLOCK 1: WEBHOOK

```text
ADD-ON RUN: Webhook
slug: webhook | pages: /addons/webhook/* | API: /api/v1/addons/webhook/* | depends on: none (event bridge for every installed add-on and HRMS core)

PURPOSE
Send real-time HTTP callbacks to external systems when events happen in installed modules. Admin chooses an event (module), HTTP method (GET, POST, PUT), and destination URL, then toggles it on or off.

SIDEBAR (all separate pages)
Webhook
  Endpoints            -> /addons/webhook/endpoints            (list)
     Create endpoint   -> /addons/webhook/endpoints/new
     Endpoint detail   -> /addons/webhook/endpoints/:id
     Edit endpoint     -> /addons/webhook/endpoints/:id/edit
  Event Catalog        -> /addons/webhook/events
  Delivery Logs        -> /addons/webhook/logs
     Log detail        -> /addons/webhook/logs/:id
  Settings             -> /addons/webhook/settings
Also: Tenant Settings > Webhook Settings link redirects to /addons/webhook/endpoints.

DB (tenant_id on all)
wh_endpoint: id, name, event_key, method(enum GET|POST|PUT), url, secret(encrypted), headers_json(encrypted), is_active, timeout_ms, max_retries, consecutive_failures, disabled_reason, last_delivery_at, created_by, soft delete, version.
wh_delivery: id, endpoint_id, event_key, event_id, status(queued|success|failed|retrying|dead), attempt, http_status, duration_ms, request_headers(redacted), payload(redacted JSON), response_snippet(max 2KB), error_code, next_retry_at, created_at.
wh_setting (or settings registry group addon.webhook): default_timeout, max_retries, backoff_base_seconds, auto_disable_after_failures, max_endpoints (plan), log_retention_days.
Event catalog is NOT hardcoded: built at runtime from manifests of installed add-ons and HRMS core (each manifest declares events: key, module slug, labelKey, payload schema). Persist a cache table wh_event_def for the UI only.

API
GET/POST /endpoints, GET/PUT/DELETE /endpoints/:id, PATCH /endpoints/:id/toggle, POST /endpoints/:id/test (sends a sample event labelled "test"), GET /events (grouped by module, only installed+entitled), GET /logs (filters: endpoint, event, status, date), GET /logs/:id, POST /logs/:id/retry, GET/PUT /settings.
Dispatcher: worker consumes outbox events, matches active endpoints for the tenant and event_key, sends the request: POST/PUT with JSON body, GET with flattened payload as query parameters (size-limited). Headers: X-Webhook-Event, X-Webhook-Delivery-Id, X-Webhook-Timestamp, X-Webhook-Signature (HMAC-SHA256 of timestamp+body using the endpoint secret). Retries with exponential backoff; auto-disable after N consecutive failures and notify admins; idempotent delivery ids.
SECURITY: https only in production; SSRF protection (block private/loopback/link-local IPs, DNS rebinding check, no redirects, timeout, max payload size); secrets encrypted and masked in UI; redact sensitive fields per payload schema; rate limit per tenant; entitlement check per delivery (expired add-on => dispatcher stops).

UI PAGES
Endpoints list: columns Name, Module, Event, Method, URL (host only), Status toggle, Last delivery (status + time), Success rate 7d; filters module/event/status; search; row actions View, Edit, Test, Delete; empty state with "Create endpoint".
Create/Edit: Name, Module (installed modules only), Event (dependent on module), Method, URL (validated), Secret (generate/rotate, shown once), Custom headers (key/value rows), Timeout, Retries, Active toggle, Payload preview (sample from schema), Save, Send test.
Detail: config summary, secret rotate, last 20 deliveries, failure alert state, Enable/Disable.
Event Catalog: searchable list of all available events by module with payload schema viewer.
Logs: table with filters, status chips, payload/response viewer (redacted), Retry (for failed), export.
Settings: defaults and retention.

REALTIME
webhook.endpoint.created|updated|deleted|toggled; webhook.delivery.succeeded|failed|retrying (admin room); webhook.endpoint.auto_disabled. Lists and counters update live.

NOTIFICATIONS: endpoint auto-disabled (email + in-app to tenant admins).
JOBS: webhook.retry-runner (retry queue), webhook.log-cleanup (retention).
PERMISSIONS: webhook.endpoint.*, webhook.log.view/retry, webhook.settings.update (default: tenant admin).
REMOVE HARDCODED: any hardcoded module/event list, hardcoded URLs; events must come from the manifest registry.
TESTS: event fires -> delivery to a local test server with valid signature; GET vs POST/PUT format; retry/backoff; auto-disable; SSRF blocked; cross-tenant isolation; expired add-on stops delivery; secret never returned by API; realtime log update in second browser.
```

---

## BLOCK 2: AI ASSISTANT

```text
ADD-ON RUN: AI Assistant
slug: ai-assistant | pages: /addons/ai-assistant/* | API: /api/v1/addons/ai-assistant/* | depends on: none (works on any installed module that declares aiFields). Shares provider configuration with AI Document through a core table ai_provider_config.

PURPOSE
Add a "Generate with AI" button to create and edit forms across installed modules. User sets language, creativity, number of results, max length and extra context; the system returns result cards; clicking one fills the form field.

SIDEBAR
AI Assistant
  Settings      -> /addons/ai-assistant/settings        (admin)
  Field Rules   -> /addons/ai-assistant/fields          (which modules/fields show the button)
  Usage         -> /addons/ai-assistant/usage
  History       -> /addons/ai-assistant/history
     History detail -> /addons/ai-assistant/history/:id
(The Generate modal itself is a global component, not a page.)

DB
ai_provider_config (shared): tenant_id, provider(openai|anthropic|gemini), model, api_key(encrypted), is_active, last_test_status, last_test_at, monthly_token_limit.
ai_model (shared master): provider, model_id, label, is_active (seeded with real current model ids by Super Admin; editable; also refreshable via provider "list models" call during Test). Never hardcode models in UI.
ai_field_rule: tenant_id, module_slug, field_key, is_enabled.
ai_generation_log: tenant_id, user_id, module_slug, field_key, provider, model, language, creativity(low|medium|high), results_count(1..5), max_length(50..500), tokens_in, tokens_out, status, error_code, created_at (store prompt hash and a short redacted excerpt only).
Language list from the platform language table (15+ languages: not hardcoded in UI).
aiFields registry: built from manifests of installed add-ons (module slug, form id, field key, labelKey, context prompt builder). Initial declarations for HRMS production: announcements (title/body), job posting (description, requirements, benefits), offer letter template, training description, performance review comments, goal description, email templates, support ticket replies, document templates.

API
GET/PUT /settings, POST /settings/test (validates key with a tiny call; saves status), GET /providers (adapter registry: openai, anthropic, gemini), GET /models?provider=, GET /fields (installed modules only), PUT /fields/:id, POST /generate {moduleSlug, fieldKey, language, creativity, count(1-5), maxLength(50-500), context, formValues(optional, filtered)} -> {results:[{text, chars}]}, GET /history, GET /history/:id, GET /usage?from&to.
Rules: server builds the prompt from the field's context builder; limits enforced server-side; per-user rate limit and tenant token quota; timeout; strip secrets and unrelated PII from context; content policy filter; log usage; expired/disabled add-on returns 402/403; keys encrypted and never returned.

UI
Settings page: Provider select, Model select (from ai_model), API key (password field with show/hide, masked after save), Save, Test connection with result, monthly limit, enable per module toggles.
Generate modal (global component, opened from the button next to fields): Language select, Creativity radio (Low/Medium/High), Number of results (1-5), Max length slider 50-500 with live count, Additional context textarea, Generate button, loading state, result cards with character counts, click card to populate the field, Regenerate, error states (not configured -> link to settings for admins; disabled for others).
Field Rules page: table module/field/enabled toggle.
Usage page: charts by day/module/user, tokens, errors, limit bar.
History: list/search/filter; detail with prompt excerpt and results.

REALTIME: ai.generation.completed (usage counters), ai.settings.updated (buttons appear/disappear live), ai.quota.reached.
NOTIFICATIONS: quota 80%/100%, invalid key.
PERMISSIONS: ai-assistant.settings.update (admin), ai-assistant.use (per role, default HR/Manager/Admin), ai-assistant.history.view.
REMOVE HARDCODED: provider/model/language arrays, any dummy generated text, per-module hardcoded buttons (must come from aiFields).
TESTS: not configured state; invalid key; generate 1-5 results; max length respected; field populated; quota exhaustion; cross-tenant history isolation; expired entitlement hides buttons and blocks API; manifest of a newly installed add-on adds its fields automatically.
```

---

## BLOCK 3: AI DOCUMENT

```text
ADD-ON RUN: AI Document
slug: ai-document | pages: /addons/ai-document/* | API: /api/v1/addons/ai-document/* | depends on: shared ai_provider_config (from AI Assistant block; create the shared core if AI Assistant is not installed)

PURPOSE
Template-driven document/content generator (blog, website, social, email, video, product description, ads, bios, etc.) with tone, language, creativity, keywords, history and word-usage analytics.

SIDEBAR
AI Document
  Generate Document   -> /addons/ai-document/generate
  Templates           -> /addons/ai-document/templates
     Create template  -> /addons/ai-document/templates/new
     Edit template    -> /addons/ai-document/templates/:id/edit
  Template Categories -> /addons/ai-document/template-categories
  Tones               -> /addons/ai-document/tones
  History             -> /addons/ai-document/history
     View document    -> /addons/ai-document/history/:id
  Analytics           -> /addons/ai-document/analytics
  Settings            -> /addons/ai-document/settings

DB
aidoc_category(name, description, is_active, sort_order)
aidoc_tone(name, is_active, sort_order)  [Professional, Casual, Friendly, Formal, Creative are seeded as editable master data, not hardcoded]
aidoc_template(title, category_id, status(active|inactive), description, prompt_template with placeholders {title} {keywords} {tone} {language}, created_by)
aidoc_document(template_id, title, language, tone_id, creativity(1..10), char_limit(100..10000), keywords, instructions, content, word_count, created_by, created_at)
aidoc_usage_daily(tenant_id, day, user_id, template_id, words, generations)
Provider/model/key from ai_provider_config (shared).

API
Templates: standard CRUD + filters (category, status) + duplicate. Categories/Tones: standard CRUD (delete blocked if used).
POST /generate {templateId, title, language, toneId, creativity, charLimit, keywords[], instructions} -> {content, wordCount}; validates placeholders and limits; builds the prompt server-side.
Documents: GET list (search by title), GET /:id, PUT /:id (edit content), DELETE, POST /documents (save generated), GET /:id/export?format=txt|docx|pdf.
GET /analytics?from&to (words by day, by template, by user), GET/PUT /settings.

UI
Generate page (two panels, one page): LEFT form: Template select (cards or select, grouped by category), Title (required), Language, Tone, Creativity slider 1-10, Character limit 100-10000, Focus keywords (comma/tag input), Additional instructions, Generate. RIGHT: editable output textarea, live word/character count, buttons Save Document, Export (txt/docx/pdf), Copy, Regenerate; loading and success states.
Templates list: columns Title, Category, Status, Actions; search; filter by category and status with Apply/Clear; row actions Edit, Duplicate, Delete. Template form: Title, Category, Status, Description, Prompt template (placeholder helper chips), Preview.
History: card grid (title, template, language and tone tags, preview, date), search, View, Delete.
Analytics: word usage charts and top templates/users.

REALTIME: aidoc.document.created|deleted, aidoc.template.created|updated|deleted; analytics counters.
PERMISSIONS: ai-document.generate, .template.*, .category.*, .tone.*, .history.view (own vs all by scope), .analytics.view, .settings.update.
REMOVE HARDCODED: category/tone/language lists, sample generated content, hardcoded model names.
TESTS: placeholder validation; limits; generation saved; export formats; history isolation per tenant/user scope; analytics math; expired add-on blocks; category delete blocked when templates exist.
```

---

## BLOCK 4: PLANNING (base of the strategy tools) and the SHARED STRATEGY ENGINE

```text
ADD-ON RUN: Planning + Strategy Engine
slug: planning | pages: /addons/planning/* | API: /api/v1/addons/planning/* | depends on: HRMS core (users, roles). The strategy tool add-ons (SWOT, PESTEL, Porter, McKinsey 7-S, Business Model, Business Plan, Marketing Plan) depend on this add-on and reuse the engine tables below. If Planning is expired or uninstalled, all of them lock with reason "Requires Planning".

PURPOSE
Structure strategic initiatives: System Setup (Categories, Stages, Status) -> Challenges (time-bound objectives) -> Charters (project plans linked to challenges) with list, grid, kanban and tree presentations.

SHARED ENGINE TABLES (build once, used by all strategy add-ons)
strat_category(name, sort_order, is_active)
strat_stage(name, sort_order, color, is_active)            [kanban columns]
strat_status(name, color, sort_order, is_active)
strat_challenge(name, category_id, end_at, position(enum ongoing|on_hold|finished), explanation, notes)
strat_model(type enum charter|swot|pestel|porter|mckinsey7s|business_model|business_plan|marketing_plan, name, challenge_id, status_id, stage_id, thumbnail_media_id, video_media_id, description, notes, budget_amount(optional), created_by, rating_avg, rating_count)
strat_model_section(model_id, section_key, content(rich text), version, updated_by)   [section keys come from each tool manifest]
strat_model_member(model_id, user_id, role_id)
strat_model_attachment(model_id, media_id)
strat_model_rating(model_id, user_id, value 1..5)   [average is shown on list/grid/kanban/tree]
strat_comment(model_id, user_id, body, parent_id) + strat_comment_attachment(comment_id, media_id)
strat_marketing_channel(name, is_active)  [used by Marketing Plan]
Install hook seeds neutral editable defaults only for stages/statuses (for example Draft, In Progress, Review, Approved / Not Started, Active, Completed); no fake business records.

SIDEBAR (separate pages)
Planning
  Dashboard (added)     -> /addons/planning/dashboard
  Challenges            -> /addons/planning/challenges
     Create             -> /addons/planning/challenges/new
     View               -> /addons/planning/challenges/:id
     Edit               -> /addons/planning/challenges/:id/edit
  Charters              -> /addons/planning/charters            (list view)
     Grid view          -> /addons/planning/charters/grid
     Kanban view        -> /addons/planning/charters/kanban
     Tree view          -> /addons/planning/charters/tree
     Create / View / Edit -> /addons/planning/charters/new | /:id | /:id/edit
  System Setup
     Categories         -> /addons/planning/setup/categories
     Stages             -> /addons/planning/setup/stages
     Status             -> /addons/planning/setup/statuses

API (standard CRUD for each)
/categories, /stages (+ PUT /stages/reorder), /statuses, /challenges (filters: position, category), /models?type=charter (+ /models/:id/stage PATCH for kanban drag, /models/:id/rating PUT, /models/:id/sections/:key PUT, /models/:id/comments GET/POST, /models/:id/attachments POST/DELETE, /models/:id/export PDF), /dashboard.
Rules: Category/Stage/Status delete blocked when referenced (return usage counts and offer reassign). A model cannot be created or cloned if its challenge end date is in the past. Stage change by drag requires update permission and writes an audit entry. One rating per user per model, editable.

UI
Challenges list: columns Name, Category, End Date, Position, Actions; filters Position (Ongoing/OnHold/Finished) and Category; create form: Challenge Name, Category (from setup), End Date/Time, Position, Explanation, Notes; view page.
Charters list columns: Thumbnail, Name, Status, Stage, Challenge, Users, Roles, Rating (stars), Actions (View/Edit/Delete). Create form: Charter Name, Challenge (disabled if ended), Thumbnail image, Video, Status, Stage, Users (multi) with Role per user, Description, Organisational Effects, Goal Description, Notes, Attachments.
Charter view page (one page, collapsible sections): General (expanded), Description (+Edit), Attachments (view/download/add), Organisational Effects (+Edit), Goal Description (+Edit), Notes (+Edit), Comments (post with attachments, realtime).
Grid: cards with thumbnail, name, status, stage, challenge, rating, actions. Kanban: columns = stages (counts), drag cards between stages (optimistic, realtime to other users), card shows thumbnail, name, rating, member count, menu (View/Edit/Delete). Tree: challenge header bars with model counts, expand/collapse, nested cards (name, status, stage, star rating).
Setup pages: simple CRUD tables (Name, Color, Order, Active) with drag reorder for stages.
Dashboard: totals by position, models by stage, ending-soon challenges, recent activity (live).

REALTIME: planning.challenge.*, planning.model.created|updated|deleted|stage_changed, planning.comment.created, planning.rating.updated, setup changes refresh dropdowns (lookup.changed).
WEBHOOK EVENTS: planning.challenge.created, planning.charter.created, planning.charter.stage_changed.
AI FIELDS: charter description, organisational effects, goal description, challenge explanation.
NOTIFICATIONS: user added to a model, stage changed, comment mention, challenge ending in 7 days (job planning.challenge-reminders).
PERMISSIONS: planning.<resource>.view|create|update|delete|export, planning.model.rate, planning.model.comment.
REMOVE HARDCODED: stage/status/category literals, kanban column arrays, sample charters.
TESTS: challenge-ended rule; stage drag + realtime; delete blocked with references; rating average; tree/grid/kanban routes; comments with attachments; cross-tenant isolation; cascade lock of dependents when Planning expires.
```

---
## BLOCK 5: SWOT ANALYSIS

```text
ADD-ON RUN: SWOT Analysis
slug: swot-analysis | pages: /addons/swot-analysis/* | API: /api/v1/addons/swot-analysis/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='swot', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - strengths (Strengths): internal positive attributes and competitive advantages
  - weaknesses (Weaknesses): internal areas needing improvement
  - opportunities (Opportunities): external factors that create growth potential
  - threats (Threats): external factors that could hurt objectives
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
SWOT Analysis
  SWOT Analysis list        -> /addons/swot-analysis/models
     Grid view        -> /addons/swot-analysis/models/grid
     Kanban view      -> /addons/swot-analysis/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/swot-analysis/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/swot-analysis/models/new
     View             -> /addons/swot-analysis/models/:id
     Edit             -> /addons/swot-analysis/models/:id/edit
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='swot'.

API (/api/v1/addons/swot-analysis/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: swot-analysis.model.created|updated|deleted|stage_changed, swot-analysis.section.updated, swot-analysis.comment.created, swot-analysis.rating.updated.
WEBHOOK EVENTS: swot-analysis.model.created, swot-analysis.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: swot-analysis.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 6: PESTEL ANALYSIS

```text
ADD-ON RUN: PESTEL Analysis
slug: pestel-analysis | pages: /addons/pestel-analysis/* | API: /api/v1/addons/pestel-analysis/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='pestel', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - political (Political): government policy, stability, regulation
  - economic (Economic): economic conditions, market trends, financial influences
  - social (Social): demographics, culture, attitudes
  - technological (Technological): innovation, digital change
  - legal (Legal): regulatory requirements, compliance, legal change
  - environmental (Environmental): sustainability, climate, environmental regulation
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
PESTEL Analysis
  PESTEL Analysis list        -> /addons/pestel-analysis/models
     Grid view        -> /addons/pestel-analysis/models/grid
     Kanban view      -> /addons/pestel-analysis/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/pestel-analysis/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/pestel-analysis/models/new
     View             -> /addons/pestel-analysis/models/:id
     Edit             -> /addons/pestel-analysis/models/:id/edit
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='pestel'.

API (/api/v1/addons/pestel-analysis/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: pestel-analysis.model.created|updated|deleted|stage_changed, pestel-analysis.section.updated, pestel-analysis.comment.created, pestel-analysis.rating.updated.
WEBHOOK EVENTS: pestel-analysis.model.created, pestel-analysis.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: pestel-analysis.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 7: PORTER'S FIVE FORCES

```text
ADD-ON RUN: Porter's Five Forces
slug: porters-five-forces | pages: /addons/porters-five-forces/* | API: /api/v1/addons/porters-five-forces/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='porter', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - threat_of_new_entrants (Threat of New Entrants): ADDED: the guide names five forces but lists only three fields; implement all five
  - competitive_rivalry (Competitive Rivalry): ADDED, same reason
  - threat_of_substitution (Threat of Substitution): substitute products or services
  - bargaining_power_supplier (Bargaining Power of Supplier): supplier influence
  - bargaining_power_buyers (Bargaining Power of Buyers/Customers): customer influence on pricing and terms
  - organizational_effects (Organizational Effects): impact on strategy and operations
  - goal_description (Goal Description): what the analysis aims to achieve
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
Porter's Five Forces
  Porter's Five Forces list        -> /addons/porters-five-forces/models
     Grid view        -> /addons/porters-five-forces/models/grid
     Kanban view      -> /addons/porters-five-forces/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/porters-five-forces/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/porters-five-forces/models/new
     View             -> /addons/porters-five-forces/models/:id
     Edit             -> /addons/porters-five-forces/models/:id/edit
Note: the guide's field list is incomplete versus the model's name; implement all five forces plus organizational effects and goal description.
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='porter'.

API (/api/v1/addons/porters-five-forces/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: porters-five-forces.model.created|updated|deleted|stage_changed, porters-five-forces.section.updated, porters-five-forces.comment.created, porters-five-forces.rating.updated.
WEBHOOK EVENTS: porters-five-forces.model.created, porters-five-forces.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: porters-five-forces.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 8: MCKINSEY 7-S MODEL

```text
ADD-ON RUN: McKinsey 7-S Model
slug: mckinsey-7s | pages: /addons/mckinsey-7s/* | API: /api/v1/addons/mckinsey-7s/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='mckinsey7s', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - structure (Structure): how the organization is organized
  - strategy (Strategy): plan for competitive advantage
  - systems (Systems): processes, procedures, information systems
  - staff (Staff): people and capabilities
  - skills (Skills): organizational competencies
  - shared_values (Shared Values): core beliefs and culture
  - style (Style): ADDED: the seventh S (leadership style) is named in the model but missing from the guide's field list
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
McKinsey 7-S Model
  McKinsey 7-S Model list        -> /addons/mckinsey-7s/models
     Grid view        -> /addons/mckinsey-7s/models/grid
     Kanban view      -> /addons/mckinsey-7s/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/mckinsey-7s/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/mckinsey-7s/models/new
     View             -> /addons/mckinsey-7s/models/:id
     Edit             -> /addons/mckinsey-7s/models/:id/edit
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='mckinsey7s'.

API (/api/v1/addons/mckinsey-7s/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: mckinsey-7s.model.created|updated|deleted|stage_changed, mckinsey-7s.section.updated, mckinsey-7s.comment.created, mckinsey-7s.rating.updated.
WEBHOOK EVENTS: mckinsey-7s.model.created, mckinsey-7s.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: mckinsey-7s.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 9: BUSINESS MODEL

```text
ADD-ON RUN: Business Model
slug: business-model | pages: /addons/business-model/* | API: /api/v1/addons/business-model/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='business_model', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - key_partners (Key Partners): suppliers and partners
  - key_activities (Key Activities): what the company must do
  - value_propositions (Value Propositions): products/services that create value
  - customer_relationships (Customer Relationships): relationship types per segment
  - channels (Channels): how value is delivered
  - customer_segments (Customer Segments): groups served
  - cost_structure (Cost Structure): major costs
  - revenue_streams (Revenue Streams): cash from each segment
  - key_resources (Key Resources): critical assets
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
Business Model
  Business Model list        -> /addons/business-model/models
     Grid view        -> /addons/business-model/models/grid
     Kanban view      -> /addons/business-model/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/business-model/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/business-model/models/new
     View             -> /addons/business-model/models/:id
     Edit             -> /addons/business-model/models/:id/edit
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='business_model'.

API (/api/v1/addons/business-model/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: business-model.model.created|updated|deleted|stage_changed, business-model.section.updated, business-model.comment.created, business-model.rating.updated.
WEBHOOK EVENTS: business-model.model.created, business-model.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: business-model.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 10: BUSINESS PLAN

```text
ADD-ON RUN: Business Plan
slug: business-plan | pages: /addons/business-plan/* | API: /api/v1/addons/business-plan/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='business_plan', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - executive_summary (Executive Summary): concept, financial features, requirements
  - company_description (Company Description): structure, ownership, location, legal form
  - market_analysis (Market Analysis): target market, size, competition, trends
  - organization_management (Organization & Management): key personnel and structure
  - service_products_analysis (Service and Products Analysis): offerings, advantages, development stage
  - marketing_sales (Marketing and Sales): strategy, pricing, distribution
  - budget (Budget): startup costs, operating expenses, revenue projections (also numeric budget_amount shown in General)
  - investment_funding_request (Investment / Funding Request): funding needs, ROI, use of funds
  - financial_projections (Financial Projections): forecasts, cash flow, break-even
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
Business Plan
  Business Plan list        -> /addons/business-plan/models
     Grid view        -> /addons/business-plan/models/grid
     Kanban view      -> /addons/business-plan/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/business-plan/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/business-plan/models/new
     View             -> /addons/business-plan/models/:id
     Edit             -> /addons/business-plan/models/:id/edit
General section also shows the numeric Budget (budget_amount, formatted with tenant currency settings).
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='business_plan'.

API (/api/v1/addons/business-plan/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Charter Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Charter Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: business-plan.model.created|updated|deleted|stage_changed, business-plan.section.updated, business-plan.comment.created, business-plan.rating.updated.
WEBHOOK EVENTS: business-plan.model.created, business-plan.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: business-plan.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---

## BLOCK 11: MARKETING PLAN

```text
ADD-ON RUN: Marketing Plan
slug: marketing-plan | pages: /addons/marketing-plan/* | API: /api/v1/addons/marketing-plan/* | depends on: planning (hard dependency: install blocked without it; locks when Planning expires or is uninstalled)
ENGINE: reuse the shared strategy engine tables from the Planning block (strat_model with type='marketing_plan', strat_model_section, strat_model_member, strat_model_attachment, strat_comment, strat_model_rating, and the Planning setup masters strat_stage / strat_status / strat_challenge). Do NOT create duplicate tables. This add-on only contributes its manifest: section definitions, labels (i18n), nav, permissions, events.

SECTIONS (section_key (label): purpose). Section definitions live in the manifest, rendered generically; nothing hardcoded in components:
  - business_summary (Business Summary): key business information
  - company_description (Company Description): company information
  - team (Team): team members and responsibilities
  - business_initiative (Business Initiative): initiatives and goals
  - target_market (Target Market): target market analysis
  - marketing_channels (Marketing Channels): multi-select from the strat_marketing_channel master (CRUD page added under Setup)
  - budget (Budget): marketing budget
  - notes (Notes): additional observations

SIDEBAR (separate pages, no tabs)
Marketing Plan
  Marketing Plan list        -> /addons/marketing-plan/models
     Grid view        -> /addons/marketing-plan/models/grid
     Kanban view      -> /addons/marketing-plan/models/kanban     (columns = Planning stages, drag to change stage)
     Tree view        -> /addons/marketing-plan/models/tree       (challenge headers with counts, expandable model cards)
     Create           -> /addons/marketing-plan/models/new
     View             -> /addons/marketing-plan/models/:id
     Edit             -> /addons/marketing-plan/models/:id/edit
  EXTRA: Marketing Channels master -> /addons/marketing-plan/setup/channels (standard CRUD, delete blocked when used).
(Status, Stage, Challenge dropdowns come from the Planning setup pages; link "Manage in Planning" for admins.)

DB: none new except the manifest (and strat_marketing_channel for Marketing Plan). All records are strat_model rows with type='marketing_plan'.

API (/api/v1/addons/marketing-plan/...)
GET /models (search, filters: status, stage, challenge, rating, member; sort; pagination), POST /models, GET /models/:id, PUT /models/:id (version check), DELETE /models/:id, PATCH /models/:id/stage, PUT /models/:id/rating, PUT /models/:id/sections/:key (inline "Edit" under each section, versioned), GET/POST /models/:id/comments (+attachments), POST/DELETE /models/:id/attachments, GET /models/:id/export (PDF), GET /models/tree, GET /meta (section definitions, for the generic renderer).
Rules: cannot create or clone when the selected challenge end date is in the past; status/stage must exist and be active; assigned users must belong to the tenant; thumbnails/videos/attachments via the file API with type/size limits; delete is soft; model counts show on Planning challenge pages.

UI
List columns: Thumbnail, Name, Status, Stage, Challenge, Rating (stars), Actions (View, Edit, Delete). Search, filters (status, stage, challenge), sort, pagination. Segmented links to Grid, Kanban, Tree routes.
Create/Edit form (page): Name, Challenge (from Planning; disabled if ended with explanation), Thumbnail image upload, Video upload, Status, Stage, Users (multi-select) with Role for each, Description, then one rich-text field per section above, Notes, Attachments. Autosave draft, validation, Save.
View page (one page, collapsible sections): General (expanded: name, challenge, thumbnail, video player, status, stage, users and roles, star rating that the viewer can set), Description (+Edit), Attachments (view/download/add), each section above (+Edit button for that section), Comments (post, attach files, realtime). Print/PDF export button.
Kanban: drag between stage columns with optimistic update and realtime for other users; card shows thumbnail, status, rating, challenge, member count, menu (View/Edit/Delete).
Tree: challenge header bars with model counts; expand/collapse; model cards with name, status, stage, rating stars.
Empty states with a primary Create button; locked/expired states per master prompt.

REALTIME: marketing-plan.model.created|updated|deleted|stage_changed, marketing-plan.section.updated, marketing-plan.comment.created, marketing-plan.rating.updated.
WEBHOOK EVENTS: marketing-plan.model.created, marketing-plan.model.stage_changed.
AI FIELDS: description and each section field above (Generate with AI appears when AI Assistant is installed).
NOTIFICATIONS: user assigned, stage changed, comment mention.
PERMISSIONS: marketing-plan.model.view|create|update|delete|export|rate|comment.
REMOVE HARDCODED: section label arrays, sample analyses, hardcoded stage/status arrays, static kanban columns.
TESTS: create/edit/delete; ended-challenge rule; kanban drag realtime across two browsers; tree counts; section inline edit with version conflict; comments with attachment; export PDF; permissions; Planning-expired cascade locks this add-on; cross-tenant isolation; empty tenant shows no sample data.
```

---
