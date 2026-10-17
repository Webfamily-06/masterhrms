'use client';

import { cn } from '@/src/utils/cn';
import { forwardRef } from 'react';
import { AccordionItemValueContext, accordionDataState, useAccordion } from './accordion-context';

export interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  function AccordionItem({ children, value, className }, ref) {
    const { isOpen } = useAccordion();
    const open = isOpen(value);

    return (
      <AccordionItemValueContext.Provider value={value}>
        <div ref={ref} className={cn(className)} data-state={accordionDataState(open)}>
          {children}
        </div>
      </AccordionItemValueContext.Provider>
    );
  },
);

AccordionItem.displayName = 'AccordionItem';
