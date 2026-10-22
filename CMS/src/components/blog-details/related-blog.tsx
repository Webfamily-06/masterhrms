import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BlogCard } from '@/src/components/shared/ui/card';
import { BlogPost } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';

interface RelatedBlogProps {
  currentSlug: string;
  posts?: Array<{
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

const RelatedBlog = ({ currentSlug, posts: propPosts }: RelatedBlogProps) => {
  let displayPosts = propPosts;

  if (!displayPosts || displayPosts.length === 0) {
    displayPosts = getMarkDownData<BlogPost>('src/data/blog', false, 'order')
      .filter((post) => post.slug !== currentSlug)
      .slice(0, 3)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        image: p.image,
        imageAlt: p.title,
        href: `/blog/${p.slug}`,
        publishedAt: p.publishedAt,
        dateTime: p.dateTime,
        readTime: p.readTime,
      }));
  }

  if (!displayPosts || displayPosts.length === 0) {
    return null;
  }

  return (
    <section className="pt-16 md:pt-24 border-t border-border/40 mt-16 md:mt-24">
      <div className="main-container space-y-8 md:space-y-12">
        <div className="space-y-3 text-center max-md:pb-2">
          <TextReveal delay={0.1}>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Related articles</h2>
          </TextReveal>
          <TextReveal delay={0.2}>
            <p className="text-tagline-1 text-muted-foreground mx-auto max-w-[520px]">
              More enterprise guides on workflows, integrations, and intelligent automation.
            </p>
          </TextReveal>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayPosts.map((post, index) => (
            <RevealAnimation key={post.slug} delay={0.1 * (index + 1)}>
              <BlogCard
                image={post.image}
                imageAlt={post.title}
                title={post.title}
                href={post.href || `/blog/${post.slug}`}
                publishedAt={post.publishedAt}
                dateTime={post.dateTime}
                readTime={post.readTime}
              />
            </RevealAnimation>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedBlog;
