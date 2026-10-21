import type { ReactNode } from 'react';

export type LogosCarouselProps = Readonly<{
  children: ReactNode;
  count?: number;
  stagger?: number;
  duration?: number;
  interval?: number;
  initialDelay?: number;
  className?: string;
  groupClassName?: string;
}>;
