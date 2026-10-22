import type { NextConfig } from 'next';

import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    qualities: [100, 75],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
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
