'use client';

import { cn } from '@/src/utils/cn';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react';
import { PROCESS_ANIMATION } from './process-animation-config';
import { useProcessContext } from './process-context';

gsap.registerPlugin(useGSAP);

type ProcessContentProps = {
  index: number;
  title: string;
  description: string;
  details: { title: string; description: string }[];
} & ComponentPropsWithoutRef<'div'>;

const ProcessContent = ({
  index,
  title,
  description,
  details,
  className,
  ...props
}: ProcessContentProps) => {
  const { registerContent } = useProcessContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerContent(index, contentRef.current);
    return () => registerContent(index, null);
  }, [index, registerContent]);

  useGSAP(
    () => {
      const el = contentRef.current;
      if (!el) return;

      gsap.set(el, {
        yPercent: 0,
        opacity: index === 0 ? 1 : 0,
        filter: PROCESS_ANIMATION.BLUR_OUT,
        willChange: 'transform, opacity, filter',
      });
    },
    { dependencies: [index] },
  );

  return (
    <div className={cn('relative w-full overflow-hidden py-5 md:w-1/2', className)} {...props}>
      <div ref={contentRef} className="h-fit w-full space-y-8 max-md:p-5 md:h-full">
        <div className="space-y-1">
          <h3 className="font-inter-tight text-heading-4 text-secondary font-normal">{title}</h3>
          <p className="text-tagline-2 max-w-[400px] text-left">{description}</p>
        </div>
        <div className="hidden space-y-6 md:block">
          {details.map((detail) => (
            <div key={detail.title} className="space-y-1">
              <h4 className="text-tagline-new">{detail.title}</h4>
              <p className="text-tagline-2 max-w-[400px] text-left">{detail.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProcessContent;
