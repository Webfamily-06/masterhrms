import { createFileRoute } from '@tanstack/react-router';
import CreateInvoice from '/src/views/Invoices/CreateInvoice';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/invoices/create-invoice')({
  component: () => <RoutePage component={CreateInvoice} path="/apps/invoices/create-invoice" />,
});
