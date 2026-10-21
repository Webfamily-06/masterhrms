'use client';

import { cn } from '@/src/utils/cn';
import { Slot } from '@radix-ui/react-slot';
import type { StaticImageData } from 'next/image';
import {
  Children,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  SlideItemActivationProvider,
  SlideItemProvider,
  useSlideItemActivation,
  type SlideAnimationTargets,
} from './slide-item-context';
import { showSlideVisual } from './split-slide-animation';

export type SlideItemProps = {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
  instant?: boolean;
};

type SlideItemActivatorProps = {
  asChild?: boolean;
  isActive: boolean;
  instant: boolean;
  children: ReactElement<SlideItemProps>;
};

export const SlideItemActivator = ({
  asChild = true,
  isActive,
  instant,
  children,
}: SlideItemActivatorProps) => {
  const activation = { isActive, instant };

  if (!asChild) {
    return (
      <SlideItemActivationProvider value={activation}>{children}</SlideItemActivationProvider>
    );
  }

  return (
    <SlideItemActivationProvider value={activation}>
      <Slot>{children}</Slot>
    </SlideItemActivationProvider>
  );
};

export const hasSlideImg = (child: ReactElement<{ children?: ReactNode }>) => {
  return Children.toArray(child.props.children).some((c) => {
    if (!isValidElement<{ src?: StaticImageData | string; alt?: string }>(c)) return false;
    return Boolean(c.props.src && c.props.alt);
  });
};

export const SlideItem = ({
  children,
  className,
  isActive: isActiveProp = false,
  instant: instantProp = false,
}: SlideItemProps) => {
  const activation = useSlideItemActivation();
  const isActive = activation?.isActive ?? isActiveProp;
  const instant = activation?.instant ?? instantProp;
  const animationTargets = useRef<SlideAnimationTargets>({
    tiles: [],
    content: null,
  });
  const [targetsVersion, setTargetsVersion] = useState(0);

  const contextValue = useMemo(
    () => ({
      registerTiles: (els: HTMLElement[]) => {
        animationTargets.current.tiles = els;
        setTargetsVersion((version) => version + 1);
      },
      registerContent: (el: HTMLElement | null) => {
        animationTargets.current.content = el;
        setTargetsVersion((version) => version + 1);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!isActive) return;
    const { tiles, content } = animationTargets.current;
    if (!tiles.length) return;
    showSlideVisual({ tiles, content }, instant);
  }, [isActive, instant, targetsVersion]);

  return (
    <SlideItemProvider value={contextValue}>
      <div
        className={cn(
          'flex! flex-col items-start justify-center overflow-hidden rounded-[20px] border border-stroke-3 bg-white p-1 md:flex-row',
          className,
        )}
      >
        {children}
      </div>
    </SlideItemProvider>
  );
};
