import { Verify2faPage } from '@/src/components/auth/Verify2faPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication — Master Workspace ERP',
  description: 'Enter your 6-digit verification code to complete sign in.',
};

export default function Verify2faRoute() {
  return <Verify2faPage />;
}
