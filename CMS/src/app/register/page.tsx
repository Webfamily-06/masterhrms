import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account — Workspace ERP & HRMS',
  description: 'Sign up for your enterprise workspace account.',
};

export default function RegisterPage() {
  return <UnifiedAuthPage defaultMode="signup" />;
}
