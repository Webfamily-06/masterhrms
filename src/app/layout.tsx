import SmoothScrollProvider from "@/src/components/animation/smooth-scroll";
import Footer from "@/src/components/shared/layout/footer/footer";
import Navbar from "@/src/components/shared/layout/navbar/navbar";
import { MobileMenuProvider } from "@/src/context/MobileMenuContext";
import { fontVariables } from "@/src/utils/font";
import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/images/logo/favicon.webp', type: 'image/webp' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/images/logo/favicon.webp',
    apple: '/images/logo/favicon.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/logo/favicon.webp" type="image/webp" />
        <link rel="shortcut icon" href="/images/logo/favicon.webp" type="image/webp" />
        <link rel="apple-touch-icon" href="/images/logo/favicon.webp" />
      </head>
      <body className={`${fontVariables} antialiased`} suppressHydrationWarning>
        <Suspense>
          <MobileMenuProvider>
            <SmoothScrollProvider>
              <Navbar />
              <main className="bg-background-13">{children}</main>
              <Footer />
            </SmoothScrollProvider>
          </MobileMenuProvider>
        </Suspense>
      </body>
    </html>
  );
}
