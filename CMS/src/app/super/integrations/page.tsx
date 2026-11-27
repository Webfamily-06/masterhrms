'use client';

import { IntegrationsHubStudio } from '@/components/integrations/integrations-hub-studio';

export default function SuperIntegrationsPage() {
  return (
    <div className="w-full min-w-0 space-y-5">
      <IntegrationsHubStudio mode="super" />
    </div>
  );
}
