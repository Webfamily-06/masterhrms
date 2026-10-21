# MASTERHRMS — Dynamic CMS Page Template & Section Architecture Matrix

**Date:** October 22, 2026  
**Auditor:** Principal Enterprise Architect  
**Scope:** Reusable Page Templates, Section Schemas, and CMS Studio Dynamic Customization

---

## 1. Overview of Template Architecture

MASTERHRMS utilizes a dynamic, schema-driven template architecture powered by PostgreSQL JSON storage (`CmsPage.content`) and rendered by the Next.js App Router component [`DynamicTemplateRenderer`](file:///Users/apple/Documents/hrms/CMS/src/components/cms/dynamic-template-renderer.tsx). 

Instead of hardcoding landing pages, marketing funnels, legal policies, or resource hubs directly into static React JSX, all page content is composed of reusable, orderable section blocks with stable UUIDs.

---

## 2. Supported Page Templates

| Template Key | Purpose | Key Sections Included | Target Route Example |
| :--- | :--- | :--- | :--- |
| **`landing`** | High-conversion marketing and ERP showcase pages | Hero, Feature Grid, Comparison Matrix, Testimonials, CTA | `/p/next-gen-automation-saas`, `/` |
| **`content`** | Standard documentation, playbooks, and company guides | Hero, Rich Markdown Body, Related Resources, CTA | `/p/system-resource-guides`, `/about` |
| **`pricing`** | Subscription tiers, billing calculators, FAQ | Hero, Pricing Table, Feature Checklist, FAQ, Conversion CTA | `/p/system-monetization-plans`, `/pricing` |
| **`blog_index`** | Dynamic publication directory with search & category filters | Featured Articles Hero, Grid of Recent Posts, Newsletter CTA | `/blog` |
| **`blog_article`** | Long-form editorial articles with author & metadata | Article Header, Rich-Text Content, Author Bio, Related Posts | `/blog/[slug]` |
| **`legal`** | Terms of service, privacy policies, statutory compliance | Simple Header, Formatted Legal Clauses, Version History | `/p/privacy-policy`, `/p/terms` |
| **`contact`** | Lead capture, enterprise sales requests, support tickets | Contact Form, Office Locations, Direct Support Channels | `/contact` |

---

## 3. Dynamic Section Schema & Capabilities

Every section stored in `CmsPage.content.sections` adheres to the standard section interface:

```typescript
interface CmsSection {
  id: string;               // Stable UUID, e.g., "sec-a9f82d1b-3c4e"
  type: SectionType;        // "hero" | "markdown" | "cards" | "faq" | "vendors" | "cta" | "testimonials"
  title?: string;           // Section headline
  subtitle?: string;        // Section sub-headline / supporting copy
  order: number;            // 0-indexed display sort weight
  enabled: boolean;         // Visibility toggle
  config?: Record<string, any>; // Background color, alignment, column counts
  items?: any[];            // Section-specific repeater items (cards, questions, features)
}
```

### Detailed Section Capabilities

### 3.1 Hero Section (`type: "hero"`)
- **Fields:** `eyebrow`, `headline`, `subtitle`, `ctaPrimary` (label, url), `ctaSecondary` (label, url), `badgeText`.
- **Styling:** Dynamic dark-gradient with indigo highlights, responsive typography, and mobile-friendly CTA button stack.

### 3.2 Feature Grid / Cards Section (`type: "cards"`)
- **Fields:** `title`, `description`, `items[]` (`title`, `description`, `icon`, `badge`, `link`).
- **Interactive Reordering:** Super Admins can reorder cards and sections using the **Move Up** and **Move Down** controls in CMS Studio.
- **Responsive Layout:** Automatically shifts from 3 columns on desktop to 2 columns on tablet and 1 column on mobile.

### 3.3 Rich-Text Markdown Section (`type: "markdown"`)
- **Fields:** `body` (persisted GitHub-flavored markdown).
- **Renderer:** Parsed into accessible HTML with typography classes, syntax highlighting, callout quotes, and sanitized links.

### 3.4 Comparison & Vendor Matrix (`type: "vendors"`)
- **Fields:** `title`, `description`, `items[]` (`name`, `category`, `complianceScore`, `features[]`, `recommended`).
- **Use Case:** Showcasing payroll compliance, attendance integrations, or biometric hardware compatibility.

### 3.5 FAQ Accordion (`type: "faq"`)
- **Fields:** `items[]` (`question`, `answer`, `category`).
- **Interactivity:** Expandable/collapsible accordion with schema markup for Google Rich Snippets.

### 3.6 Conversion Call-To-Action (`type: "cta"`)
- **Fields:** `title`, `subtitle`, `buttonText`, `buttonUrl`, `secondaryText`.
- **Styling:** High-contrast conversion block designed to maximize trial signups or enterprise sales inquiries.

---

## 4. CMS Studio Section Reordering Workflow

In [`CMS/src/components/cms/blog-settings-editor.tsx`](file:///Users/apple/Documents/hrms/CMS/src/components/cms/blog-settings-editor.tsx), the section editor supports full drag-less reordering:

1. **Move Up:** Swaps position with the preceding section index and decrements `order`.
2. **Move Down:** Swaps position with the subsequent section index and increments `order`.
3. **Visibility Toggle:** Disables or enables public rendering without deleting content.
4. **Persist:** Clicking "Save Page" or "Publish Page" validates the updated array order and transmits the JSON payload to `/api/cms/pages/by-id/:id`.
5. **Public Revalidation:** The Next.js route `/p/[slug]` immediately reflects the updated section order upon revalidation.

---

## 5. Security & Isolation Controls
- **Content Sanitization:** Markdown and dynamic HTML strings pass through safe sanitizers preventing script injection (`XSS`).
- **Protocol Enforcement:** Only `http:`, `https:`, and `mailto:` URLs are allowed in CTA links.
- **Tenant Scope:** CMS pages are filtered by tenant workspace or platform administration scope.
