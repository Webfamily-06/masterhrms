import missionImg from '@/public/images/ns-img-30.jpg';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import { BadgePrimary } from '@/src/components/shared/ui/badge';
import Image from 'next/image';

const OurMission = () => {
  return (
    <section className="overflow-hidden pt-20 md:pt-25 lg:pt-39">
      <div className="main-container">
        <div className="space-y-12 md:space-y-18">
          <div className="grid grid-cols-12 items-center gap-y-12 md:gap-x-16 lg:gap-x-20 xl:gap-x-25">
            <div className="col-span-12 space-y-3 md:col-span-6 md:space-y-4">
              <RevealAnimation delay={0.1}>
                <BadgePrimary>Our mission</BadgePrimary>
              </RevealAnimation>

              <div className="space-y-3">
                <TextReveal delay={0.2}>
                  <h2>Building the future of automation</h2>
                </TextReveal>
                <TextReveal delay={0.3}>
                  <p className="text-background-14/60">
                    A commitment to innovation and simplicity.
                  </p>
                </TextReveal>
              </div>
            </div>

            <RevealAnimation
              asChild={false}
              delay={0.3}
              offset={50}
              className="col-span-12 space-y-2 md:col-span-3"
            >
              <h3>Vision</h3>
              <p className="text-background-14/60">
                To empower every business with tools that drive smarter, faster decisions.
              </p>
            </RevealAnimation>

            <RevealAnimation
              asChild={false}
              delay={0.4}
              direction="right"
              offset={50}
              className="col-span-12 space-y-2 md:col-span-3"
            >
              <h3>Mission</h3>
              <p className="text-background-14/60">
                To develop easy-to-use automation that removes repetitive work and helps teams
                thrive.
              </p>
            </RevealAnimation>
          </div>

          <RevealAnimation delay={0.3} offset={80}>
            <figure className="max-h-[650px] overflow-hidden rounded-[20px]">
              <Image src={missionImg} alt="Our mission" className="size-full object-cover" />
            </figure>
          </RevealAnimation>
        </div>
      </div>
    </section>
  );
};

export default OurMission;
