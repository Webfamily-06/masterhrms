'use client';

import { Slot } from '@radix-ui/react-slot';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import { ComponentPropsWithoutRef, RefCallback, useLayoutEffect, useRef } from 'react';

gsap.registerPlugin(SplitText, ScrollTrigger);

type TextRevealProps = {
  asChild?: boolean;
  delay?: number;
} & ComponentPropsWithoutRef<'div'>;

export function TextReveal({ asChild = true, children, delay = 0, ...props }: TextRevealProps) {
  const Component = asChild ? Slot : 'div';
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const split = SplitText.create(ref.current, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'text-reveal-line',
    });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        split.lines,
        {
          yPercent: 110,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          delay,
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 90%',
          },
          onStart: () => {
            if (ref.current) {
              gsap.set(ref.current, { opacity: 1 });
            }
          },
        }
      );
    }, ref);

    return () => {
      split.revert();
      ctx.revert();
    };
  }, [delay]);

  const setRef: RefCallback<Element> = (node) => {
    ref.current = node as HTMLElement | null;
  };

  return (
    <Component ref={setRef} data-text-reveal {...props}>
      {children}
    </Component>
  );
}
