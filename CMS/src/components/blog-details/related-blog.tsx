import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BlogCard } from '@/src/components/shared/ui/card';
import { BlogPost } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';

interface RelatedBlogProps {
  currentSlug: string;
}

const RelatedBlog = ({ currentSlug }: RelatedBlogProps) => {
  const posts = getMarkDownData<BlogPost>('src/data/blog', false, 'order')
    .filter((post) => post.slug !== currentSlug)
    .slice(0, 3);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-8 md:space-y-14">
        <div className="space-y-3 text-center max-md:pb-4">
          <TextReveal delay={0.1}>
            <h2>Related articles</h2>
          </TextReveal>
          <TextReveal delay={0.2}>
            <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[480px]">
              More guides on workflows, integrations, and automation for modern teams.
            </p>
          </TextReveal>
        </div>

        <div className="grid grid-cols-1 gap-x-8 max-lg:gap-y-14 lg:grid-cols-3">
          {posts.map((post, index) => (
            <RevealAnimation key={post.slug} delay={0.1 * (index + 1)}>
              <BlogCard
                image={post.image}
                imageAlt={post.title}
                title={post.title}
                href={`/blog/${post.slug}`}
                publishedAt={post.publishedAt}
                dateTime={post.dateTime}
                readTime={post.readTime}
                figureClassName={post.imageHeight}
              />
            </RevealAnimation>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedBlog;
