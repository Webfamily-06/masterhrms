import { TextReveal } from '@/src/components/animation/text-reveal';
import { cn } from '@/src/utils/cn';
import Link from 'next/link';
import { forwardRef, type HTMLAttributes } from 'react';

export type ServiceCardProps = HTMLAttributes<HTMLDivElement> & {
  iconClass: string;
  title: string;
  description: string;
  href: string;
};

export const ServiceCard = forwardRef<HTMLDivElement, ServiceCardProps>(function ServiceCard(
  { iconClass, title, description, href, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-accent flex min-h-[370px] flex-col justify-between space-y-2 rounded-xl p-7 md:p-10',
        className
      )}
      {...props}
    >
      <div className="bg-secondary flex size-17 items-center justify-center rounded-3xl p-4">
        <span className={cn(iconClass, 'shrink-0 text-[35px] text-white')} />
      </div>
      <div className="space-y-2 text-left">
        <TextReveal delay={0.2}>
          <h3 className="text-heading-5 text-secondary/80">
            <Link href={href}>{title}</Link>
          </h3>
        </TextReveal>
        <TextReveal delay={0.3}>
          <p className="text-tagline-2 text-secondary/50">{description}</p>
        </TextReveal>
      </div>
    </div>
  );
});

ServiceCard.displayName = 'ServiceCard';
