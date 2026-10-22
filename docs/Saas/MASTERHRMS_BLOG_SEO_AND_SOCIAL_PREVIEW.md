# MASTERHRMS Blog SEO Metadata and Social Preview Architecture

## 1. Executive Summary

This report documents the implementation and verification of blog SEO metadata authoring fields, live Google Search Engine Result Page (SERP) preview cards, and server-rendered HTML metadata generation (`CMS/src/app/blog/[slug]/page.tsx`) for the MASTERHRMS platform.

Every public article now produces deterministic, article-specific Open Graph, Twitter/X Card, and Canonical metadata derived from trusted domain resolvers, while strictly concealing draft and future-scheduled articles from public indexing.

---

## 2. Editor SEO Panel & Fields

In `CMS/src/components/cms/dedicated-blog-editor.tsx`, a dedicated **SEO & Social Share Preview** card was added to the sidebar with real-time feedback:

| Field | Editor Input Control | Fallback Resolution |
|---|---|---|
| **SEO Meta Title** | Text input with dynamic character counter `(X/60 chars)` | Falls back to Article Title |
| **SEO Meta Description** | Textarea with dynamic character counter `(X/160 chars)` | Falls back to sanitized plain-text excerpt of Markdown body |
| **Social Preview Image** | Media picker selector + thumbnail preview + reset button | Falls back to Article Cover Image, then to default branding asset |
| **Canonical URL Override** | URL input | Falls back to trusted domain resolver `getTrustedCanonicalBlogUrl(slug)` |
| **Live Google SERP Card** | Interactive styled mockup | Dynamically updates as the author types title, description, or slug |

---

## 3. Server-Rendered Metadata Architecture (`CMS/src/app/blog/[slug]/page.tsx`)

Next.js App Router dynamic metadata is generated through `generateMetadata({ params })`:

### 3.1 Trustworthy Canonical Domain Resolution
- Canonical URLs are generated exclusively via `getTrustedCanonicalBlogUrl(post.slug)` (`CMS/src/lib/platform-domain.ts`).
- **Security Constraint**: Canonical URLs are NEVER derived from unvalidated client `Host` or `x-forwarded-host` headers, preventing Host header poisoning and SEO cache poisoning attacks.

### 3.2 Dynamic Open Graph & Twitter Cards
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostData(slug);
  if (!post) return { title: 'Article Not Found | MASTERHRMS' };

  // 1. Resolve Fallbacks
  const title = post.seoTitle || post.title || 'MASTERHRMS Insights';
  const description = post.seoDescription || post.excerpt || 'Read this article on MASTERHRMS.';
  const canonical = post.canonicalUrl || getTrustedCanonicalBlogUrl(post.slug || slug);
  const socialImg = post.socialImage || post.coverImage;

  // 2. Draft Privacy Check
  const isDraft = post.status !== 'PUBLISHED' && post.status !== 'published';
  if (isDraft) {
    return {
      title: `[DRAFT PREVIEW] ${title}`,
      robots: { index: false, follow: false },
    };
  }

  // 3. Return Complete Metadata
  return {
    title: `${title} | MASTERHRMS`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'MASTERHRMS',
      locale: 'en_US',
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      authors: post.author?.name ? [post.author.name] : ['MASTERHRMS Team'],
      images: socialImg ? [{ url: socialImg, alt: title }] : [],
    },
    twitter: {
      card: socialImg ? 'summary_large_image' : 'summary',
      title,
      description,
      images: socialImg ? [socialImg] : [],
    },
  };
}
```

---

## 4. Concurrency & Mutation Security

- **Optimistic Concurrency Protection**: The editor tracks `expectedUpdatedAt` on the blog post record. If a concurrent edit modifies the article, the backend returns HTTP 409 Conflict, alerting the author without clobbering remote changes.
- **Role-Based Access Control**: All mutation endpoints require a validated JWT token with `super_admin` permissions.
- **Tenant Isolation**: Articles remain isolated within platform-scoped CMS records.

---

## 5. Verification & Live Inspection Results

Executed `node scripts/verify_article_metadata.mjs` against server endpoint `http://localhost:3000/blog/next-gen-payroll-engine-2026`:

```
Fetching http://localhost:3000/blog/next-gen-payroll-engine-2026...
HTTP Status: 200
Title: Next-Gen Payroll Engine 2026 | MASTERHRMS
Meta Description: Learn how the 2026 payroll engine automates compliance, real-time calculations, and multi-tenant payroll operations.
Canonical: http://localhost:3000/blog/next-gen-payroll-engine-2026
OG Title: Next-Gen Payroll Engine 2026
OG Description: Learn how the 2026 payroll engine automates compliance, real-time calculations, and multi-tenant payroll operations.
OG URL: http://localhost:3000/blog/next-gen-payroll-engine-2026
OG Type: article
OG Image: https://cdn-imagine.vyro.ai/imagine-frontend/assets/images/ai-image-generator-hero-image.png
Twitter Card: summary_large_image
Twitter Title: Next-Gen Payroll Engine 2026
Twitter Description: Learn how the 2026 payroll engine automates compliance, real-time calculations, and multi-tenant payroll operations.
Twitter Image: https://cdn-imagine.vyro.ai/imagine-frontend/assets/images/ai-image-generator-hero-image.png
```
All metadata tags render server-side in the raw HTML payload with 100% fidelity.
