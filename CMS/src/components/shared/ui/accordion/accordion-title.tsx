'use client';

import { cn } from '@/src/utils/cn';

export interface AccordionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionTitle = ({ children, className }: AccordionTitleProps) => (
  <span className={cn('text-heading-6! font-inter-tight text-secondary', className)}>
    {children}
  </span>
);

AccordionTitle.displayName = 'AccordionTitle';
