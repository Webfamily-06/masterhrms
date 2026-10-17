import { cn } from '@/src/utils/cn';
import { forwardRef, type CSSProperties } from 'react';

export type LogoItemProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}>;

const LogoItem = forwardRef<HTMLElement, LogoItemProps>(({ children, className, style }, ref) => {
  return (
    <figure ref={ref} className={cn('max-md:scale-90 max-sm:scale-70', className)} style={style}>
      {children}
    </figure>
  );
});

LogoItem.displayName = 'LogoItem';

export { LogoItem };
