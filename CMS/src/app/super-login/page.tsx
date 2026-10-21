import { Super06AuthPage } from '@/src/components/auth/Super06AuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Admin Console Sign In — Master Platform & Enterprise ERP',
  description: 'Authorized root administrator authentication portal for Master HRMS & Multi-Tenant Global ERP.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperLoginRoute() {
  return <Super06AuthPage />;
}
