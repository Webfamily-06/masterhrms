'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useOrbitContext } from './orbit-context';
import type { OrbitItemRefEntry } from './orbit-types';
import { clampOrbitSpeed, readOrbitSizePx } from './orbit-utils';

const getMountedItems = (entries: OrbitItemRefEntry[]) =>
  entries
    .map(({ orbitPivotRef, orbitItemRef }) => ({
      pivot: orbitPivotRef.current,
      item: orbitItemRef.current,
    }))
    .filter(
      (entry): entry is { pivot: HTMLDivElement; item: HTMLDivElement } =>
        entry.pivot !== null && entry.item !== null,
    );

export const useOrbitAnimation = () => {
  const { orbitRingRef, orbitHubRef, orbitItemRefs, itemVersion, speed, orbitSize } =
    useOrbitContext();

  useGSAP(
    () => {
      const ring = orbitRingRef.current;
      const hub = orbitHubRef.current;
      if (!ring || !hub) return;

      const clampedSpeed = clampOrbitSpeed(speed);
      let timeline: gsap.core.Timeline | null = null;

      const killTimeline = () => {
        timeline?.kill();
        timeline = null;
      };

      const buildTimeline = (itemElements: HTMLDivElement[]) => {
        const tl = gsap.timeline({ repeat: -1 });
        tl.to(hub, { rotation: 360, duration: 20, ease: 'none' });
        tl.to(itemElements, { rotation: '-=360', duration: 20, ease: 'none' }, 0);
        tl.timeScale(clampedSpeed);
        tl.play();
        return tl;
      };

      const applyOrbitGeometry = (sizePx: number) => {
        const sizeStr = `${sizePx}px`;
        ring.style.setProperty('--orbit-size', sizeStr);

        const hubSize = hub.offsetWidth || 20;
        const hubOffset = (sizePx - hubSize) / 2;
        gsap.set(hub, { x: hubOffset, y: hubOffset, rotation: 0 });

        const pivotOriginY = sizePx / 2 + 10;
        const items = getMountedItems(orbitItemRefs.current);
        const count = items.length;
        if (count === 0) return null;

        const space = 360 / count;
        items.forEach(({ pivot, item }, i) => {
          const pivotHalf = pivot.offsetWidth / 2 || 10;
          gsap.set(pivot, {
            rotation: i * space,
            transformOrigin: `${pivotHalf}px ${pivotOriginY}px`,
          });
          gsap.set(item, {
            rotation: -i * space,
            transformOrigin: 'center center',
          });
        });

        return items.map(({ item }) => item);
      };

      const runLayout = () => {
        const sizePx = readOrbitSizePx(ring, orbitSize);
        killTimeline();
        const itemElements = applyOrbitGeometry(sizePx);
        if (!itemElements || itemElements.length === 0) return;
        timeline = buildTimeline(itemElements);
      };

      const scheduleLayout = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(runLayout);
        });
      };

      gsap.set(ring, { autoAlpha: 1 });
      scheduleLayout();

      let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(scheduleLayout, 80);
      });
      resizeObserver.observe(ring);

      return () => {
        clearTimeout(resizeTimeout);
        resizeObserver.disconnect();
        killTimeline();
      };
    },
    { dependencies: [speed, orbitSize, itemVersion], scope: orbitRingRef },
  );
};
