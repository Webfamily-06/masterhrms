'use client';

import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { IntegrationsHubStudio } from '@/components/integrations/integrations-hub-studio';

export default function SuperIntegrationsPage() {
  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph-duotone ph-plugs-connected text-xl"></i>
            </span>
            App Integrations & Connected Services
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Centrally monitor, configure credentials, and manage third-party enterprise integrations across all tenant workspaces.
          </p>
        </div>
        <BreadcrumbNav
          items={[
            { label: 'Dashboard', href: '/super' },
            { label: 'Extensions & Add-ons', href: '/super/marketplace' },
            { label: 'Integrations Hub', href: '/super/integrations' },
          ]}
        />
      </div>

      <IntegrationsHubStudio />
    </div>
  );
}
