'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef, type ReactNode } from 'react';

gsap.registerPlugin(useGSAP);

type LogosCarouselLogoProps = Readonly<{
  children: ReactNode;
  animate?: boolean;
  index: number;
  state?: 'enter' | 'exit';
  stagger?: number;
  duration?: number;
}>;

const LogosCarouselLogo = ({
  children,
  animate,
  index,
  state = 'enter',
  stagger = 0.14,
  duration = 600,
}: LogosCarouselLogoProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const durationSec = duration / 1000;

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;

      if (!animate) {
        gsap.set(element, {
          y: 0,
          opacity: state === 'enter' ? 0 : 1,
          filter: 'blur(0px)',
        });
        return;
      }

      if (state === 'enter') {
        gsap.fromTo(
          element,
          { y: 40, opacity: 0, filter: 'blur(4px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: durationSec,
            delay: index * stagger,
            ease: 'power2.inOut',
          }
        );
        return;
      }

      gsap.fromTo(
        element,
        { y: 0, opacity: 1, filter: 'blur(0px)' },
        {
          y: -40,
          opacity: 0,
          filter: 'blur(4px)',
          duration: durationSec,
          delay: index * stagger,
          ease: 'power2.inOut',
        }
      );
    },
    {
      scope: ref,
      dependencies: [animate, state, stagger, duration, index],
      revertOnUpdate: true,
    }
  );

  return <div ref={ref}>{children}</div>;
};

export { LogosCarouselLogo };
