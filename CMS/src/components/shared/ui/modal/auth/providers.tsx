'use client';

import appleAuth from '@/public/images/icons/apple-auth.svg';
import githubAuth from '@/public/images/icons/github-auth.svg';
import googleAuth from '@/public/images/icons/google-auth.svg';
import microsoftAuth from '@/public/images/icons/microsoft-auth.svg';
import twitterAuth from '@/public/images/icons/twitter-auth.svg';
import { cn } from '@/src/utils/cn';
import Image, { type StaticImageData } from 'next/image';
import type { Ref } from 'react';

type ProvidersProps = {
  ref?: Ref<HTMLDivElement>;
};

const providers: { id: string; icon: StaticImageData; className: string }[] = [
  { id: 'google', icon: googleAuth, className: 'size-5' },
  { id: 'apple', icon: appleAuth, className: 'size-5' },
  { id: 'microsoft', icon: microsoftAuth, className: 'size-4.5' },
  { id: 'github', icon: githubAuth, className: 'size-5' },
  { id: 'twitter', icon: twitterAuth, className: 'size-5' },
];

export function Providers({ ref }: ProvidersProps) {
  return (
    <div ref={ref} className="mb-7 grid grid-cols-5 gap-2.5">
      {providers.map(({ id, icon, className }) => (
        <button
          key={id}
          type="button"
          className="text-tagline-3 flex h-10 w-full items-center justify-center rounded-2xl bg-secondary/10 text-secondary/80 transition-transform duration-300 hover:scale-95"
        >
          <Image src={icon} alt="" width={20} height={20} className={cn('shrink-0', className)} />
        </button>
      ))}
    </div>
  );
}
