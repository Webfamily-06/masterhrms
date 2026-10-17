import benefitImage from '@/public/images/ns-img-24.jpg';
import { cn } from '@/src/utils/cn';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';

export type BenefitImageCardProps = HTMLAttributes<HTMLDivElement>;

export const BenefitImageCard = ({ className, ...props }: BenefitImageCardProps) => {
  return (
    <div
      className={cn('relative h-[273px] overflow-hidden rounded-[20px]', className)}
      {...props}
    >
      <Image
        src={benefitImage}
        alt="benefits"
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 25vw"
      />
    </div>
  );
};
