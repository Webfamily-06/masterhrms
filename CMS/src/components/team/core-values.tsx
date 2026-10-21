import coreValuesImg from '@/public/images/ns-img-32.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import Image from 'next/image';

const CoreValues = () => {
  return (
    <section className="pt-20 md:pt-25 lg:pt-39">
      <div className="main-container space-y-8 md:space-y-14">
        <TextReveal delay={0.1}>
          <h2 className="text-center">Our core values</h2>
        </TextReveal>

        <div className="grid grid-cols-12 items-center justify-center gap-y-5 pb-5 sm:gap-x-8">
          <RevealAnimation
            asChild={false}
            delay={0.1}
            offset={30}
            className="col-span-12 text-center md:col-span-6 lg:col-span-3"
          >
            <h3 className="text-heading-5">Collaboration</h3>
            <p className="text-tagline-2 text-background-14/60 md:mx-auto md:max-w-[260px]">
              We work together across disciplines to build better products and support each other.
            </p>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.2}
            offset={30}
            className="col-span-12 text-center md:col-span-6 lg:col-span-3"
          >
            <h3 className="text-heading-5">Integrity</h3>
            <p className="text-tagline-2 text-background-14/60 md:mx-auto md:max-w-[260px]">
              We are transparent, accountable, and committed to doing the right thing for our users.
            </p>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.3}
            offset={30}
            className="col-span-12 text-center md:col-span-6 lg:col-span-3"
          >
            <h3 className="text-heading-5">Innovation</h3>
            <p className="text-tagline-2 text-background-14/60 md:mx-auto md:max-w-[260px]">
              We ship quickly, learn from real usage, and keep raising the bar on what automation
              can do.
            </p>
          </RevealAnimation>

          <RevealAnimation
            asChild={false}
            delay={0.4}
            offset={30}
            className="col-span-12 text-center md:col-span-6 lg:col-span-3"
          >
            <h3 className="text-heading-5">Inclusion</h3>
            <p className="text-tagline-2 text-background-14/60 md:mx-auto md:max-w-[260px]">
              We value diverse perspectives and create a place where everyone can contribute and
              grow.
            </p>
          </RevealAnimation>
        </div>

        <RevealAnimation asChild={false} delay={0.2} offset={50}>
          <figure className="border-stroke-3 h-[360px] w-full overflow-hidden rounded-[20px] border-8 md:h-[614px]">
            <Image
              src={coreValuesImg}
              alt="Our core values"
              className="size-full rounded-xl object-cover"
            />
          </figure>
        </RevealAnimation>
      </div>
    </section>
  );
};

export default CoreValues;
