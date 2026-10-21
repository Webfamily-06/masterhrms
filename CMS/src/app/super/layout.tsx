import { SuperShell } from '@/src/components/layout/SuperShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Admin Console — Master HRMS',
  description: 'Enterprise Super Administrator Control Center',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return <SuperShell>{children}</SuperShell>;
}
