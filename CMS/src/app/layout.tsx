import SmoothScrollProvider from "@/src/components/animation/smooth-scroll";
import { MobileMenuProvider } from "@/src/context/MobileMenuContext";
import { fontVariables } from "@/src/utils/font";
import { ReactNode, Suspense } from "react";
import type { Viewport, Metadata } from "next";
import { AppShell } from "@/src/components/layout/AppShell";
import { AppProviders } from "@/src/components/providers/AppProviders";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.masterhrms.com"),
  title: {
    template: "%s — MasterHRMS",
    default: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",
  },
  description:
    "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",
  applicationName: "MasterHRMS",
  alternates: {
    canonical: "https://www.masterhrms.com",
  },
  openGraph: {
    type: "website",
    siteName: "MasterHRMS",
    url: "https://www.masterhrms.com",
    title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",
    description:
      "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",
    images: [
      {
        url: "https://www.masterhrms.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MasterHRMS — Enterprise HRMS, Payroll & Workforce Management",
    description:
      "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",
    images: ["https://www.masterhrms.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.webp", sizes: "80x80", type: "image/webp" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MasterHRMS",
    url: "https://www.masterhrms.com",
    logo: "https://www.masterhrms.com/logo.webp",
    description: "Enterprise HRMS, Payroll & Workforce Management Platform",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MasterHRMS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://www.masterhrms.com",
    description:
      "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MasterHRMS",
    url: "https://www.masterhrms.com",
    description:
      "Manage your workforce with MasterHRMS. Simplify employee management, payroll, attendance, leave, recruitment and HR operations with a secure enterprise HRMS platform.",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@400;500;600;700;800&display=swap" />
        <link rel="stylesheet" href="/ui-assets/libs/@phosphor-icons/web/duotone/style.css" />
        <link rel="stylesheet" href="/ui-assets/libs/@phosphor-icons/web/regular/style.css" />
        <link rel="stylesheet" href="/ui-assets/libs/@phosphor-icons/web/fill/style.css" />
        <link rel="stylesheet" href="/ui-assets/libs/lucide-static/font/lucide.css" />
        <link rel="stylesheet" href="/ui-assets/libs/@fortawesome/fontawesome-free/css/fontawesome.min.css" />
        <link rel="stylesheet" href="/ui-assets/libs/@fortawesome/fontawesome-free/css/all.min.css" />
        <link rel="stylesheet" href="/ui-assets/libs/@tabler/icons-webfont/tabler-icons.min.css" />
      </head>
      <body className={`${fontVariables} antialiased font-sans`}>
        <Suspense>
          <AppProviders>
            <MobileMenuProvider>
              <SmoothScrollProvider>
                <AppShell>{children}</AppShell>
              </SmoothScrollProvider>
            </MobileMenuProvider>
          </AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
