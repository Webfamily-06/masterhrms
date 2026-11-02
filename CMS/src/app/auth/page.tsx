import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — MasterHRMS Enterprise Portal',
  description: 'Sign in to your enterprise MasterHRMS workforce workspace.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthPage() {
  return <UnifiedAuthPage defaultMode="signin" />;
}
