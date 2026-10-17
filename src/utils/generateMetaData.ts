import type { Metadata } from 'next';

export const DEFAULT_URL = 'https://next-saas-next.vercel.app/';
export const DEFAULT_TITLE = 'Webfamily Tech Solutions - Software, SaaS & Startup Tailwind Template';
export const DEFAULT_DESCRIPTION =
  'Webfamily Tech Solutions - the ultimate collection of 42+ premium Nextjs templates for SaaS businesses and startups. Built with Tailwind CSS, featuring responsive design, authentication flows, pricing pages, and modern UI components. Perfect for web applications and digital products.';
export const DEFAULT_IMAGE_URL =
  'https://images.prismic.io/staticmania/aPD-K55xUNkB2D2X_og-image.jpg';

const defaultMetadata: Metadata = {
  metadataBase: new URL(DEFAULT_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Webfamily Tech Solutions',
    url: DEFAULT_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_IMAGE_URL, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_IMAGE_URL],
  },
  icons: {
    icon: '/images/logo/favicon.webp',
    shortcut: '/images/logo/favicon.webp',
    apple: '/images/logo/favicon.webp',
  },
};

const generateMetadata = (
  title?: string,
  description?: string,
  canonicaUrl?: string,
  imageUrl?: string
): Metadata => {
  return {
    ...defaultMetadata,
    title: title ?? defaultMetadata.title,
    description: description ?? defaultMetadata.description,
    alternates: {
      canonical: canonicaUrl,
    },
    openGraph: {
      ...defaultMetadata.openGraph,
      title: title ?? defaultMetadata.openGraph?.title,
      description: description ?? defaultMetadata.openGraph?.description,
      url: canonicaUrl ?? defaultMetadata.openGraph?.url,
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630 }]
        : defaultMetadata.openGraph?.images,
    },
    twitter: {
      ...defaultMetadata.twitter,
      title: title ?? defaultMetadata.twitter?.title,
      description: description ?? defaultMetadata.twitter?.description,
      images: imageUrl ? [imageUrl] : defaultMetadata.twitter?.images,
    },
  };
};

export { defaultMetadata, generateMetadata };
