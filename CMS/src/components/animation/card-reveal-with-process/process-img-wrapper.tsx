import { cn } from '@/src/utils/cn';
import { ComponentPropsWithoutRef } from 'react';

type ProcessImgWrapperProps = ComponentPropsWithoutRef<'div'>;

const ProcessImgWrapper = ({ className, children, ...props }: ProcessImgWrapperProps) => {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-2xl md:w-1/2', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default ProcessImgWrapper;
