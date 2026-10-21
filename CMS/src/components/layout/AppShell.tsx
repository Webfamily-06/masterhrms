'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/src/components/shared/layout/navbar/navbar';
import Footer from '@/src/components/shared/layout/footer/footer';
import { AppProviders } from '@/src/components/providers/AppProviders';

const MARKETING_PAGES = [
  '/',
  '/about',
  '/blog',
  '/contact',
  '/pricing',
  '/services',
  '/team',
  '/features',
  '/legal',
  '/product',
  '/solutions',
  '/resources',
  '/cms',
  '/p',
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  
  // Marketing pages render the public website navbar and footer
  const isMarketing = MARKETING_PAGES.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')
  );

  return (
    <AppProviders>
      {isMarketing ? (
        <div className="marketing-scope">
          <Navbar />
          <main className="bg-background-13">{children}</main>
          <Footer />
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground antialiased">{children}</div>
      )}
    </AppProviders>
  );
}
