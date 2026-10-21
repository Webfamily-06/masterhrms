'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import SplitText from 'gsap/SplitText';
import { useRef } from 'react';

gsap.registerPlugin(SplitText, useGSAP);

type AccordionTextRevealProps = Readonly<{
  children: React.ReactNode;
  open: boolean;
}>;

export function AccordionTextReveal({ children, open }: AccordionTextRevealProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<SplitText | null>(null);

  useGSAP(
    () => {
      const paragraph = scopeRef.current?.querySelector('p');
      if (!paragraph?.textContent?.trim()) return;

      const revertSplit = () => {
        splitRef.current?.revert();
        splitRef.current = null;
      };

      if (!open) {
        revertSplit();
        return;
      }

      revertSplit();
      splitRef.current = SplitText.create(paragraph, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'text-reveal-line',
      });

      gsap.fromTo(
        splitRef.current.lines,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        }
      );

      return revertSplit;
    },
    { scope: scopeRef, dependencies: [open] }
  );

  return (
    <div
      ref={scopeRef}
      className="w-full transform-gpu [&_.text-reveal-line]:transform-gpu [&_.text-reveal-line]:backface-hidden [&_p]:transform-gpu"
    >
      {children}
    </div>
  );
}
