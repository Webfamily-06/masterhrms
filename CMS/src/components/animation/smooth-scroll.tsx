'use client';
import { ReactLenis, useLenis } from 'lenis/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useRef } from 'react';

interface SmoothScrollingProps {
  children: ReactNode;
}

const SmoothScrollProvider = ({ children }: Readonly<SmoothScrollingProps>) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathnameRef = useRef<string>(pathname);
  const isInitialRender = useRef(true);

  const lenis = useLenis();

  useEffect(() => {
    if (!isInitialRender.current && previousPathnameRef.current !== pathname) {
      lenis?.scrollTo(0, { immediate: true });
    }
    previousPathnameRef.current = pathname;
    isInitialRender.current = false;
  }, [pathname, searchParams, lenis]);

  useEffect(() => {
    if (!lenis) return;

    const handleClick = (ele: Element) => {
      lenis.scrollTo(ele.getAttribute('href') ?? '', {
        offset: -100,
      });
    };

    const elements = document.querySelectorAll('.lenis-scroll-to');
    const clickHandler = (e: Event) => handleClick(e.target as Element);

    elements.forEach((ele) => ele.addEventListener('click', clickHandler));
    return () => {
      elements.forEach((ele) => ele.removeEventListener('click', clickHandler));
    };
  }, [lenis, pathname]);

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        duration: 0.85,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        // Context7 Lenis best practice: never trap wheel events inside nested scrollable containers (sidebar, modals, selects, tables)
        prevent: (node: HTMLElement) => {
          if (!node || typeof node.closest !== 'function') return false;
          if (
            node.closest(
              '.sidebar, .sidebar-inner, [data-simplebar], [data-lenis-prevent], [role="dialog"], [role="listbox"], [role="menu"], [data-radix-select-viewport], [data-radix-popper-content-wrapper], .overflow-y-auto, .overflow-x-auto'
            )
          ) {
            return true;
          }
          return false;
        },
      }}
    >
      {children}
    </ReactLenis>
  );
};

export default SmoothScrollProvider;
