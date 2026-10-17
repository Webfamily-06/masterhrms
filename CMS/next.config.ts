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
};

export default nextConfig;
