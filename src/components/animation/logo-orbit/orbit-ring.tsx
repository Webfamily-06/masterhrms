'use client';

import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useOrbitContext } from './orbit-context';

type OrbitRingProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const OrbitRing = ({ children, className, ...props }: OrbitRingProps) => {
  const { orbitRingRef } = useOrbitContext();

  return (
    <div
      ref={orbitRingRef}
      className={cn(
        'border-stroke-3 relative mx-auto aspect-square size-[min(calc(100vw-1.5rem),1100px)] rounded-full border-2 md:size-[min(90vw,960px)] lg:size-[min(88vw,1100px)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default OrbitRing;
