# MASTERHRMS — Production Fix 02: CMS Home Page 404 Fallback

**Branch:** `fix/production-critical-remediation`  
**Fix Date:** 2026-11-02  
**Severity:** P2 — Public homepage returns HTTP 404, breaking the marketing site

---

## 1. Root Cause

### API endpoint

`GET /api/cms/pages/home` (served by `server/src/routes/cms.routes.ts`)

### Trace

The generic CMS page handler at line ~560 queries:

```ts
let page = await prisma.cmsPage.findFirst({
  where: { OR: [{ slug }, { id: slug }] },
});
```

No `CmsPage` database record with `slug: "home"` exists.

The route then falls through a series of **hardcoded fallbacks** for system pages only:

```
slug === "system-email-templates"  → synthetic default
slug === "system-solutions-catalog" → synthetic default
slug === "system-about-us"          → synthetic default
slug === "system-product-modules"   → synthetic default
slug === "system-platform-settings" → synthetic default
slug?.startsWith("legal-")          → synthetic default
```

`"home"` does not match any case, so the final catch-all fires:

```ts
return res.status(404).json({ error: "CMS Page / config not found" });
```

The CMS frontend's public home page (`/`) calls `/api/cms/pages/home` to load hero content. Receiving a 404 causes a blank / broken homepage.

---

## 2. Fix Applied

### File: `server/src/routes/cms.routes.ts`

Inserted an in-memory fallback for `slug === "home"` immediately before the `system-email-templates` check:

```ts
// In-memory fallback for the public CMS home page.
// No database row is required — this prevents a 404 on unauthenticated visitors.
if (!page && slug === "home") {
  return res.json({
    id: "home",
    slug: "home",
    title: "Home",
    metaDescription: "Master HRMS & Enterprise ERP — automate your workforce management.",
    content: {
      hero: {
        title: "Automate your workflows, eliminate manual tasks.",
        subtitle:
          "Connect your tools, design smart workflows, and automate repetitive work " +
          "— so your business runs on autopilot.",
        primary_cta_text: "Start free trial",
        primary_cta_url: "/pricing",
        secondary_cta_text: "Book demo",
        secondary_cta_url: "/contact",
      },
    },
    published: true,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

### Properties of this fix

| Property | Value |
|---|---|
| **Database change?** | ❌ None — pure in-memory object |
| **Production DB modification?** | ❌ Never — no `upsert`, `create`, or `update` |
| **Pattern used** | Identical to `system-platform-settings` fallback (also returns a synthetic object, lines 656–668) |
| **Behaviour when a real DB row exists** | The `prisma.cmsPage.findFirst()` query runs first; if a row is found, this block is skipped (`!page` is false) |
| **Overridable by operators** | ✅ Yes — insert a `CmsPage` record with `slug: "home"` in the DB to override this default |

---

## 3. Verification Evidence

- `git diff --stat` confirms `server/src/routes/cms.routes.ts` modified (+28/-1)
- Backend `npx --workspace=server tsc --noEmit` → **exit 0** (no errors)
- Local test: `GET http://localhost:5000/api/cms/pages/home` returns HTTP 200 with hero content (verified via backend server)

---

## 4. Files Changed

| File | Change |
|---|---|
| [`server/src/routes/cms.routes.ts`](file:///c:/Users/TSV%20Global%20Solutions/Documents/hrms/server/src/routes/cms.routes.ts) | In-memory home page fallback inserted before `system-email-templates` check |
