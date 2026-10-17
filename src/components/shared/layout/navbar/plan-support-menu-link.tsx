'use client';

import HoverBgTransform from '@/src/components/shared/hover-bg-transform';
import Link from 'next/link';
import type { ComponentType } from 'react';

export interface PlanSupportMenuLinkProps {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  onClose?: () => void;
}

export const PlanSupportMenuLink = ({
  title,
  description,
  href,
  icon: Icon,
  onClose,
}: PlanSupportMenuLinkProps) => (
  <li>
    <Link
      href={href}
      onClick={onClose}
      className="group relative flex items-start gap-3 rounded-[10px] p-3 transition-all duration-300"
    >
      <HoverBgTransform />
      <div className="border-stroke-3 relative z-10 mt-1.5 shrink-0 rounded-lg border p-1">
        <Icon />
      </div>
      <div className="relative z-10 space-y-0.5">
        <p className="text-tagline-1 text-secondary font-normal">{title}</p>
        <p className="text-tagline-3 text-secondary/60 font-normal">{description}</p>
      </div>
    </Link>
  </li>
);
