import { Super06AuthPage } from '@/src/components/auth/Super06AuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Root Sign In — Master HRMS',
  description: 'Dedicated root administrator authentication portal for Super Admin access.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Super06Route() {
  return <Super06AuthPage />;
}
