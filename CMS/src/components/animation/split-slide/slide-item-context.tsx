'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type SlideAnimationTargets = {
  tiles: HTMLElement[];
  content: HTMLElement | null;
};

export type SlideItemActivationValue = {
  isActive: boolean;
  instant: boolean;
};

const SlideItemActivationContext = createContext<SlideItemActivationValue | null>(null);

export const SlideItemActivationProvider = ({
  value,
  children,
}: {
  value: SlideItemActivationValue;
  children: ReactNode;
}) => {
  return (
    <SlideItemActivationContext.Provider value={value}>{children}</SlideItemActivationContext.Provider>
  );
};

export const useSlideItemActivation = () => useContext(SlideItemActivationContext);

type SlideItemContextValue = {
  registerTiles: (els: HTMLElement[]) => void;
  registerContent: (el: HTMLElement | null) => void;
};

const SlideItemContext = createContext<SlideItemContextValue | null>(null);

export const SlideItemProvider = ({
  value,
  children,
}: {
  value: SlideItemContextValue;
  children: ReactNode;
}) => {
  return <SlideItemContext.Provider value={value}>{children}</SlideItemContext.Provider>;
};

export const useSlideItemContext = () => {
  const ctx = useContext(SlideItemContext);
  if (!ctx) throw new Error('Use inside SlideItem');
  return ctx;
};
