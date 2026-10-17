import RevealAnimation from '@/src/components/animation/reveal-animation';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';

interface ServiceDetailsMarkdownProps {
  content: string;
}

const ServiceDetailsMarkdown = ({ content }: ServiceDetailsMarkdownProps) => {
  return (
    <section className="py-20 md:py-25 lg:py-39" aria-label="Service details">
      <div className="main-container">
        <RevealAnimation delay={0.1}>
          <div className="service-details-markdown">
            <ReactMarkdown rehypePlugins={[rehypeSlug]}>{content}</ReactMarkdown>
          </div>
        </RevealAnimation>

        <RevealAnimation
          delay={0.1}
          asChild={false}
          className="mt-10 inline-block w-auto text-center md:mt-14 lg:mt-18"
        >
          <Link href="/contact">
            <ButtonWhite
              className="mx-auto w-[80%]! md:w-fit!"
              textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
            >
              Book an automation strategy call
            </ButtonWhite>
          </Link>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default ServiceDetailsMarkdown;
