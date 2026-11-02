import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password — MasterHRMS Enterprise Portal',
  description: 'Enter your new workspace account password.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return <UnifiedAuthPage defaultMode="reset" />;
}
