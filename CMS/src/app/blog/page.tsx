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

const Page = () => {
  const staticMarkdownPosts = getMarkDownData<BlogPost>('src/data/blog', false, 'order');
  const initialPosts: FormattedPost[] = staticMarkdownPosts.map((p) => ({
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

  return (
    <>
      <BlogList initialPosts={initialPosts} />
      <Testimonial />
      <CTA />
    </>
  );
};

export default Page;
