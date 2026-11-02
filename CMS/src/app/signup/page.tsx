import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account — MasterHRMS Enterprise Portal',
  description: 'Sign up for your MasterHRMS enterprise workspace account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return <UnifiedAuthPage defaultMode="signup" />;
}
