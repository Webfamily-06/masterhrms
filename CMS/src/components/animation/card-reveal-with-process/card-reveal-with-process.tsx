'use client';

import { cn } from '@/src/utils/cn';
import { Children, ComponentPropsWithoutRef, ReactNode, useEffect } from 'react';
import { ProcessProvider, useProcessContext } from './process-context';

type CardRevealWithProcessRootProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const CardRevealWithProcessRoot = ({
  children,
  className,
  ...props
}: CardRevealWithProcessRootProps) => {
  const {
    isReady,
    scheduleLoop,
    setPaused,
    pauseLineTween,
    resumeLineTween,
    killLoopDelay,
    runLoop,
  } = useProcessContext();

  useEffect(() => {
    if (!isReady) return;
    scheduleLoop();
  }, [isReady, scheduleLoop]);

  const onMouseEnter = () => {
    setPaused(true);
    pauseLineTween();
  };

  const onMouseLeave = () => {
    setPaused(false);
    resumeLineTween();
    killLoopDelay();
    runLoop();
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative flex flex-col items-center justify-center gap-y-5 md:flex-row md:gap-x-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

type CardRevealWithProcessProps = {
  children: ReactNode;
  cardCount: number;
} & ComponentPropsWithoutRef<'div'>;

const CardRevealWithProcess = ({
  children,
  cardCount,
  className,
  ...props
}: CardRevealWithProcessProps) => {
  const resolvedCount = cardCount > 0 ? cardCount : Children.count(children);

  return (
    <ProcessProvider cardCount={resolvedCount}>
      <CardRevealWithProcessRoot className={className} {...props}>
        {children}
      </CardRevealWithProcessRoot>
    </ProcessProvider>
  );
};

export default CardRevealWithProcess;
