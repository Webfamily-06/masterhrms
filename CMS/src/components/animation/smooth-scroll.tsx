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
    // Only scroll to top if pathname actually changed (navigation), not on initial render or reload
    if (!isInitialRender.current && previousPathnameRef.current !== pathname) {
      lenis?.scrollTo(0, { immediate: true });
    }

    // Update refs
    previousPathnameRef.current = pathname;
    isInitialRender.current = false;
  }, [pathname, searchParams, lenis]);

  useEffect(() => {
    if (!lenis) {
      return;
    }

    const handleClick = (ele: Element) => {
      lenis.scrollTo(ele.getAttribute('href') ?? '', {
        offset: -100,
      });
    };

    const elements = document.querySelectorAll('.lenis-scroll-to');
    const clickHandler = (e: Event) => handleClick(e.target as Element);

    elements.forEach((ele) => {
      ele.addEventListener('click', clickHandler);
    });

    return () => {
      elements.forEach((ele) => {
        ele.removeEventListener('click', clickHandler);
      });
    };
  }, [lenis, pathname]);

  // Disable Lenis smooth scroll on all workspaces, admin dashboards, and employee portals to prevent wheel/touch trapping
  const isWorkspace =
    pathname.startsWith('/super') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/hr') ||
    pathname.startsWith('/me') ||
    pathname.startsWith('/tenant') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/pos') ||
    pathname.startsWith('/crm') ||
    pathname.startsWith('/accounting') ||
    pathname.startsWith('/smart-') ||
    pathname.startsWith('/addons') ||
    pathname.startsWith('/okr') ||
    pathname.startsWith('/notice-board') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/leave') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/recruitment') ||
    pathname.startsWith('/training') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/meetings') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/lock-screen') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('.localhost'));

  if (isWorkspace) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ duration: 0.9, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
};

export default SmoothScrollProvider;
