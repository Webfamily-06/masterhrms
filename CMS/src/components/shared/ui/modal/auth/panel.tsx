'use client';

import type { RefObject } from 'react';
import { EmailForm } from './email-form';
import { Providers } from './providers';

type PanelProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  registerItem: (index: number) => (node: HTMLElement | null) => void;
  onClose: () => void;
};

export function Panel({ panelRef, registerItem, onClose }: PanelProps) {
  return (
    <div
      ref={panelRef}
      className="relative z-20 w-full max-w-[360px] rounded-3xl border border-stroke-3 bg-white p-6"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        ref={registerItem(0)}
        onClick={onClose}
        className="absolute top-4 right-4 z-30 flex size-8 cursor-pointer items-center justify-center rounded-full bg-secondary/10 text-secondary transition-colors duration-300 hover:text-secondary/80"
        aria-label="Close auth modal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="size-4 fill-none stroke-current"
          aria-hidden
        >
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div ref={registerItem(1)} className="mb-7 text-center">
        <h3 className="text-heading-5 text-secondary">Welcome back</h3>
        <p className="text-tagline-3 mt-2 text-secondary/60">Sign in to your account to continue</p>
      </div>

      <Providers ref={registerItem(2)} />

      <div ref={registerItem(3)} className="mb-6 flex items-center gap-2">
        <span className="h-px w-full bg-secondary/10" />
        <span className="text-tagline-4 shrink-0 text-secondary/50">Or continue with email</span>
        <span className="h-px w-full bg-secondary/10" />
      </div>

      <EmailForm ref={registerItem(4)} />

      <p ref={registerItem(5)} className="text-tagline-3 mt-6 text-center text-secondary/40">
        By clicking continue, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
