'use client';

import React from 'react';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { useRouter as useNextRouter, usePathname, useSearchParams, useParams as useNextParams } from 'next/navigation';

export function useRouter() {
  const router = useNextRouter();
  const navigate = useNavigate();
  return {
    ...router,
    navigate: (opts: { to?: string; params?: Record<string, any>; search?: Record<string, any>; replace?: boolean } | string) => {
      if (typeof opts === 'string') {
        router.push(opts);
      } else {
        navigate(opts);
      }
    },
  };
}

export interface CompatLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to?: string;
  href?: string;
  params?: Record<string, any>;
  search?: Record<string, any>;
  children?: React.ReactNode;
}

export function Link({ to, href, params, search, children, ...props }: CompatLinkProps) {
  let targetUrl = to || href || '#';
  if (params && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([key, val]) => {
      targetUrl = targetUrl.replace(new RegExp(`\\$${key}|:${key}`, 'g'), String(val));
    });
  }
  if (search && Object.keys(search).length > 0) {
    const sp = new URLSearchParams();
    Object.entries(search).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        sp.set(key, String(val));
      }
    });
    const qs = sp.toString();
    if (qs) {
      targetUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${qs}`;
    }
  }

  return (
    <NextLink href={targetUrl} {...props}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useNextRouter();
  const pathname = usePathname() || '';

  return (opts: { to?: string; params?: Record<string, any>; search?: Record<string, any>; replace?: boolean }) => {
    let targetUrl = opts.to || pathname;
    if (opts.params && Object.keys(opts.params).length > 0) {
      Object.entries(opts.params).forEach(([key, val]) => {
        targetUrl = targetUrl.replace(new RegExp(`\\$${key}|:${key}`, 'g'), String(val));
      });
    }
    if (opts.search && Object.keys(opts.search).length > 0) {
      const sp = new URLSearchParams();
      Object.entries(opts.search).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          sp.set(key, String(val));
        }
      });
      const qs = sp.toString();
      if (qs) {
        targetUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${qs}`;
      }
    }

    if (opts.replace) {
      router.replace(targetUrl);
    } else {
      router.push(targetUrl);
    }
  };
}

export function useRouterState({ select }: { select?: (state: any) => any } = {}) {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const state = {
    location: {
      pathname,
      search: searchParams ? Object.fromEntries(searchParams.entries()) : {},
    },
  };

  return select ? select(state) : state;
}

export function notFound() {
  return null;
}

export function redirect(opts: any) {
  return opts;
}

export function Outlet() {
  return null;
}

export function useSearch(opts?: any) {
  const searchParams = useSearchParams();
  if (!searchParams) return {};
  const entries = Object.fromEntries(searchParams.entries());
  if (opts?.select) return opts.select(entries);
  return entries;
}

export function useParams<T = Record<string, any>>(_opts?: any): T {
  const params = useNextParams();
  return (params || {}) as T;
}

export function useMatch() {
  const pathname = usePathname() || '';
  return { pathname, params: {} };
}

export function useMatches(): any[] {
  return [];
}

export function useChildMatches(): any[] {
  return [];
}

export const Route = {
  useSearch: (opts?: any) => {
    if (typeof window === 'undefined') return {};
    const searchParams = new URLSearchParams(window.location.search);
    const entries = Object.fromEntries(searchParams.entries());
    if (opts?.select) return opts.select(entries);
    return entries;
  },
  useParams: <T = Record<string, any>>(): T => {
    return (useNextParams() || {}) as T;
  },
  useNavigate: () => useNavigate(),
  useMatch: () => useMatch(),
};

export function createFileRoute(path: string) {
  return (config: any) => ({
    ...config,
    useSearch: (opts?: any) => {
      if (typeof window === 'undefined') return {};
      const searchParams = new URLSearchParams(window.location.search);
      const entries = Object.fromEntries(searchParams.entries());
      if (opts?.select) return opts.select(entries);
      return entries;
    },
    useParams: <T = Record<string, any>>(): T => {
      return (useNextParams() || {}) as T;
    },
    useNavigate: () => useNavigate(),
    useMatch: () => useMatch(),
  });
}

