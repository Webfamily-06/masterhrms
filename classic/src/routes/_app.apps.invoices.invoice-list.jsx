import { createFileRoute } from '@tanstack/react-router';
import InvoiceList from '/src/views/Invoices/InvoiceList';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/invoices/invoice-list')({
  component: () => <RoutePage component={InvoiceList} path="/apps/invoices/invoice-list" />,
});
