import { cn } from '@/src/utils/cn';
import type { HTMLAttributes } from 'react';

export type BenefitCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  iconClass: string;
};

export const BenefitCard = ({ title, iconClass, className, ...props }: BenefitCardProps) => {
  return (
    <div
      className={cn(
        'group relative h-[273px] overflow-hidden rounded-[20px] bg-white p-6',
        className
      )}
      {...props}
    >
      <div className="absolute top-0 right-0 z-10 size-full translate-y-full rounded-[20px] bg-black transition-transform duration-700 ease-in-out group-hover:translate-y-0">
        <div className="flex size-full flex-col items-center justify-center gap-y-8">
          <span className={cn('rounded-xl p-4 text-[54px] text-white', iconClass)} />
          <h3 className="text-heading-6 text-white">{title}</h3>
        </div>
      </div>

      <div className="flex size-full flex-col items-start justify-between transition-all duration-700 ease-in-out group-hover:translate-y-4 group-hover:scale-95">
        <span
          className={cn('bg-background-4 text-secondary rounded-xl p-4 text-[24px]', iconClass)}
        />
        <h3 className="text-heading-6">{title}</h3>
      </div>
    </div>
  );
};
