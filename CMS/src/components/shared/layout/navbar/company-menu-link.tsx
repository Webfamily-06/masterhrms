'use client';

import HoverBgTransform from '@/src/components/shared/hover-bg-transform';
import Link from 'next/link';
import type { ComponentType } from 'react';

export interface CompanyMenuLinkProps {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  onClose?: () => void;
}

export const CompanyMenuLink = ({
  title,
  description,
  href,
  icon: Icon,
  onClose,
}: CompanyMenuLinkProps) => (
  <li>
    <Link href={href} onClick={onClose} className="group relative flex items-start gap-2 p-3">
      <HoverBgTransform />
      <div className="border-stroke-1 relative z-10 mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg border p-1">
        <Icon />
      </div>
      <div className="relative z-10">
        <p className="text-tagline-1 text-secondary font-normal">{title}</p>
        <p className="text-tagline-2 text-secondary/60 font-normal">{description}</p>
      </div>
    </Link>
  </li>
);
