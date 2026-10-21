'use client';

import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { useCmsPage } from '@/src/hooks/use-cms-page';

export const OurTeamHeader = () => {
  const { content } = useCmsPage('team');
  const hero = content?.hero || {};
  const eyebrow = hero.eyebrow || 'Meet the team';
  const title = hero.title || 'The minds behind Nexsas';
  const subtitle =
    hero.subtitle ||
    'Our team brings together product, design, and engineering to ship automation people rely on. Every release is shaped by feedback from teams like yours.';

  return (
    <div className="space-y-1.5 text-center md:space-y-3 md:pb-6">
      <RevealAnimation delay={0.1}>
        <BadgePrimary>{eyebrow}</BadgePrimary>
      </RevealAnimation>

      <TextReveal delay={0.2}>
        <h2>{title}</h2>
      </TextReveal>

      <TextReveal delay={0.3}>
        <p className="text-background-14/60 mx-auto max-w-[640px]">
          {subtitle}
        </p>
      </TextReveal>
    </div>
  );
};
