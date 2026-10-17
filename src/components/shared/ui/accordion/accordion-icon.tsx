'use client';

import { cn } from '@/src/utils/cn';
import { accordionDataState, useAccordion, useAccordionItemValue } from './accordion-context';

type AccordionIconProps = Readonly<{
  className?: string;
}>;

export const AccordionIcon = ({ className }: AccordionIconProps) => {
  const { isOpen } = useAccordion();
  const value = useAccordionItemValue();
  const open = isOpen(value);
  const state = accordionDataState(open);

  return (
    <span
      data-state={state}
      className={cn(
        'accordion-icon group flex size-6 items-center justify-center transition-transform duration-400 ease-in-out data-[state=open]:rotate-180',
        className
      )}
      aria-hidden
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 28"
        fill="none"
        className="stroke-secondary size-7"
      >
        <path d="M4.375 14H23.625" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M14 4.375V23.625"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-400 ease-in-out group-data-[state=open]:opacity-0"
        />
      </svg>
    </span>
  );
};

AccordionIcon.displayName = 'AccordionIcon';
