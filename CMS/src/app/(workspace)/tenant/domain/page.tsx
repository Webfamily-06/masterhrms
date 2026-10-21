'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { CustomDomainSettings } from "@/components/custom-domain-settings";
import { Globe } from "lucide-react";



function TenantDomainPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Globe className="h-6 w-6 text-primary" />
          Workspace Domain & Custom Domain
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your default platform workspace subdomain and configure custom branded CNAME domains.
        </p>
      </div>

      <CustomDomainSettings />
    </div>
  );
}

export default TenantDomainPage;
