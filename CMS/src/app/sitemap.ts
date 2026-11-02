import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.masterhrms.com';
  const now = new Date();

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/services', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/features', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/team', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/careers', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/docs', priority: 0.6, changeFrequency: 'weekly' as const },
    { path: '/legal/privacy-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/legal/terms-and-conditions', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}

