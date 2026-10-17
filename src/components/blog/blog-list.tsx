import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { BlogCard } from '@/src/components/shared/ui/card';
import { BlogPost } from '@/src/interface/interface';
import getMarkDownData from '@/src/utils/getMarkDownData';

const posts = getMarkDownData<BlogPost>('src/data/blog', false, 'order');

const BlogList = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-8 md:space-y-14">
        <div className="space-y-3 text-center max-md:pb-4">
          <RevealAnimation delay={0.1}>
            <BadgePrimary>Blog</BadgePrimary>
          </RevealAnimation>

          <TextReveal delay={0.2}>
            <h2>Stay ahead with automation insights</h2>
          </TextReveal>

          <TextReveal delay={0.3}>
            <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[400px]">
              Practical guides on workflows, integrations, operations, and AI-powered execution for
              modern teams.
            </p>
          </TextReveal>
        </div>

        <div className="grid grid-cols-1 items-start justify-start gap-8 lg:grid-cols-3">
          {posts.map((post, index) => (
            <RevealAnimation key={post.slug} delay={0.1 * ((index % 3) + 1)}>
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

export default BlogList;
