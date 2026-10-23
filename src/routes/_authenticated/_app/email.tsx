import { createFileRoute } from "@tanstack/react-router";
import { MailboxClient } from "@/components/email/mailbox-client";
import { PageHeader } from "@/components/ui/page-header";

export const Route = createFileRoute("/_authenticated/_app/email")({
  component: EmailPage,
  head: () => ({ meta: [{ title: "Email Mailbox — Master HRMS" }] }),
});

export function EmailPage() {
  return (
    <div className="space-y-6 max-w-full pb-16">
      <PageHeader
        title="Email"
        description="Inbound mailbox synchronization and outbound SMTP communication via your personal email accounts."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Email" },
        ]}
      />
      <MailboxClient />
    </div>
  );
}

export default EmailPage;
