import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import BlogDetailsMarkdown from '@/src/components/blog-details/blog-details-markdown';
import { SocialIcons } from '@/src/components/shared/social-icons';
import { BlogPost } from '@/src/interface/interface';
import Image from 'next/image';

const SHARE_SOCIAL_LINKS = [
  { name: 'Facebook', href: 'https://www.facebook.com/' },
  { name: 'Instagram', href: 'https://www.instagram.com/' },
  { name: 'X', href: 'https://x.com/' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { name: 'YouTube', href: 'https://www.youtube.com/' },
] as const;

interface DetailsInfoProps {
  data: Partial<BlogPost>;
  content: string;
}

const DetailsInfo = ({ data, content }: DetailsInfoProps) => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container overflow-hidden">
        <div className="flex flex-col gap-8 pb-8 md:flex-row">
          <RevealAnimation
            asChild={false}
            delay={0.1}
            direction="left"
            className="h-[400px] w-full overflow-hidden rounded-lg md:h-[750px]"
          >
            <figure>
              <Image
                src={data.heroImageLeft as string}
                alt="Blog details"
                width={800}
                height={750}
                className="size-full object-cover"
                priority
              />
            </figure>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.1}
            direction="right"
            className="h-[400px] w-full overflow-hidden rounded-lg md:h-[750px]"
          >
            <figure>
              <Image
                src={data.heroImageRight as string}
                alt="Blog details"
                width={800}
                height={750}
                className="size-full object-cover"
                priority
              />
            </figure>
          </RevealAnimation>
        </div>

        <RevealAnimation asChild={false} delay={0.2} className="space-y-4">
          <TextReveal delay={0.2}>
            <h2>{data.title}</h2>
          </TextReveal>

          <div className="flex items-center gap-3">
            <figure className="size-12 overflow-hidden rounded-full">
              <Image
                src={data.authorImage as string}
                alt={data.authorName as string}
                width={48}
                height={48}
                className="size-full object-cover"
              />
            </figure>
            <div className="flex flex-col gap-0.5">
              <p className="text-tagline-2 text-secondary font-medium">{data.authorName}</p>
              <time
                dateTime={data.dateTime as string}
                className="text-tagline-3 text-secondary/60 flex items-center gap-x-2 font-normal"
              >
                {data.publishedAt}
                <span className="bg-secondary/30 size-1.5 rounded-full" />
                <span className="text-tagline-3 text-secondary/60">
                  Reading time {data.readTime}
                </span>
              </time>
            </div>
          </div>
        </RevealAnimation>

        <div className="mx-auto mt-14 max-w-[1050px] md:mt-[70px]">
          <BlogDetailsMarkdown content={content} />

          <RevealAnimation asChild={false} delay={0.2} className="mt-[70px]">
            <div className="space-y-4">
              <p className="text-tagline-2 text-secondary/90 font-semibold">Share this post</p>
              <SocialIcons links={SHARE_SOCIAL_LINKS} iconClassName="stroke-secondary" />
            </div>

            <div className="bg-stroke-3 my-6 h-px w-full" />

            <div className="flex items-center gap-x-3">
              <figure className="size-12 overflow-hidden rounded-full">
                <Image
                  src={data.footerAuthorImage as string}
                  alt={data.footerAuthorName as string}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                />
              </figure>
              <div>
                <p className="text-tagline-2 text-secondary/90 font-semibold">
                  {data.footerAuthorName}
                </p>
                <p className="text-tagline-3 text-secondary/60 flex items-center gap-x-[5px] font-normal">
                  <span>{data.footerPublishedAt}</span>
                  <span>•</span>
                  <span>{data.footerReadTime}</span>
                </p>
              </div>
            </div>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default DetailsInfo;
