import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Email — Workspace ERP & HRMS',
  description: 'Confirm your work email with the 6-digit verification code.',
};

export default function VerifyEmailPage() {
  return <UnifiedAuthPage defaultMode="verify" />;
}
