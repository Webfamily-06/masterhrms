'use client';

import { useGSAP } from '@gsap/react';
import NumberFlow, { type Format } from '@number-flow/react';
import { Slot } from '@radix-ui/react-slot';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ComponentPropsWithoutRef, RefCallback, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

type CounterNumberOnScrollProps = {
  value: number;
  delay?: number;
  duration?: number;
  asChild?: boolean;
  format?: Format;
} & ComponentPropsWithoutRef<'div'>;

const DEFAULT_DURATION = 1.8;

export default function CounterNumberOnScroll({
  value,
  delay = 0,
  duration = DEFAULT_DURATION,
  asChild = true,
  format,
  ...props
}: CounterNumberOnScrollProps) {
  const Comp = asChild ? Slot : 'div';
  const elementRef = useRef<HTMLElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  const setRef: RefCallback<Element> = (node) => {
    elementRef.current = node as HTMLElement | null;
  };

  useGSAP(
    () => {
      if (!elementRef.current) return;

      let startTween: gsap.core.Tween | null = null;

      const trigger = ScrollTrigger.create({
        trigger: elementRef.current,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          startTween = gsap.delayedCall(delay, () => {
            setDisplayValue(value);
          });
        },
      });

      return () => {
        startTween?.kill();
        trigger.kill();
      };
    },
    {
      scope: elementRef,
      dependencies: [value, delay],
    }
  );

  const durationMs = duration * 1000;
  const numberFlowTimings = {
    transformTiming: { duration: durationMs, easing: 'ease-out' as const },
    spinTiming: { duration: durationMs, easing: 'ease-out' as const },
    opacityTiming: {
      duration: Math.max(250, duration * 450),
      easing: 'ease-out' as const,
    },
  };

  return (
    <Comp ref={setRef} {...props}>
      <NumberFlow
        value={displayValue}
        format={{ useGrouping: true, ...format }}
        trend={0}
        {...numberFlowTimings}
      />
    </Comp>
  );
}
