import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import Link from 'next/link';

const ServicesHero = () => {
  return (
    <section className="overflow-hidden pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="space-y-10 md:space-y-14">
          <div className="space-y-2 text-center md:space-y-3">
            <TextReveal delay={0.1}>
              <h2>
                Transform operations with <br className="hidden md:block" />
                automation services
              </h2>
            </TextReveal>

            <TextReveal delay={0.2}>
              <p className="text-tagline-1 text-secondary/60 mx-auto max-w-[560px]">
                Nexsas helps teams design, launch, and scale automation systems that reduce manual
                work and improve execution across the business.
              </p>
            </TextReveal>
          </div>

          <RevealAnimation delay={0.3} asChild={false} className="flex items-center justify-center">
            <Link href="/contact">
              <ButtonWhite
                className="w-full md:w-auto"
                textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
              >
                Talk to our automation experts
              </ButtonWhite>
            </Link>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default ServicesHero;
