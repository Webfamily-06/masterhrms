import { createFileRoute } from "@tanstack/react-router";
import { InvoiceCreatorView } from "@/components/invoices/invoice-creator-view";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export const Route = createFileRoute("/_authenticated/_app/invoice/create")({
  component: CreateInvoicePage,
  head: () => ({ meta: [{ title: "Create Sales Invoice — Master ERP" }] }),
});

function CreateInvoicePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />
      <InvoiceCreatorView />
    </div>
  );
}
