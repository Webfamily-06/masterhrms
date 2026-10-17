'use client';

import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useOrbitAnimation } from './use-orbit-animation';

type LogoOrbitLayoutProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const LogoOrbitLayout = ({ children, className, ...props }: LogoOrbitLayoutProps) => {
  useOrbitAnimation();

  return (
    <div className={cn('mx-auto w-fit', className)} {...props}>
      {children}
    </div>
  );
};

export default LogoOrbitLayout;
