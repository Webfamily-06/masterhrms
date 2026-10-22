import { createFileRoute } from '@tanstack/react-router';
import PreviewInvoice from '/src/views/Invoices/PreviewInvoice';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/invoices/invoice-preview')({
  component: () => <RoutePage component={PreviewInvoice} path="/apps/invoices/invoice-preview" />,
});
