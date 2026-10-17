'use client';

import { createContext, useContext } from 'react';

export type SlideContextValue = {
  activeIndex: number;
  slideCount: number;
  goPrev: () => void;
  goNext: () => void;
};

export const SlideContext = createContext<SlideContextValue | null>(null);

export const useSlideContext = () => {
  const ctx = useContext(SlideContext);
  if (!ctx) throw new Error('Use inside SplitSlide');
  return ctx;
};
