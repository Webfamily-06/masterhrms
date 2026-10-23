'use client';

import { UserEmailAccountsSettings } from "@/components/settings/user-email-accounts-settings";
import { PageHeader } from "@/components/ui/page-header";

export default function EmailAccountsPage() {
  return (
    <div className="space-y-6 max-w-full pb-16">
      <PageHeader
        title="Email Accounts"
        description="Configure personal incoming (IMAP/POP3) and outgoing (SMTP) credentials for your user account."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Settings", href: "/hr/settings" },
          { label: "Email Accounts" },
        ]}
      />
      <UserEmailAccountsSettings />
    </div>
  );
}
