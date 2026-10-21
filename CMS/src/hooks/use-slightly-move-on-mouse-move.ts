'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';

const moveAxisMap = new WeakMap<HTMLElement, { x: number; y: number }>();

function throttled(delay: number, fn: (event: MouseEvent) => void) {
  let lastCall = 0;

  return (event: MouseEvent) => {
    const now = Date.now();
    if (now - lastCall < delay) {
      return;
    }

    lastCall = now;
    fn(event);
  };
}

type SlightlyMoveTarget = {
  ref: RefObject<HTMLElement | null>;
  shift?: number;
};

type UseSlightlyMoveOnMouseMoveOptions = {
  throttle?: number;
  duration?: number;
};

const useSlightlyMoveOnMouseMove = (
  rootRef: RefObject<HTMLElement | null>,
  elements: SlightlyMoveTarget[],
  { throttle = 200, duration = 0.6 }: UseSlightlyMoveOnMouseMoveOptions = {}
) => {
  useGSAP(
    () => {
      const wrapper = rootRef.current;
      if (!wrapper) {
        return;
      }

      const mouseMoveHandler = (event: MouseEvent) => {
        elements.forEach(({ ref, shift = 0 }) => {
          const el = ref.current;
          if (!el) {
            return;
          }

          if (!moveAxisMap.has(el)) {
            moveAxisMap.set(el, {
              x: Math.random() * 2 - 1,
              y: Math.random() * 2 - 1,
            });
          }

          const { x: axisX, y: axisY } = moveAxisMap.get(el) ?? { x: 1, y: 1 };
          const moveX = ((event.clientX * shift) / 150) * axisX;
          const moveY = ((event.clientY * shift) / 150) * axisY;

          gsap.to(el, { x: moveX, y: moveY, duration });
        });
      };

      const throttledHandler = throttled(throttle, mouseMoveHandler);
      wrapper.addEventListener('mousemove', throttledHandler);

      return () => {
        wrapper.removeEventListener('mousemove', throttledHandler);
      };
    },
    { scope: rootRef, dependencies: [throttle, duration] }
  );
};

export { useSlightlyMoveOnMouseMove };
export type { SlightlyMoveTarget, UseSlightlyMoveOnMouseMoveOptions };
