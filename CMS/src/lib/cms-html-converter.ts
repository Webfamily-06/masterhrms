/**
 * MASTERHRMS — CMS Content <-> HTML Converter
 *
 * Provides bidirectional conversion between structured DynamicPageContent
 * (Hero, Sections, Cards, Body, FAQs, Testimonials, CTA) and semantic HTML markup.
 * Preserves structured fields when switching between Visual and HTML editors.
 */

import { DynamicPageContent, CmsSection } from '@/components/cms/dynamic-template-renderer';
import { sanitizeHtml } from './html-sanitizer';

/**
 * Converts a structured CMS content object into semantic HTML markup
 */
export function contentToHtml(content: DynamicPageContent, pageTitle = 'Page Title'): string {
  if (!content) return `<h1>${escapeHtml(pageTitle)}</h1>\n<p>Welcome to this page.</p>`;

  // If explicit HTML is present and contains content, return that
  if (content.html && content.html.trim()) {
    return content.html;
  }

  const parts: string[] = [];

  // 1. Hero Section
  const hero = content.hero;
  if (hero && (hero.title || hero.subtitle || hero.eyebrow)) {
    parts.push('<section class="hero">');
    if (hero.eyebrow) {
      parts.push(`  <span class="eyebrow">${escapeHtml(hero.eyebrow)}</span>`);
    }
    const hTitle = hero.title || pageTitle;
    parts.push(`  <h1>${escapeHtml(hTitle)}</h1>`);
    if (hero.subtitle) {
      parts.push(`  <p class="subtitle">${escapeHtml(hero.subtitle)}</p>`);
    }
    if (hero.primary_cta_text || hero.secondary_cta_text) {
      parts.push('  <div class="hero-actions">');
      if (hero.primary_cta_text) {
        parts.push(`    <a href="${escapeHtml(hero.primary_cta_url || '/pricing')}" class="cta-button">${escapeHtml(hero.primary_cta_text)}</a>`);
      }
      if (hero.secondary_cta_text) {
        parts.push(`    <a href="${escapeHtml(hero.secondary_cta_url || '/contact')}" class="secondary-button">${escapeHtml(hero.secondary_cta_text)}</a>`);
      }
      parts.push('  </div>');
    }
    parts.push('</section>\n');
  } else if (!content.body && (!content.sections || content.sections.length === 0)) {
    parts.push(`<h1>${escapeHtml(pageTitle)}</h1>\n<p>Start editing this page content here.</p>\n`);
  }

  // 2. Main Body (if markdown or html)
  if (content.body && content.body.trim()) {
    parts.push('<section class="main-content">');
    // If body looks like HTML already, include directly; otherwise wrap paragraphs
    if (/<[a-z][\s\S]*>/i.test(content.body)) {
      parts.push(`  ${content.body.trim()}`);
    } else {
      const paragraphs = content.body.split('\n\n');
      for (const p of paragraphs) {
        if (p.trim()) {
          parts.push(`  <p>${escapeHtml(p.trim())}</p>`);
        }
      }
    }
    parts.push('</section>\n');
  }

  // 3. Dynamic Sections & Feature Cards
  const sections: CmsSection[] = Array.isArray(content.sections) ? content.sections : [];
  const enabledSections = sections.filter((s) => s.enabled !== false);
  if (enabledSections.length > 0) {
    parts.push('<section class="features-section">');
    parts.push('  <h2>Key Features & Highlights</h2>');
    parts.push('  <div class="cards-grid">');
    for (const sec of enabledSections) {
      parts.push('    <div class="card">');
      if (sec.badge) {
        parts.push(`      <span class="badge">${escapeHtml(sec.badge)}</span>`);
      }
      parts.push(`      <h3>${escapeHtml(sec.title || 'Feature')}</h3>`);
      if (sec.body) {
        parts.push(`      <p>${escapeHtml(sec.body)}</p>`);
      }
      parts.push('    </div>');
    }
    parts.push('  </div>');
    parts.push('</section>\n');
  }

  // 4. FAQs
  if (content.faqs && content.faqs.length > 0) {
    parts.push('<section class="faqs-section">');
    parts.push('  <h2>Frequently Asked Questions</h2>');
    for (const faq of content.faqs) {
      parts.push('  <div class="faq-item">');
      parts.push(`    <h4>${escapeHtml(faq.question)}</h4>`);
      parts.push(`    <p>${escapeHtml(faq.answer)}</p>`);
      parts.push('  </div>');
    }
    parts.push('</section>\n');
  }

  // 5. Testimonials
  if (content.testimonials && content.testimonials.length > 0) {
    parts.push('<section class="testimonials-section">');
    parts.push('  <h2>What Leaders Say</h2>');
    parts.push('  <div class="cards-grid">');
    for (const t of content.testimonials) {
      parts.push('    <div class="card testimonial">');
      parts.push(`      <blockquote>&ldquo;${escapeHtml(t.quote)}&rdquo;</blockquote>`);
      parts.push(`      <p class="author"><strong>${escapeHtml(t.author)}</strong>${t.role ? ` — ${escapeHtml(t.role)}` : ''}</p>`);
      parts.push('    </div>');
    }
    parts.push('  </div>');
    parts.push('</section>\n');
  }

  // 6. CTA Banner
  if (content.cta && (content.cta.heading || content.cta.buttonText)) {
    parts.push('<section class="cta-banner">');
    parts.push(`  <h2>${escapeHtml(content.cta.heading || 'Get Started with Master HRMS')}</h2>`);
    if (content.cta.subtitle) {
      parts.push(`  <p>${escapeHtml(content.cta.subtitle)}</p>`);
    }
    if (content.cta.buttonText) {
      parts.push(`  <a href="${escapeHtml(content.cta.buttonUrl || '/pricing')}" class="cta-button">${escapeHtml(content.cta.buttonText)}</a>`);
    }
    parts.push('</section>');
  }

  return parts.join('\n');
}

/**
 * Updates a DynamicPageContent object with changes made in the HTML / Source editor
 * Preserves structured configuration properties while updating the html and body representations
 */
export function htmlToContent(
  html: string,
  existingContent: DynamicPageContent = {}
): DynamicPageContent {
  const sanitized = sanitizeHtml(html);

  return {
    ...existingContent,
    html: sanitized,
    // Keep body in sync with raw markup so existing renderers display the updated content
    body: sanitized,
  };
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
