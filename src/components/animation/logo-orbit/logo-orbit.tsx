'use client';

import { ComponentPropsWithoutRef, ReactNode } from 'react';
import LogoOrbitLayout from './logo-orbit-layout';
import { OrbitProvider } from './orbit-context';

type LogoOrbitProps = {
  children: ReactNode;
  speed?: number;
  orbitSize?: number;
} & ComponentPropsWithoutRef<'div'>;

const LogoOrbit = ({ children, speed = 0.3, orbitSize, className, ...props }: LogoOrbitProps) => {
  return (
    <OrbitProvider speed={speed} orbitSize={orbitSize}>
      <LogoOrbitLayout className={className} {...props}>
        {children}
      </LogoOrbitLayout>
    </OrbitProvider>
  );
};

export default LogoOrbit;
