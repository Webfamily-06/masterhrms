import gradientImg from '@/public/images/gradient/opai-29.png';
import aboutHeroImg from '@/public/images/ns-img-29.jpg';
import CounterNumberOnScroll from '@/src/components/animation/counter-number-on-scroll';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import Image from 'next/image';

const awards = [
  'Automation Excellence Awards',
  'Product Design Awards for workflow experiences',
  'Award for clarity in onboarding',
  'Industry recognition for reliability at scale',
];

const AboutHero = () => {
  return (
    <section className="relative overflow-hidden pt-[190px]">
      <div className="main-container">
        <div className="space-y-18">
          <div className="space-y-1.5 text-center md:space-y-3">
            <RevealAnimation delay={0.1}>
              <BadgePrimary>About story</BadgePrimary>
            </RevealAnimation>

            <TextReveal delay={0.2}>
              <h2>How Nexsas began</h2>
            </TextReveal>

            <TextReveal delay={0.3}>
              <p className="text-background-14/60 md:mx-auto md:max-w-[480px]">
                Nexsas was founded to turn automation into practical outcomes for real business
                challenges — intuitive tools that save time and scale
              </p>
            </TextReveal>
          </div>

          <div className="grid grid-cols-12 items-center justify-center max-md:gap-y-10 md:gap-x-10 lg:items-end lg:gap-x-[90px]">
            <RevealAnimation
              asChild={false}
              delay={0.1}
              direction="left"
              offset={80}
              className="relative col-span-12 h-[500px] w-full overflow-hidden rounded-[20px] p-8 md:col-span-6 lg:col-span-4 lg:max-w-[380px]"
            >
              <figure className="absolute inset-0 size-full" aria-hidden="true">
                <Image src={aboutHeroImg} alt="" className="size-full object-cover" priority />
              </figure>
              <div
                className="from-background-14/70 pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[180px] bg-linear-to-t to-transparent"
                aria-hidden="true"
              />
            </RevealAnimation>

            <RevealAnimation
              asChild={false}
              delay={0.2}
              offset={60}
              className="col-span-12 w-full space-y-6 text-left md:col-span-6 md:space-y-8 lg:col-span-4"
            >
              <h2>Awards</h2>

              <ul className="space-y-3">
                {awards.map((award) => (
                  <li key={award} className="flex items-start gap-2">
                    <span className="bg-secondary mt-2 size-1.5 shrink-0 rounded-full" />
                    <p className="text-background-14/60">{award}</p>
                  </li>
                ))}
              </ul>
            </RevealAnimation>

            <RevealAnimation
              asChild={false}
              delay={0.3}
              direction="right"
              offset={80}
              className="bg-background-5 relative col-span-12 flex w-full flex-col justify-between overflow-hidden rounded-[20px] p-8 md:col-span-6 md:h-[300px] md:p-12 lg:col-span-4"
            >
              <div
                className="pointer-events-none absolute -top-28 left-[165px] z-0 h-[330px] w-[300px] rotate-60"
                aria-hidden="true"
              >
                <Image src={gradientImg} alt="" className="size-full object-cover blur-[10px]" />
              </div>

              <div className="ns-shape-47 text-[40px] text-white max-md:mb-2 md:text-[56px]" />

              <div className="relative z-10 space-y-2">
                <p className="text-tagline-2 text-white/90">Customer satisfaction rate</p>
                <h3 className="text-heading-2 flex items-center text-white">
                  <CounterNumberOnScroll value={95} duration={1.4} />
                  <span>%</span>
                </h3>
              </div>
            </RevealAnimation>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHero;
