'use client';

import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef, forwardRef } from 'react';
import { useProcessContext } from './process-context';

type ProcessStepProps = {
  index: number;
  label: string;
} & ComponentPropsWithoutRef<'button'>;

const ProcessStep = forwardRef<HTMLButtonElement, ProcessStepProps>(function ProcessStep(
  { index, label, className, ...props },
  ref,
) {
  const { getStepState, goToStep } = useProcessContext();

  return (
    <button
      ref={ref}
      type="button"
      data-item={getStepState(index)}
      className={cn(
        'text-background-14/60 data-[item=active]:text-accent data-[item=completed]:text-accent text-tagline-3 border-stroke-3 flex size-8 cursor-pointer items-center justify-center rounded-full border transition-all duration-400 ease-in-out data-[item=active]:border-transparent data-[item=active]:bg-primary-500 data-[item=completed]:border-transparent data-[item=completed]:bg-primary-500',
        className,
      )}
      onClick={() => goToStep(index)}
      {...props}
    >
      {label}
    </button>
  );
});

ProcessStep.displayName = 'ProcessStep';

export default ProcessStep;
