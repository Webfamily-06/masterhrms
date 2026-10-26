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
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    const backendOrigin = (process.env.SERVER_URL || 'http://localhost:4000').replace(/\/+$/, '');
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
