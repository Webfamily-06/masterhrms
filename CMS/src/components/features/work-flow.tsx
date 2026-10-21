import workflowImg from '@/public/images/ns-img-31.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Image from 'next/image';
import Link from 'next/link';

const listItemClass =
  "relative pl-4 text-tagline-2 text-secondary/60 before:absolute before:left-0 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-secondary/60 before:content-['']";

const workflowCards = [
  {
    title: 'For SaaS companies',
    titleClassName: 'text-heading-5 text-secondary/80',
    items: [
      'AI-powered docs, release notes, and in-app copy',
      'Support and help content that stays on-brand',
      'Product and feature descriptions at scale',
    ],
  },
  {
    title: 'For marketing teams',
    titleClassName: 'text-heading-4 text-secondary/80',
    items: [
      'Campaign copy, ads, and landing pages in minutes',
      'Social posts and email sequences that convert',
    ],
  },
];

const WorkFlow = () => {
  return (
    <section className="overflow-hidden pt-20 pb-20 md:pt-25 md:pb-25 lg:pt-39 lg:pb-39">
      <div className="main-container space-y-10 md:space-y-14">
        <div className="space-y-3 text-center md:pb-4">
          <div className="space-y-2 text-center md:space-y-3">
            <TextReveal delay={0.1}>
              <h2>Features that fit your workflow</h2>
            </TextReveal>
            <TextReveal delay={0.2}>
              <p className="text-tagline-1 text-secondary/60">
                Nexsas is designed to streamline your workflow and help you create content faster
                and smarter.
              </p>
            </TextReveal>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-8">
            {workflowCards.map((card, index) => (
              <RevealAnimation
                asChild={false}
                key={card.title}
                delay={0.1 + index * 0.1}
                className="border-stroke-1 bg-accent space-y-7 rounded-xl border-8 p-7 text-left lg:p-10.5"
              >
                <TextReveal delay={0.1}>
                  <h3 className={card.titleClassName}>{card.title}</h3>
                </TextReveal>
                <RevealAnimation asChild={false} delay={0.2}>
                  <ul className="space-y-1.5">
                    {card.items.map((item) => (
                      <li key={item} className={listItemClass}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </RevealAnimation>
              </RevealAnimation>
            ))}
          </div>

          <RevealAnimation
            asChild={false}
            delay={0.3}
            className="border-stroke-1 bg-accent space-y-7 rounded-xl border-8 p-7 text-left lg:p-10.5"
          >
            <TextReveal delay={0.1}>
              <h3 className="text-heading-4 text-secondary/80">For agencies & studios</h3>
            </TextReveal>
            <RevealAnimation delay={0.2}>
              <ul className="space-y-1.5">
                <li className={listItemClass}>Client briefs, proposals, and reports on demand</li>
                <li className={listItemClass}>Multi-brand content without doubling your team</li>
                <li className="max-h-[250px] overflow-hidden rounded-lg">
                  <Image
                    src={workflowImg}
                    alt="Feature Work Flow"
                    className="size-full object-cover"
                  />
                </li>
              </ul>
            </RevealAnimation>
          </RevealAnimation>
        </div>

        <RevealAnimation delay={0.4} asChild={false} className="flex items-center justify-center">
          <Link href="/contact">
            <ButtonWhite
              className="w-full md:w-auto"
              textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
            >
              Get a strategy call
            </ButtonWhite>
          </Link>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default WorkFlow;
