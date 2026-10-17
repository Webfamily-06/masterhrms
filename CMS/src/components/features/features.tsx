import avatarImgOne from '@/public/images/ns-avatar-13.jpg';
import avatarImgTwo from '@/public/images/ns-avatar-14.jpg';
import featureImgOne from '@/public/images/opai-img-126.jpg';
import featureImgTwo from '@/public/images/opai-img-127.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import Image from 'next/image';

const featureCards = [
  {
    type: 'image' as const,
    src: featureImgOne,
    alt: 'Core Features',
  },
  {
    type: 'card' as const,
    variant: 'white' as const,
    title: 'Workflow builder',
    description:
      'Build multi-step automation with triggers, conditions, and actions across your stack.',
  },
  {
    type: 'image' as const,
    src: avatarImgTwo,
    alt: 'Core Features',
  },
  {
    type: 'card' as const,
    variant: 'white' as const,
    title: 'Real-time monitoring',
    description: 'Track run history, error rates, and completion trends from one dashboard.',
  },
  {
    type: 'card' as const,
    variant: 'accent' as const,
    title: 'App integrations',
    description: 'Connect CRM, support, payments, and internal tools with ready-made connectors.',
  },
  {
    type: 'image' as const,
    src: featureImgTwo,
    alt: 'Core Features',
  },
  {
    type: 'card' as const,
    variant: 'accent' as const,
    title: 'Governance & control',
    description: 'Manage permissions, approval steps, and audit logs for safe automation at scale.',
  },
  {
    type: 'image' as const,
    src: avatarImgOne,
    alt: 'Core Features',
  },
];

const FeaturesSection = () => {
  return (
    <section className="pt-20 pb-13 md:pt-25 md:pb-20 lg:pt-39 lg:pb-28 xl:pb-36">
      <div className="main-container space-y-10 md:space-y-14">
        <div className="space-y-3 text-center md:pb-4">
          <div className="space-y-2 text-center md:space-y-3">
            <RevealAnimation delay={0.1}>
              <BadgePrimary>Core features</BadgePrimary>
            </RevealAnimation>

            <TextReveal delay={0.2}>
              <h2 className="mx-auto max-w-[650px]">Everything you need to automate smarter</h2>
            </TextReveal>

            <TextReveal delay={0.3}>
              <p className="text-tagline-1 text-secondary/60">
                Unlock a powerful automation suite designed to streamline operations,
                <br className="hidden md:block" />
                connect your tools, and keep your workflows reliable.
              </p>
            </TextReveal>
          </div>
        </div>

        <RevealAnimation
          delay={0.1}
          asChild={false}
          className="relative grid w-full grid-cols-1 gap-8 overflow-hidden rounded-2xl bg-[url('/images/opai-img-138.jpg')] bg-cover bg-center bg-no-repeat p-4 md:grid-cols-2 md:p-8 lg:grid-cols-4"
        >
          {featureCards.map((item) => {
            if (item.type === 'image') {
              return (
                <figure key={item.src.src} className="overflow-hidden rounded-xl">
                  <Image src={item.src} alt={item.alt} className="size-full object-cover" />
                </figure>
              );
            }

            const isAccent = item.variant === 'accent';

            return (
              <div
                key={item.title}
                className={`flex flex-col justify-between rounded-xl p-10.5 ${
                  isAccent ? 'bg-background-4' : 'bg-white'
                }`}
              >
                <TextReveal delay={0.1}>
                  <h3 className={`text-heading-4 ${isAccent ? '' : 'text-secondary/80'}`}>
                    {item.title}
                  </h3>
                </TextReveal>
                <TextReveal delay={0.2}>
                  <p className={`text-tagline-2 ${isAccent ? '' : 'text-secondary/50'}`}>
                    {item.description}
                  </p>
                </TextReveal>
              </div>
            );
          })}
        </RevealAnimation>
      </div>
    </section>
  );
};

export default FeaturesSection;
