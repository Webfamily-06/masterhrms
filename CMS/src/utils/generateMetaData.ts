import type { Metadata } from 'next';

export const DEFAULT_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.masterhrms.com';
export const DEFAULT_TITLE = 'MasterHRMS — Enterprise HRMS, Payroll & Workforce Management';
export const DEFAULT_DESCRIPTION =
  'Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.';
export const DEFAULT_IMAGE_URL = 'https://www.masterhrms.com/og-image.png';

const defaultMetadata: Metadata = {
  metadataBase: new URL(DEFAULT_URL),
  applicationName: 'MasterHRMS',
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: DEFAULT_URL,
  },
  openGraph: {
    type: 'website',
    siteName: 'MasterHRMS',
    url: DEFAULT_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_IMAGE_URL, width: 1200, height: 630, alt: DEFAULT_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_IMAGE_URL],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.webp', sizes: '80x80', type: 'image/webp' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
};

const generateMetadata = (
  title?: string,
  description?: string,
  canonicaUrl?: string,
  imageUrl?: string
): Metadata => {
  const resolvedTitle = title || DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const resolvedUrl = canonicaUrl || DEFAULT_URL;
  const resolvedImage = imageUrl || DEFAULT_IMAGE_URL;

  return {
    ...defaultMetadata,
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical: resolvedUrl,
    },
    openGraph: {
      ...defaultMetadata.openGraph,
      title: resolvedTitle,
      description: resolvedDescription,
      url: resolvedUrl,
      images: [{ url: resolvedImage, width: 1200, height: 630, alt: resolvedTitle }],
    },
    twitter: {
      ...defaultMetadata.twitter,
      title: resolvedTitle,
      description: resolvedDescription,
      images: [resolvedImage],
    },
  };
};

export { defaultMetadata, generateMetadata };
