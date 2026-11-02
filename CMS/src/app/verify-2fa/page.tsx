import { Verify2faPage } from '@/src/components/auth/Verify2faPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication — MasterHRMS',
  description: 'Enter your 6-digit verification code to complete sign in.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Verify2faRoute() {
  return <Verify2faPage />;
}
