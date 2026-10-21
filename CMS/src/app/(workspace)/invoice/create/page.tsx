'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { InvoiceCreatorView } from "@/components/invoices/invoice-creator-view";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



function CreateInvoicePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BreadcrumbNav />
      <InvoiceCreatorView />
    </div>
  );
}

export default CreateInvoicePage;
