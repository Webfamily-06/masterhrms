import BlogList, { type FormattedPost } from '@/src/components/blog/blog-list';
import Testimonial from '@/src/components/home/testimonial';
import CTA from '@/src/components/shared/cta';
import { BlogPost } from '@/src/interface/interface';
import { generateMetadata } from '@/src/utils/generateMetaData';
import getMarkDownData from '@/src/utils/getMarkDownData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...generateMetadata(),
  title: 'Blog & Workforce Insights || Master HRMS',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Page = async () => {
  let cmsPosts: FormattedPost[] = [];
  try {
    const res = await fetch('http://localhost:4000/api/cms/blogs', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cmsPosts = data
          .filter((p: any) => p.published)
          .map((p: any) => {
            const c = p.content || {};
            const rawSlug = p.slug.replace(/^blog-/, '');
            return {
              slug: rawSlug,
              title: p.title || 'Untitled Post',
              image: c.coverImage || '/images/blog/blog-1.jpg',
              imageAlt: p.title || 'Master HRMS Blog Post',
              href: `/blog/${rawSlug}`,
              publishedAt:
                c.publishedAt ||
                (p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'),
              dateTime: p.created_at || new Date().toISOString(),
              readTime: c.readTime || '5 min read',
              category: c.category || 'ERP Systems',
              tags: Array.isArray(c.tags) ? c.tags : ['ERP'],
              imageHeight: 'h-[420px]',
            };
          });
      }
    }
  } catch {}

  const staticMarkdownPosts = getMarkDownData<BlogPost>('src/data/blog', false, 'order');
  const fallbackPosts: FormattedPost[] = staticMarkdownPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    image: p.image,
    imageAlt: p.title,
    href: `/blog/${p.slug}`,
    publishedAt: p.publishedAt,
    dateTime: p.dateTime,
    readTime: p.readTime,
    category: 'Automation Insights',
    tags: ['Automation', 'Workflows'],
    imageHeight: p.imageHeight,
  }));

  const cmsSlugs = new Set(cmsPosts.map((b) => b.slug));
  const mergedPosts = [...cmsPosts, ...fallbackPosts.filter((f) => !cmsSlugs.has(f.slug))];

  return (
    <>
      <BlogList initialPosts={mergedPosts} />
      <Testimonial />
      <CTA />
    </>
  );
};

export default Page;
