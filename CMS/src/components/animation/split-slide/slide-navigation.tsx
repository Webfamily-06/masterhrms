'use client';

import { cn } from '@/src/utils/cn';
import NumberFlow from '@number-flow/react';
import { Slot } from '@radix-ui/react-slot';
import { ReactElement, ReactNode } from 'react';
import { useSlideContext } from './split-slide-context';

type SlideControlProps = {
  asChild?: boolean;
  onClick: () => void;
  children: ReactElement<{ onClick?: () => void; className?: string }>;
};

const SlideControl = ({ asChild = true, onClick, children }: SlideControlProps) => {
  if (!asChild) return children;

  return (
    <Slot
      onClick={onClick}
      className="group border-stroke-3 hover:bg-secondary flex h-10 w-13 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-500 hover:border-transparent max-[376px]:h-8 max-[376px]:w-10"
    >
      {children}
    </Slot>
  );
};

type SlideNavButtonProps = {
  asChild?: boolean;
  children: ReactElement<{ onClick?: () => void; className?: string }>;
};

export const SlidePrev = ({ asChild = true, children }: SlideNavButtonProps) => {
  const { goPrev } = useSlideContext();

  return (
    <SlideControl asChild={asChild} onClick={goPrev}>
      {children}
    </SlideControl>
  );
};

export const SlideNext = ({ asChild = true, children }: SlideNavButtonProps) => {
  const { goNext } = useSlideContext();

  return (
    <SlideControl asChild={asChild} onClick={goNext}>
      {children}
    </SlideControl>
  );
};

export const SlideNavigation = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const { activeIndex, slideCount } = useSlideContext();

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <div className="flex items-center gap-x-3">{children}</div>
      <div>
        <NumberFlow
          value={activeIndex + 1}
          format={{ useGrouping: false, maximumFractionDigits: 0 }}
          transformTiming={{ duration: 650, easing: 'ease-out' }}
          spinTiming={{ duration: 650, easing: 'ease-out' }}
          opacityTiming={{ duration: 300, easing: 'ease-out' }}
          className="text-secondary font-inter-tight max-[376px]:text-tagline-2 text-[20px] leading-[150%] font-normal"
        />
        <span className="text-secondary/40 font-inter-tight max-[376px]:text-tagline-3 text-tagline-1 -ml-0.5 font-normal">
          /{slideCount}
        </span>
      </div>
    </div>
  );
};
