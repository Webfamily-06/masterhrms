'use client';

import { cn } from '@/src/utils/cn';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ComponentPropsWithoutRef, ReactNode, useEffect, useRef } from 'react';
import CardContent from './card-content';
import { useProcessContext } from './process-context';

gsap.registerPlugin(useGSAP);

type ProcessCardProps = {
  index: number;
  children: ReactNode;
} & ComponentPropsWithoutRef<'div'>;

const ProcessCard = ({ index, children, className, ...props }: ProcessCardProps) => {
  const { registerCard } = useProcessContext();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerCard(index, cardRef.current);
    return () => registerCard(index, null);
  }, [index, registerCard]);

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;

      gsap.set(card, {
        pointerEvents: index === 0 ? 'auto' : 'none',
        zIndex: index === 0 ? 2 : 0,
        overflow: 'hidden',
      });
    },
    { dependencies: [index] },
  );

  return (
    <div
      ref={cardRef}
      className={cn('absolute inset-0 rounded-[20px] bg-white p-1', className)}
      {...props}
    >
      <CardContent>{children}</CardContent>
    </div>
  );
};

export default ProcessCard;
