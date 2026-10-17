'use client';

import { cn } from '@/src/utils/cn';
import { ReactNode, useEffect, useRef } from 'react';
import { useSlideItemContext } from './slide-item-context';

type SlideContentProps = {
  children: ReactNode;
  className?: string;
};

export const SlideContent = ({ children, className }: SlideContentProps) => {
  const { registerContent } = useSlideItemContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerContent(contentRef.current);
  }, [registerContent]);

  return (
    <div ref={contentRef} className={cn('w-full p-6 md:w-[58%]', className)}>
      {children}
    </div>
  );
};
