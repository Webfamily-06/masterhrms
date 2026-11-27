import { SuperShell } from '@/src/components/layout/SuperShell';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Admin Console — Master HRMS',
  description: 'Enterprise Super Administrator Control Center',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/duotone/style.css" />
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/regular/style.css" />
      <link rel="stylesheet" href="/assets/libs/@phosphor-icons/web/fill/style.css" />
      <link rel="stylesheet" href="/assets/libs/lucide-static/font/lucide.css" />
      <link rel="stylesheet" href="/assets/libs/@tabler/icons-webfont/tabler-icons.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var d=document.documentElement;d.classList.add('sidebar-no-transition');var b=document.body;if(b){var fv=localStorage.getItem('master_super_full_view')==='true';var c=localStorage.getItem('master_super_sidebar_collapsed')==='true';if(fv){b.classList.add('full-view','full-width');b.classList.remove('mini-sidebar','expand-menu');}else if(c){b.classList.add('mini-sidebar');b.classList.remove('full-view','full-width');}}requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.remove('sidebar-no-transition');});});}catch(e){}})();`,
        }}
      />
      <SuperShell>{children}</SuperShell>
    </>
  );
}
