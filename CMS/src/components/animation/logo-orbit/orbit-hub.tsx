'use client';

import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useOrbitContext } from './orbit-context';

type OrbitHubProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const OrbitHub = ({ children, className, ...props }: OrbitHubProps) => {
  const { orbitHubRef } = useOrbitContext();

  return (
    <div
      ref={orbitHubRef}
      className={cn('absolute size-5', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default OrbitHub;
