'use client';

import { accordionDataState } from '@/src/components/shared/ui/accordion/accordion-context';
import { cn } from '@/src/utils/cn';

export const AccordionPlusIcon = ({ open }: { open: boolean }) => (
  <div
    data-state={accordionDataState(open)}
    className={cn(
      'border-background-6 relative size-5 rounded-full border px-[8.5px] duration-300 ease-in-out',
      open && 'border-white/50',
      'before:bg-background-6 before:absolute before:top-1/2 before:left-1/2 before:h-[8.5px] before:w-px before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:transition-transform before:duration-300 before:content-[""]',
      open && 'before:rotate-90 before:bg-white/90',
      'after:bg-background-6 after:absolute after:top-1/2 after:left-1/2 after:h-[8.5px] after:w-px after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-90 after:rounded-full after:transition-transform after:duration-300 after:content-[""]',
      open && 'after:bg-white/90'
    )}
    aria-hidden
  />
);
