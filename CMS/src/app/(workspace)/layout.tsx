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
  return (
    <>
      {/* ── DreamsERP / SmartHR Core Stylesheets & Icons ── */}
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/duotone/style.css" />
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/regular/style.css" />
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/fill/style.css" />
      <link rel="stylesheet" href="/assets/libs/lucide-static/font/lucide.css" />
      <link rel="stylesheet" href="/assets/libs/@tabler/icons-webfont/tabler-icons.min.css" />
      <link rel="stylesheet" href="/assets/libs/@fortawesome/fontawesome-free/css/all.min.css" />
      <link rel="stylesheet" href="/assets/css/style.css" />
      <WorkspaceShell>{children}</WorkspaceShell>
    </>
  );
}
