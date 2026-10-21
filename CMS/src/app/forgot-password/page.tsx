import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password — Workspace ERP & HRMS',
  description: 'Reset your enterprise workspace account password.',
};

export default function ForgotPasswordPage() {
  return <UnifiedAuthPage defaultMode="forgot" />;
}
