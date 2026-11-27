import { WorkspaceShell } from '@/src/components/layout/WorkspaceShell';
import { DashboardDropdownHandler } from '@/src/components/dashboard/dashboard-dropdown-handler';
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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      <link rel="stylesheet" href="/assets/css/bootstrap-dashboard.css?v=2" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var d=document.documentElement;d.classList.add('sidebar-no-transition');var b=document.body;if(b){var fv=localStorage.getItem('master_hrms_full_view')==='true';var c=localStorage.getItem('master_hrms_sidebar_collapsed')==='true';if(fv){b.classList.add('full-view','full-width');b.classList.remove('mini-sidebar','expand-menu');}else if(c){b.classList.add('mini-sidebar');b.classList.remove('full-view','full-width');}}requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.remove('sidebar-no-transition');});});}catch(e){}})();`,
        }}
      />
      <DashboardDropdownHandler />
      <WorkspaceShell>{children}</WorkspaceShell>
    </>
  );
}

