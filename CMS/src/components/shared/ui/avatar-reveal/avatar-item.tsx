'use client';

import { useRevealRegister } from '@/src/components/shared/ui/avatar-reveal/avatar-reveal';
import { cn } from '@/src/utils/cn';
import React, { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'ref'>;

const AvatarItem: React.FC<Props> = ({ children, className, ...rest }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const register = useRevealRegister();

  useEffect(() => {
    register(ref.current);
  }, [register]);

  return (
    <div ref={ref} className={cn(className)} data-ns-avatar {...rest}>
      {children}
    </div>
  );
};

export default AvatarItem;
