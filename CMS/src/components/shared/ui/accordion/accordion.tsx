'use client';

import { cn } from '@/src/utils/cn';
import { forwardRef } from 'react';
import { AccordionProvider, accordionDataState, useAccordion } from './accordion-context';

export type AccordionType = 'single' | 'multiple';

export type AccordionProps = Readonly<{
  children: React.ReactNode;
  defaultOpen?: string | string[];
  type?: AccordionType;
  className?: string;
  role?: React.AriaRole;
  'aria-label'?: string;
}>;

type AccordionRootProps = Readonly<{
  className?: string;
  children: React.ReactNode;
  role?: React.AriaRole;
  'aria-label'?: string;
}>;

const AccordionRoot = forwardRef<HTMLDivElement, AccordionRootProps>(
  function AccordionRoot({ className, children, role, 'aria-label': ariaLabel }, ref) {
    const { type, openValue } = useAccordion();
    const hasOpen =
      type === 'single'
        ? openValue != null
        : Array.isArray(openValue) && openValue.length > 0;

    return (
      <div
        ref={ref}
        className={cn('accordion w-full space-y-3', className)}
        data-state={accordionDataState(hasOpen)}
        role={role}
        aria-label={ariaLabel ?? 'Accordion'}
      >
        {children}
      </div>
    );
  },
);

AccordionRoot.displayName = 'AccordionRoot';

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  { children, defaultOpen, type = 'single', className, role, 'aria-label': ariaLabel },
  ref,
) {
  return (
    <AccordionProvider defaultOpen={defaultOpen} type={type}>
      <AccordionRoot ref={ref} className={className} role={role} aria-label={ariaLabel}>
        {children}
      </AccordionRoot>
    </AccordionProvider>
  );
});

Accordion.displayName = 'Accordion';
