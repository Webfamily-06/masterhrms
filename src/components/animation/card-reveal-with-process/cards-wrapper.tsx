import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef } from 'react';

type CardsWrapperProps = ComponentPropsWithoutRef<'div'>;

const CardsWrapper = ({ className, children, ...props }: CardsWrapperProps) => {
  return (
    <div className={cn('relative min-h-[472px] w-[95%] overflow-hidden', className)} {...props}>
      {children}
    </div>
  );
};

export default CardsWrapper;
