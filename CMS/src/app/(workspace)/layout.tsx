import { WorkspaceShell } from '@/src/components/layout/WorkspaceShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace — Master HRMS',
  description: 'Master HRMS & Global Enterprise ERP Workspace',
  robots: {
    index: false,
    follow: false,
  },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
