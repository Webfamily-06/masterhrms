import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import { ButtonWhite } from '@/src/components/shared/ui/button';
import { BenefitCard, BenefitImageCard, BenefitRoiCard } from '@/src/components/shared/ui/card';
import Link from 'next/link';

const benefitCards = [
  { title: 'Save 10–20 hours weekly', iconClass: 'ns-shape-1' },
  { title: 'Reduce manual errors', iconClass: 'ns-shape-2' },
  { title: 'Improve team productivity', iconClass: 'ns-shape-3' },
  { title: 'Focus on high-value work', iconClass: 'ns-shape-4' },
  { title: 'Scale without hiring more staff', iconClass: 'ns-shape-5' },
];

const Benefits = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="space-y-10 lg:space-y-18">
          <div className="space-y-8 text-center">
            <div className="space-y-5">
              <RevealAnimation delay={0.1}>
                <BadgePrimary>Benefits</BadgePrimary>
              </RevealAnimation>

              <div className="space-y-3">
                <TextReveal delay={0.2}>
                  <h2>Real results teams experience</h2>
                </TextReveal>
                <TextReveal delay={0.3}>
                  <p className="text-background-14/60 mx-auto max-w-[520px]">
                    From faster workflows to improved collaboration, every feature is designed to
                    deliver real, trackable results that teams can rely on every day.
                  </p>
                </TextReveal>
              </div>
            </div>

            <RevealAnimation delay={0.4} className="flex items-center justify-center">
              <Link href="/pricing">
                <ButtonWhite
                  className="mx-auto w-[80%]! md:w-fit!"
                  textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
                >
                  Get started
                </ButtonWhite>
              </Link>
            </RevealAnimation>
          </div>

          <div className="grid grid-cols-12 items-center justify-center gap-y-5 md:gap-4">
            <RevealAnimation delay={0.1} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitCard title={benefitCards[0].title} iconClass={benefitCards[0].iconClass} />
            </RevealAnimation>

            <RevealAnimation delay={0.2} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitCard title={benefitCards[1].title} iconClass={benefitCards[1].iconClass} />
            </RevealAnimation>

            <RevealAnimation delay={0.3} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitCard title={benefitCards[2].title} iconClass={benefitCards[2].iconClass} />
            </RevealAnimation>

            <RevealAnimation
              delay={0.4}
              className="col-span-12 row-span-2 md:col-span-6 lg:col-span-3"
            >
              <BenefitRoiCard />
            </RevealAnimation>

            <RevealAnimation delay={0.4} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitCard title={benefitCards[3].title} iconClass={benefitCards[3].iconClass} />
            </RevealAnimation>

            <RevealAnimation delay={0.5} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitImageCard />
            </RevealAnimation>

            <RevealAnimation delay={0.6} className="col-span-12 md:col-span-6 lg:col-span-3">
              <BenefitCard title={benefitCards[4].title} iconClass={benefitCards[4].iconClass} />
            </RevealAnimation>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
