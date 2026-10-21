import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password — Workspace ERP & HRMS',
  description: 'Enter your new workspace account password.',
};

export default function ResetPasswordPage() {
  return <UnifiedAuthPage defaultMode="reset" />;
}
