'use client';

import { useState, useEffect, useMemo } from 'react';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { BlogCard } from '@/src/components/shared/ui/card';

export interface FormattedPost {
  slug: string;
  title: string;
  image: string;
  imageAlt: string;
  href: string;
  publishedAt: string;
  dateTime: string;
  readTime: string;
  category?: string;
  tags?: string[];
  imageHeight?: string;
}

const DEFAULT_POSTS: FormattedPost[] = [];

interface BlogListProps {
  initialPosts?: FormattedPost[];
}

const BlogList = ({ initialPosts }: BlogListProps) => {
  const basePosts = initialPosts && initialPosts.length > 0 ? initialPosts : DEFAULT_POSTS;
  const [posts, setPosts] = useState<FormattedPost[]>(basePosts);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  useEffect(() => {
    let isMounted = true;
    async function loadCmsBlogs() {
      try {
        let res = await fetch('/api/cms/blogs');
        if (!res.ok) {
          res = await fetch('/api/cms/pages');
        }
        if (!res.ok) return;
        const allPages = await res.json();
        if (Array.isArray(allPages) && isMounted) {
          const cmsBlogs: FormattedPost[] = allPages
            .filter((p: any) => (p.slug && p.slug.startsWith('blog-') || p.slug === 'resource-blogs') && p.published)
            .map((p: any) => {
              const c = p.content || {};
              const rawSlug = p.slug.replace(/^blog-/, '');
              return {
                slug: rawSlug,
                title: p.title || 'Untitled Post',
                image: c.coverImage || '/images/blog/blog-1.svg',
                imageAlt: p.title || 'Master HRMS Blog Post',
                href: `/blog/${rawSlug}`,
                publishedAt:
                  c.publishedAt ||
                  (p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'),
                dateTime: p.created_at || new Date().toISOString(),
                readTime: c.readTime || '5 min read',
                category: c.category || 'ERP Systems',
                tags: Array.isArray(c.tags) ? c.tags : ['ERP'],
                imageHeight: 'h-auto',
              };
            });

          if (cmsBlogs.length > 0) {
            setPosts(cmsBlogs);
          }
        }
      } catch {
        // Fallback to basePosts
      }
    }
    loadCmsBlogs();
    return () => {
      isMounted = false;
    };
  }, [basePosts]);

  // Compute available categories and tags dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [posts]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => set.add(t));
      }
    });
    return ['All', ...Array.from(set)];
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchTag = selectedTag === 'All' || (p.tags && p.tags.includes(selectedTag));
      return matchCat && matchTag;
    });
  }, [posts, selectedCategory, selectedTag]);

  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-8 md:space-y-12">
        <div className="space-y-3 text-center max-md:pb-4">
          <RevealAnimation delay={0.1}>
            <BadgePrimary>Blog & Insights</BadgePrimary>
          </RevealAnimation>

          <TextReveal delay={0.2}>
            <h2>Stay ahead with workforce & ERP insights</h2>
          </TextReveal>

          <TextReveal delay={0.3}>
            <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[480px]">
              Practical guides on modern payroll, HRMS compliance, talent automation, and
              enterprise architecture.
            </p>
          </TextReveal>

          {/* Interactive Category Filter Pills */}
          <div className="pt-4 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-secondary text-white shadow-xs'
                    : 'bg-white border border-stroke-3 text-secondary/70 hover:border-secondary/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tag Filter Pills */}
          {tags.length > 2 && (
            <div className="pt-2 flex flex-wrap justify-center items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[11px] font-medium mr-1">Tags:</span>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-primary/20 text-primary font-semibold'
                      : 'hover:text-foreground text-secondary/50'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Blog Post Grid */}
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground rounded-2xl bg-white border border-stroke-3">
            No articles found matching the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start justify-start gap-8 lg:grid-cols-3">
            {filteredPosts.map((post, index) => (
              <RevealAnimation key={post.slug} delay={0.1 * ((index % 3) + 1)}>
                <BlogCard
                  image={post.image}
                  imageAlt={post.imageAlt}
                  title={post.title}
                  href={post.href}
                  publishedAt={post.publishedAt}
                  dateTime={post.dateTime}
                  readTime={post.readTime}
                  figureClassName={post.imageHeight}
                />
              </RevealAnimation>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogList;
