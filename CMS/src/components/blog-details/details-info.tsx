import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import BlogDetailsMarkdown from '@/src/components/blog-details/blog-details-markdown';
import RelatedBlog from '@/src/components/blog-details/related-blog';
import { ArticleShareControls } from '@/src/components/blog-details/article-share-controls';
import { BlogPost } from '@/src/interface/interface';
import Image from 'next/image';

const PLACEHOLDER_MAP: Record<string, string> = {
  '/images/ns-img-34.jpg': '/images/blog/blog-3.svg',
  '/images/ns-img-35.jpg': '/images/blog/blog-6.svg',
  '/images/ns-img-36.jpg': '/images/blog/blog-4.svg',
  '/images/ns-img-37.jpg': '/images/blog/blog-8.svg',
  '/images/ns-img-38.jpg': '/images/blog/blog-5.svg',
  '/images/ns-img-39.jpg': '/images/blog/blog-7.svg',
  '/images/opai-img-133.jpg': '/images/blog/blog-1.svg',
  '/images/opai-img-135.jpg': '/images/blog/blog-2.svg',
};

interface DetailsInfoProps {
  data: Partial<BlogPost>;
  content: string;
  relatedPosts?: Array<{
    slug: string;
    title: string;
    image: string;
    imageAlt: string;
    href: string;
    publishedAt: string;
    dateTime: string;
    readTime: string;
    category?: string;
  }>;
}

function extractConclusion(markdown: string) {
  if (!markdown) return { body: '', conclusion: null };
  const conclusionRegex = /(?:^|\n)#{2,3}\s+Conclusion\s*\n+([\s\S]*?)(?=(?:\n#{2,3}\s+|$))/i;
  const match = markdown.match(conclusionRegex);
  if (match) {
    const conclusionText = match[1].trim();
    const bodyText = markdown.replace(conclusionRegex, '\n').trim();
    return {
      body: bodyText,
      conclusion: conclusionText,
    };
  }
  return {
    body: markdown,
    conclusion: null,
  };
}

const DetailsInfo = ({ data, content, relatedPosts }: DetailsInfoProps) => {
  // Resolve raw cover image from multiple potential properties
  const rawCover =
    (data as any).coverImage ||
    data.image ||
    data.heroImageLeft ||
    '/images/blog/blog-1.svg';

  const resolvedCover =
    typeof rawCover === 'string'
      ? PLACEHOLDER_MAP[rawCover] || rawCover
      : rawCover;

  // Calculate dynamic reading time based on total word count
  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
  const calculatedMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const dynamicReadTime = data.readTime || `${calculatedMinutes} min read`;

  // Extract optional conclusion section
  const { body: mainBody, conclusion: conclusionText } = extractConclusion(content || '');

  return (
    <article className="pt-16 sm:pt-20 md:pt-28 pb-16">
      <div className="main-container max-w-[1100px] mx-auto px-4 sm:px-6 space-y-8 md:space-y-12">
        {/* ==========================================================
            1. COVER IMAGE / HERO (Single responsive banner, max-h 420px)
           ========================================================== */}
        <RevealAnimation delay={0.1}>
          <figure className="relative w-full max-h-[420px] aspect-[16/8] sm:aspect-[21/9] md:aspect-[16/7] overflow-hidden rounded-2xl border border-border/50 shadow-md bg-slate-900/10 dark:bg-slate-800/40">
            <Image
              src={resolvedCover}
              alt={(data.title as string) || 'Article cover image'}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1100px"
              className="object-cover"
              unoptimized
            />
          </figure>
        </RevealAnimation>

        {/* ==========================================================
            2. ARTICLE HEADING (<h1>)
           ========================================================== */}
        <RevealAnimation delay={0.15}>
          <TextReveal delay={0.15}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              {data.title}
            </h1>
          </TextReveal>
        </RevealAnimation>

        {/* ==========================================================
            3. AUTHOR PROFILE & METADATA
           ========================================================== */}
        <RevealAnimation delay={0.2}>
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-border/60">
            <div className="flex items-center gap-3.5">
              <figure className="size-11 overflow-hidden rounded-full ring-2 ring-primary/20 bg-muted shrink-0">
                <Image
                  src={(data.authorImage as string) || '/images/avatars/avatar-1.png'}
                  alt={(data.authorName as string) || 'Sofia Patel'}
                  width={44}
                  height={44}
                  className="size-full object-cover"
                />
              </figure>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {data.authorName || 'Sofia Patel'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <time dateTime={data.dateTime as string}>
                    {data.publishedAt || 'Published recently'}
                  </time>
                  <span>•</span>
                  <span>{dynamicReadTime}</span>
                </div>
              </div>
            </div>

            {Boolean(data.category) && (
              <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {typeof data.category === 'object' && data.category !== null
                  ? String((data.category as Record<string, any>).name || '')
                  : String(data.category)}
              </span>
            )}
          </div>
        </RevealAnimation>

        {/* ==========================================================
            4. ARTICLE CONTENT (Markdown body with proportional spacing)
           ========================================================== */}
        <div className="mx-auto max-w-[900px] w-full pt-2">
          <BlogDetailsMarkdown content={mainBody} />
        </div>

        {/* ==========================================================
            5. CONCLUSION (When supplied by content or metadata)
           ========================================================== */}
        {conclusionText && (
          <aside className="mx-auto max-w-[900px] w-full p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border border-primary/25 shadow-xs space-y-3 my-6">
            <div className="flex items-center gap-2.5 text-primary font-bold text-base md:text-lg">
              <span className="p-1 rounded-md bg-primary/15 text-primary">
                <i className="ph-duotone ph-sparkle text-lg"></i>
              </span>
              <span>Conclusion & Key Takeaways</span>
            </div>
            <p className="text-secondary/85 text-base md:text-lg leading-relaxed whitespace-pre-line font-normal">
              {conclusionText}
            </p>
          </aside>
        )}

        {/* ==========================================================
            6. SHARE CONTROLS
           ========================================================== */}
        <div className="mx-auto max-w-[900px] w-full pt-8 border-t border-border/50 space-y-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Share this article
            </p>
            <p className="text-xs text-muted-foreground/75 mt-0.5">
              Spread insights with your engineering & HR leadership networks.
            </p>
          </div>
          <ArticleShareControls
            slug={data.slug || ''}
            title={data.title || ''}
            canonicalUrlOverride={data.canonicalUrl}
          />
        </div>

        {/* ==========================================================
            7. RELATED ARTICLES (Dynamically loaded from database API)
           ========================================================== */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="pt-6">
            <RelatedBlog currentSlug={data.slug || ''} posts={relatedPosts} />
          </div>
        )}
      </div>
    </article>
  );
};

export default DetailsInfo;
