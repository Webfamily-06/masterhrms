'use client';

import { cn } from '@/src/utils/cn';
import Image, { StaticImageData } from 'next/image';
import { ComponentPropsWithoutRef, useLayoutEffect, useRef } from 'react';
import { useOrbitContext } from './orbit-context';

type OrbitItemProps = {
  src: StaticImageData | string;
  alt: string;
} & ComponentPropsWithoutRef<'div'>;

const OrbitItem = ({ src, alt, className, ...props }: OrbitItemProps) => {
  const orbitPivotRef = useRef<HTMLDivElement>(null);
  const orbitItemRef = useRef<HTMLDivElement>(null);
  const { registerItem, unregisterItem } = useOrbitContext();

  useLayoutEffect(() => {
    const entry = registerItem(orbitPivotRef, orbitItemRef);
    return () => unregisterItem(entry);
  }, [registerItem, unregisterItem]);

  return (
    <div
      ref={orbitPivotRef}
      className="absolute top-[calc(var(--orbit-size)*-0.5)]"
      {...props}
    >
      <div ref={orbitItemRef} className={cn('absolute top-[-20px] size-16 rounded-full', className)}>
        <Image src={src} alt={alt} className="size-full object-cover" />
      </div>
    </div>
  );
};

export default OrbitItem;
