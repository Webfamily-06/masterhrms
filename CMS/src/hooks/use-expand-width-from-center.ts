'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RefObject } from 'react';

gsap.registerPlugin(ScrollTrigger);

const useExpandWidthFromCenter = (ref: RefObject<HTMLElement | null>, duration = 1) => {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      gsap.set(el, { scaleX: 0, transformOrigin: '50% 50%' });
      gsap.to(el, {
        scaleX: 1,

        duration,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    },
    { scope: ref, dependencies: [duration] }
  );
};

export { useExpandWidthFromCenter };
