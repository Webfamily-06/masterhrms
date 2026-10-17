'use client';

import HoverBgTransform from '@/src/components/shared/hover-bg-transform';
import Link from 'next/link';
import type { ComponentType } from 'react';

export interface InnerPagesMenuLinkProps {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  onClose?: () => void;
}

export const InnerPagesMenuLink = ({ label, href, icon: Icon, onClose }: InnerPagesMenuLinkProps) => (
  <li>
    <Link href={href} onClick={onClose} className="group relative flex items-center gap-2 rounded-[10px] p-3">
      <HoverBgTransform />
      <span className="border-stroke-3 relative z-10 rounded-lg border p-1">
        <Icon />
      </span>
      <span className="text-tagline-1 text-secondary relative z-10 font-normal">{label}</span>
    </Link>
  </li>
);
