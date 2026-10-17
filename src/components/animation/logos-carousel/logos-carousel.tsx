'use client';

import { cn } from '@/src/utils/cn';
import { Children, useEffect, useState } from 'react';
import { LogosCarouselLogo } from './logos-carousel-logo';
import type { LogosCarouselProps } from './logos-carousel-types';
import { chunk } from './logos-carousel-utils';

const DEFAULT_GROUP_CLASS =
  'flex flex-wrap items-center justify-center gap-x-2 gap-y-6 lg:gap-x-14 lg:gap-y-8';

const LogosCarousel = ({
  children,
  count = 6,
  stagger = 0.14,
  duration = 600,
  interval = 2500,
  initialDelay = 500,
  className,
  groupClassName,
}: LogosCarouselProps) => {
  const childrenArray = Children.toArray(children);
  const groups = chunk(childrenArray, count);
  const groupsLength = groups.length;
  const resolvedGroupClassName = cn(DEFAULT_GROUP_CLASS, groupClassName);

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [nextIndex, setNextIndex] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setAnimate(true), initialDelay);

    return () => clearTimeout(id);
  }, [initialDelay]);

  useEffect(() => {
    if (!animate || groupsLength <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % groupsLength;
        setNextIndex((newIndex + 1) % groupsLength);
        return newIndex;
      });
    }, interval);

    return () => clearInterval(intervalId);
  }, [animate, interval, groupsLength]);

  if (groupsLength === 0) {
    return null;
  }

  if (groupsLength === 1) {
    return (
      <div
        className={cn(
          'grid min-h-[72px] place-items-center [grid-template-areas:stack] sm:min-h-[88px]',
          className
        )}
      >
        <div className={resolvedGroupClassName}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid min-h-[72px] place-items-center [grid-template-areas:stack] sm:min-h-[88px]',
        className
      )}
    >
      {groups.map((group, groupIndex) => {
        const isCurrent = groupIndex === index;
        const isNext = groupIndex === nextIndex && animate;
        const isVisible = isCurrent || isNext;

        return (
          <div
            key={groupIndex}
            className={cn(
              resolvedGroupClassName,
              'col-start-1 row-start-1 [grid-area:stack]',
              isVisible ? 'pointer-events-auto' : 'pointer-events-none'
            )}
          >
            {group.map((logo, logoIndex) => (
              <LogosCarouselLogo
                key={logoIndex}
                animate={animate && isVisible}
                index={logoIndex}
                state={isCurrent ? 'exit' : 'enter'}
                stagger={stagger}
                duration={duration}
              >
                {logo}
              </LogosCarouselLogo>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export { LogosCarousel };
