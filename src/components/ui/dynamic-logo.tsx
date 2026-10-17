'use client';

import { useState } from 'react';
import { useDynamicBranding } from '@/src/lib/useDynamicBranding';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface DynamicLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  showTitle?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  subtext?: string;
}

export function DynamicLogo({
  className = '',
  variant = 'auto',
  showTitle = true,
  size = 'md',
  href,
  subtext,
}: DynamicLogoProps) {
  const branding = useDynamicBranding();
  const [imageError, setImageError] = useState(false);

  const activeLogoSrc = variant === 'light' ? branding.logoUrl : branding.logoDarkUrl;

  const sizeClasses = {
    sm: { img: 'h-7 w-auto max-w-[120px]', icon: 'h-7 w-7 text-xs', text: 'text-sm' },
    md: { img: 'h-9 w-auto max-w-[160px]', icon: 'h-9 w-9 text-sm', text: 'text-base' },
    lg: { img: 'h-11 w-auto max-w-[200px]', icon: 'h-11 w-11 text-base', text: 'text-lg sm:text-xl' },
    xl: { img: 'h-14 w-auto max-w-[240px]', icon: 'h-14 w-14 text-xl', text: 'text-2xl sm:text-3xl' },
  }[size];

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Dynamic Image or Gradient Fallback */}
      {activeLogoSrc && !imageError ? (
        <div className="relative flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeLogoSrc}
            alt={branding.appName || 'Logo'}
            className={`${sizeClasses.img} object-contain`}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div
          className={`relative flex ${sizeClasses.icon} items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md shadow-purple-900/40 text-white font-black tracking-wider shrink-0`}
        >
          {branding.appName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'HR'}
        </div>
      )}

      {/* Dynamic App Title */}
      {showTitle && (
        <div className="flex flex-col text-left">
          <span className={`font-bold tracking-tight text-white ${sizeClasses.text}`}>
            {branding.appName}
          </span>
          {subtext && <span className="text-[10px] text-white/50">{subtext}</span>}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
