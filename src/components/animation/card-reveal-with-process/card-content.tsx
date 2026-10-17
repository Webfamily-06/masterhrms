import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef } from 'react';

type CardContentProps = ComponentPropsWithoutRef<'div'>;

const CardContent = ({ className, children, ...props }: CardContentProps) => {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-y-5 md:flex-row md:gap-x-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default CardContent;
