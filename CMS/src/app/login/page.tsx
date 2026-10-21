import { UnifiedAuthPage } from '@/src/components/auth/UnifiedAuthPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Workspace ERP & HRMS',
  description: 'Sign in to your enterprise ERP & HRMS workspace.',
};

export default function LoginPage() {
  return <UnifiedAuthPage defaultMode="signin" />;
}
