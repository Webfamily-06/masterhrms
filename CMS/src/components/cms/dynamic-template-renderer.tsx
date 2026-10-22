'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { safeMarkdownComponents } from '@/src/lib/safe-markdown-components';
import { sanitizeHtml } from '@/src/lib/html-sanitizer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  MessageSquareQuote,
  Star,
  ExternalLink,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export interface CmsSection {
  id?: string;
  type?: 'hero' | 'cards' | 'rich-text' | 'faq' | 'testimonials' | 'cta' | 'vendors' | 'features';
  title?: string;
  badge?: string;
  body?: string;
  html?: string;
  enabled?: boolean;
  order?: number;
  [key: string]: any;
}

export interface DynamicPageContent {
  template?: 'landing' | 'content' | 'pricing' | 'legal' | 'compare' | 'standard';
  hero?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    primary_cta_text?: string;
    primary_cta_url?: string;
    secondary_cta_text?: string;
    secondary_cta_url?: string;
  };
  body?: string;
  html?: string;
  sections?: CmsSection[];
  faqs?: { question: string; answer: string }[];
  testimonials?: { quote: string; author: string; role?: string; company?: string; rating?: number }[];
  vendors?: { name: string; us?: boolean; notes?: string }[];
  cta?: {
    heading?: string;
    subtitle?: string;
    buttonText?: string;
    buttonUrl?: string;
  };
  [key: string]: any;
}

interface DynamicTemplateRendererProps {
  content: DynamicPageContent;
  fallbackTitle?: string;
}

function sanitizeUrl(url?: string | null, fallback = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') {
      return trimmed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function DynamicTemplateRenderer({ content, fallbackTitle }: DynamicTemplateRendererProps) {
  const hero = content.hero || {};
  const heroTitle = hero.title || fallbackTitle || 'Enterprise Cloud Systems';
  const heroSubtitle = hero.subtitle || '';
  const heroEyebrow = hero.eyebrow || '';

  // Filter sections by enabled state if specified (defaulting to enabled)
  const rawSections: CmsSection[] = Array.isArray(content.sections) ? content.sections : [];
  const activeSections = rawSections
    .filter((s) => s.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="w-full space-y-16 pb-20">
      {/* 1. Hero Template Component */}
      {(heroTitle || heroSubtitle || heroEyebrow) && (
        <section className="relative pt-16 pb-12 text-center max-w-4xl mx-auto px-6 space-y-5">
          {heroEyebrow && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>{heroEyebrow}</span>
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {heroTitle}
          </h1>
          {heroSubtitle && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {heroSubtitle}
            </p>
          )}
          {(hero.primary_cta_text || hero.secondary_cta_text) && (
            <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
              {hero.primary_cta_text && (
                <Button size="lg" asChild className="gap-2 font-semibold">
                  <a href={sanitizeUrl(hero.primary_cta_url, '/pricing')}>
                    {hero.primary_cta_text} <ArrowRight className="size-4" />
                  </a>
                </Button>
              )}
              {hero.secondary_cta_text && (
                <Button size="lg" variant="outline" asChild>
                  <a href={sanitizeUrl(hero.secondary_cta_url, '/contact')}>{hero.secondary_cta_text}</a>
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* 2. Custom HTML Content (if present) */}
      {content.html && (
        <section className="max-w-4xl mx-auto px-6">
          <div
            className="prose dark:prose-invert prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html) }}
          />
        </section>
      )}

      {/* 3. Main Markdown Rich-Text Body (fallback if no explicit html) */}
      {content.body && !content.html && (
        <section className="max-w-4xl mx-auto px-6">
          <div className="prose dark:prose-invert prose-slate max-w-none prose-headings:font-bold prose-a:text-primary">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
              components={safeMarkdownComponents}
            >
              {content.body}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* 3. Reusable Dynamic Sections & Cards Grid */}
      {activeSections.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className="p-6 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs space-y-3 shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-foreground">{sec.title || 'Feature Highlight'}</h3>
                  {sec.badge && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {sec.badge}
                    </Badge>
                  )}
                </div>
                {sec.body && (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {sec.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Comparison Table Section (if present) */}
      {content.vendors && content.vendors.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 space-y-4">
          <h2 className="text-2xl font-bold text-center text-foreground">Competitive Architecture Comparison</h2>
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/40 border-b border-border/70">
                <tr>
                  <th className="text-left p-3.5 font-semibold text-foreground">Vendor / System</th>
                  <th className="text-left p-3.5 font-semibold text-foreground">Architectural Notes</th>
                  <th className="text-center p-3.5 font-semibold text-foreground">Enterprise Fit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {content.vendors.map((v) => (
                  <tr key={v.name} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">{v.name}</td>
                    <td className="p-3.5 text-muted-foreground">{v.notes || '—'}</td>
                    <td className="p-3.5 text-center">
                      {v.us ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="size-3.5" /> Recommended
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. FAQs Dynamic Section (if present) */}
      {content.faqs && content.faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <HelpCircle className="size-5 text-primary" /> Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">Answers to common operational and architectural questions.</p>
          </div>
          <div className="space-y-3">
            {content.faqs.map((faq, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{faq.question}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Testimonials Dynamic Section (if present) */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-2xl font-bold text-center text-foreground flex items-center justify-center gap-2">
            <MessageSquareQuote className="size-5 text-primary" /> Customer Stories & Reviews
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.testimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-border/70 bg-card space-y-3 shadow-xs">
                {t.rating && (
                  <div className="flex gap-1 text-amber-500">
                    {Array.from({ length: t.rating }).map((_, r) => (
                      <Star key={r} className="size-3.5 fill-current" />
                    ))}
                  </div>
                )}
                <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="pt-1 text-xs">
                  <div className="font-semibold text-foreground">{t.author}</div>
                  {(t.role || t.company) && (
                    <div className="text-muted-foreground text-[11px]">
                      {[t.role, t.company].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Call To Action (CTA) Component */}
      {content.cta && (
        <section className="max-w-4xl mx-auto px-6">
          <div className="p-8 sm:p-12 rounded-2xl border border-primary/30 bg-primary/5 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {content.cta.heading || 'Ready to modernize your workforce?'}
            </h2>
            {content.cta.subtitle && (
              <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {content.cta.subtitle}
              </p>
            )}
            <div className="pt-2">
              <Button size="lg" asChild className="font-semibold gap-2">
                <a href={sanitizeUrl(content.cta.buttonUrl, '/pricing')}>
                  {content.cta.buttonText || 'Explore Enterprise Plans'} <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
