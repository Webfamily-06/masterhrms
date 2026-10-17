import type { NextConfig } from 'next';

import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
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
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:4000/uploads/:path*',
      },
    ];
  },
  async redirects() {
    return [
      { source: '/about', destination: '/#about', permanent: false },
      { source: '/features', destination: '/#features', permanent: false },
      { source: '/services', destination: '/#services', permanent: false },
      { source: '/team', destination: '/#team', permanent: false },
      { source: '/pricing', destination: '/#pricing', permanent: false },
      { source: '/blog', destination: '/#blog', permanent: false },
      { source: '/contact', destination: '/#contact', permanent: false },
      { source: '/login', destination: '/dashboard', permanent: false },
      { source: '/signup', destination: '/dashboard', permanent: false },
    ];
  },
};

export default nextConfig;
