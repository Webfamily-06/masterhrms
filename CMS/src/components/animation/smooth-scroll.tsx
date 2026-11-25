'use client';
import { ReactLenis, useLenis } from 'lenis/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useRef } from 'react';
import { isTenantWorkspaceHost } from '@/lib/platform-domain';

interface SmoothScrollingProps {
  children: ReactNode;
}

const WORKSPACE_PREFIXES = [
  '/super',
  '/admin',
  '/hr',
  '/me',
  '/tenant',
  '/portal',
  '/pos',
  '/crm',
  '/accounting',
  '/smart-',
  '/addons',
  '/okr',
  '/notice-board',
  '/employees',
  '/attendance',
  '/leave',
  '/payroll',
  '/recruitment',
  '/training',
  '/assets',
  '/meetings',
  '/documents',
  '/chat',
  '/profile',
  '/users',
  '/apps',
  '/hrm-dashboard',
  '/employee-dashboard',
  '/client-dashboard',
  '/lock-screen',
  '/auth',
  '/login',
];

const SmoothScrollProvider = ({ children }: Readonly<SmoothScrollingProps>) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathnameRef = useRef<string>(pathname);
  const isInitialRender = useRef(true);

  const isWorkspace =
    WORKSPACE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    (typeof window !== 'undefined' && isTenantWorkspaceHost());

  const lenis = useLenis();

  // Permanently clear any stale Lenis classes/overflow locks when entering a workspace route
  useEffect(() => {
    if (!isWorkspace || typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    html.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
    body.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
    if (html.style.overflow === 'hidden' || html.style.overflow === 'clip') {
      html.style.overflow = '';
    }
  }, [isWorkspace, pathname]);

  useEffect(() => {
    if (isWorkspace) return;
    if (!isInitialRender.current && previousPathnameRef.current !== pathname) {
      lenis?.scrollTo(0, { immediate: true });
    }
    previousPathnameRef.current = pathname;
    isInitialRender.current = false;
  }, [pathname, searchParams, lenis, isWorkspace]);

  useEffect(() => {
    if (isWorkspace || !lenis) return;

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
  }, [lenis, pathname, isWorkspace]);

  // Disable Lenis completely on all workspace/dashboard pages so sidebar & tables scroll natively with zero initial delay
  if (isWorkspace) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        duration: 0.85,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
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
