import { createFileRoute } from "@tanstack/react-router";
import { CompanyProfileSettings } from "@/components/settings/company-profile-settings";

export const Route = createFileRoute("/_authenticated/tenant/company-profile")({
  component: TenantCompanyProfilePage,
  head: () => ({
    meta: [{ title: "Company Profile & Billing Identity — Master HRMS" }],
  }),
});

function TenantCompanyProfilePage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <CompanyProfileSettings />
    </div>
  );
}
