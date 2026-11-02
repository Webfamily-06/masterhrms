import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/pricing',
          '/services',
          '/team',
          '/contact',
          '/blog',
          '/careers',
          '/docs',
          '/features',
          '/legal/',
        ],
        disallow: [
          '/api/',
          '/(workspace)/',
          '/dashboard',
          '/super/',
          '/super-login',
          '/super06',
          '/auth',
          '/login',
          '/signup',
          '/register',
          '/reset-password',
          '/verify-2fa',
          '/verify-email',
          '/lock-screen',
          '/onboarding',
        ],
      },
    ],
    sitemap: 'https://www.masterhrms.com/sitemap.xml',
    host: 'https://www.masterhrms.com',
  };
}

