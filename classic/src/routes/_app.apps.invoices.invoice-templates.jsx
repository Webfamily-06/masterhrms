import { createFileRoute } from '@tanstack/react-router';
import InvoiceTemplates from '/src/views/Invoices/InvoiceTemplates';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/invoices/invoice-templates')({
  component: () => <RoutePage component={InvoiceTemplates} path="/apps/invoices/invoice-templates" />,
});
