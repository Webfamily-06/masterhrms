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
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
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
};

export default nextConfig;
