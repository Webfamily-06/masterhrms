'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useCallback, useEffect, useRef } from 'react';

type UseAnimationOptions = {
  open: boolean;
  onClose: () => void;
};

export function useAnimation({ open, onClose }: UseAnimationOptions) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const registerItem = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      itemRefs.current[index] = node;
    },
    []
  );

  const getTargets = () => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const items = itemRefs.current.filter(Boolean);
    return { backdrop, panel, items };
  };

  const close = useCallback(() => {
    const { backdrop, panel, items } = getTargets();

    if (!backdrop || !panel) {
      onClose();
      return;
    }

    gsap.killTweensOf([backdrop, panel, ...items]);
    gsap
      .timeline({ onComplete: onClose })
      .to(items, { opacity: 0, y: 8, duration: 0.12, stagger: 0.02, ease: 'power1.in' })
      .to(panel, { opacity: 0, y: 16, scale: 0.96, duration: 0.18, ease: 'power2.in' }, '-=0.06')
      .to(backdrop, { opacity: 0, duration: 0.16, ease: 'power2.in' }, '-=0.1');
  }, [onClose]);

  useGSAP(
    () => {
      if (!open) return;

      const { backdrop, panel, items } = getTargets();
      if (!backdrop || !panel) return;

      gsap.killTweensOf([backdrop, panel, ...items]);
      gsap.set(backdrop, { opacity: 0 });
      gsap.set(panel, { opacity: 0, y: 28, scale: 0.94 });
      gsap.set(items, { opacity: 0, y: 16 });

      gsap
        .timeline()
        .to(backdrop, { opacity: 1, duration: 0.22, ease: 'power2.out' })
        .to(panel, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' }, '-=0.08')
        .to(items, { opacity: 1, y: 0, duration: 0.28, stagger: 0.045, ease: 'power2.out' }, '-=0.18');
    },
    { dependencies: [open] }
  );

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      globalThis.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return { backdropRef, panelRef, registerItem, close };
}
