import type { NextConfig } from 'next';

import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
  async rewrites() {
    const rawBackend = process.env.SERVER_URL || process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
    const backendOrigin = rawBackend
      ? rawBackend.replace(/\/+$/, '')
      : process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:4000';

    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: '/carriers',
        destination: '/careers',
      },
      {
        source: '/carriers/:path*',
        destination: '/careers/:path*',
      },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/iclock/:path*',
        destination: `${backendOrigin}/iclock/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/super/media',
        destination: '/super/files',
        permanent: false,
      },
      {
        source: '/hr/media',
        destination: '/hr/files',
        permanent: false,
      },
      {
        source: '/me/media',
        destination: '/me/files',
        permanent: false,
      },
      {
        source: '/media',
        destination: '/tenant/files',
        permanent: false,
      },
      {
        source: '/apps/file-manager/list-view',
        destination: '/hr/files?view=list',
        permanent: false,
      },
      {
        source: '/apps/file-manager/grid-view',
        destination: '/hr/files?view=grid',
        permanent: false,
      },
      {
        source: '/testimonial',
        destination: '/#testimonials',
        permanent: false,
      },
      {
        source: '/case-study',
        destination: '/resources#case-studies',
        permanent: false,
      },
    ];
  },
  // W2-DEFECT-007 / PARTIAL-006: Security headers & Cloudflare Turnstile / Razorpay compatible CSP
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
      "connect-src 'self' http://localhost:4000 ws://localhost:4000 https: wss:",
      "frame-src 'self' https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com",
      "media-src 'self' blob: data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
        ],
      },
    ];
  },
};

export default nextConfig;
