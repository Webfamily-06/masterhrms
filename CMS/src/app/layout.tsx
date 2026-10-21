import SmoothScrollProvider from "@/src/components/animation/smooth-scroll";
import { MobileMenuProvider } from "@/src/context/MobileMenuContext";
import { fontVariables } from "@/src/utils/font";
import { ReactNode, Suspense } from "react";
import { AppShell } from "@/src/components/layout/AppShell";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/webp" href="/favicon.webp" />
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
          <MobileMenuProvider>
            <SmoothScrollProvider>
              <AppShell>{children}</AppShell>
            </SmoothScrollProvider>
          </MobileMenuProvider>
        </Suspense>
      </body>
    </html>
  );
}
