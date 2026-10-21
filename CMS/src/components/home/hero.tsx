'use client';

import bottomGradient from '@/public/images/bottom-gradient.svg';
import avatar1 from '@/public/images/ns-avatar-11.jpg';
import avatar2 from '@/public/images/ns-avatar-13.jpg';
import avatar3 from '@/public/images/ns-avatar-14.jpg';
import leftElement from '@/public/images/ns-img-27.svg';
import rightElement from '@/public/images/ns-img-28.svg';
import heroBanner from '@/public/images/ns-img-3.png';
import CounterNumberOnScroll from '@/src/components/animation/counter-number-on-scroll';
import RevealAnimation from '@/src/components/animation/reveal-animation';
import { TextReveal } from '@/src/components/animation/text-reveal';
import AvatarItem from '@/src/components/shared/ui/avatar-reveal/avatar-item';
import AvatarReveal from '@/src/components/shared/ui/avatar-reveal/avatar-reveal';
import { ButtonPrimary, ButtonSecondary } from '@/src/components/shared/ui/button';
import { AuthModal } from '@/src/components/shared/ui/modal';
import { useSlightlyMoveOnMouseMove } from '@/src/hooks/use-slightly-move-on-mouse-move';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';

const Hero = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);

  useSlightlyMoveOnMouseMove(rootRef, [
    { ref: leftRef, shift: 12 },
    { ref: rightRef, shift: 10 },
  ]);

  return (
    <section ref={rootRef} className="relative isolate overflow-hidden pt-[190px]">
      <video
        className="2k:h-[104%] absolute inset-0 z-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="main-container relative z-10">
        <div className="space-y-9 text-center md:space-y-18">
          <div className="space-y-8 md:space-y-[70px]">
            <div className="space-y-6">
              <div className="mx-auto flex max-w-[254px] items-center justify-center gap-x-3">
                <AvatarReveal
                  className="flex items-center justify-center -space-x-3.5"
                  direction="left"
                  offset={50}
                  stagger={0.1}
                  markers={false}
                >
                  {[avatar1, avatar2, avatar3].map((avatar, index) => (
                    <AvatarItem
                      key={avatar.src}
                      className="outline-background-2 size-11 overflow-hidden rounded-full outline-2"
                    >
                      <Image
                        src={avatar}
                        alt={`avatar-${index + 1}`}
                        className="size-full rounded-full object-cover"
                      />
                    </AvatarItem>
                  ))}
                </AvatarReveal>
                <RevealAnimation delay={0.2} direction="right" offset={50} instant>
                  <p className="text-tagline-2 text-background-14/80 mx-auto max-w-[142px] shrink-0 text-left">
                    <CounterNumberOnScroll value={2000} delay={0.4} />+ teams shipping faster this
                    week.
                  </p>
                </RevealAnimation>
              </div>
              <div className="space-y-4">
                <TextReveal delay={0.3}>
                  <h1 className="mx-auto max-w-[950px]">
                    Automate your workflows eliminate manual tasks.
                  </h1>
                </TextReveal>
                <TextReveal delay={0.4}>
                  <p className="mx-auto max-w-[500px]">
                    Connect your tools, design smart workflows, and automate repetitive work — so
                    your business runs on autopilot.
                  </p>
                </TextReveal>
              </div>
            </div>

            <RevealAnimation delay={0.3} instant>
              <div className="flex flex-col items-center justify-center gap-y-3 md:flex-row md:gap-x-5">
                <Link href="/pricing" className="w-[70%] md:w-auto">
                  <ButtonPrimary
                    className="w-full md:w-auto"
                    textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
                  >
                    Start free trial
                  </ButtonPrimary>
                </Link>
                <ButtonSecondary
                  className="w-[70%] outline-0! md:w-auto"
                  textClassName="text-center text-nowrap max-sm:flex-1 max-sm:pr-8!"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Book demo
                </ButtonSecondary>
              </div>
            </RevealAnimation>
          </div>

          <RevealAnimation delay={0.4} instant>
            <figure className="h-[350px] w-full overflow-hidden rounded-[20px] backdrop-blur-[20px] md:h-[650px] xl:h-[825px]">
              <Image src={heroBanner} alt="hero-banner-img" className="size-full" priority />
            </figure>
          </RevealAnimation>
        </div>

        <figure
          ref={leftRef}
          className="absolute top-[57%] left-[2%] z-30 hidden h-14 will-change-transform md:block xl:top-[50%] xl:left-[-5%] 2xl:left-[-8%]"
        >
          <RevealAnimation delay={0.5} direction="left" offset={50}>
            <div className="size-full">
              <Image src={leftElement} alt="left-elements" className="size-full object-cover" />
            </div>
          </RevealAnimation>
        </figure>

        <figure
          ref={rightRef}
          className="absolute top-[59%] right-[8%] z-30 hidden h-14 will-change-transform md:block xl:top-[42%] xl:right-[-3%] 2xl:right-[-5%]"
        >
          <RevealAnimation delay={0.6} direction="right" offset={50}>
            <div className="size-full">
              <Image src={rightElement} alt="right-elements" className="size-full object-cover" />
            </div>
          </RevealAnimation>
        </figure>
      </div>

      <RevealAnimation delay={0.5} instant>
        <figure className="absolute -bottom-1 left-0 z-20 h-[500px] w-full md:h-[600px] xl:h-[700px]">
          <Image src={bottomGradient} alt="bottom-gradient" className="size-full object-cover" />
        </figure>
      </RevealAnimation>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
};

export default Hero;
