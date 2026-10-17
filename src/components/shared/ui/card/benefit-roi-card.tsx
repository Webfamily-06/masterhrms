'use client';

import benefitRoiImg from '@/public/images/ns-img-23.jpg';
import CounterNumberOnScroll from '@/src/components/animation/counter-number-on-scroll';
import { ArrowUpIcon } from '@/src/components/shared/icon';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';

export type BenefitRoiCardProps = HTMLAttributes<HTMLDivElement>;

export const BenefitRoiCard = ({ className, ...props }: BenefitRoiCardProps) => {
  return (
    <div
      className={cn(
        'relative flex h-[350px] flex-col items-center justify-end overflow-hidden rounded-[20px] p-6 md:h-[550px]',
        className
      )}
      {...props}
    >
      <Image
        src={benefitRoiImg}
        alt="average-roi"
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 25vw"
      />

      <div className="bg-accent/5 relative z-10 w-full space-y-6 rounded-2xl p-6 backdrop-blur-xl">
        <h3 className="text-heading-5 text-accent">
          <CounterNumberOnScroll
            value={9.2}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          />
          <span>% Average ROI</span>
        </h3>

        <div className="flex items-center justify-between">
          <span className="font-inter-tight text-tagline-3 text-accent font-normal">
            <span>+</span>
            <CounterNumberOnScroll value={224} />
          </span>

          <span className="bg-primary-500 flex h-[37px] w-7 items-center justify-center rounded-[24px] px-2 py-2.5">
            <ArrowUpIcon className="h-[18px] w-4 fill-white" />
          </span>

          <span className="font-inter-tight text-tagline-3 text-accent font-normal">
            <CounterNumberOnScroll value={88} />
            <span>%</span>
          </span>
        </div>
      </div>
    </div>
  );
};
