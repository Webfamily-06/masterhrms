import { createFileRoute } from '@tanstack/react-router';
import Dashboard from '/src/views/Dashboard';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/dashboard')({
  component: () => <RoutePage component={Dashboard} path="/dashboard" />,
});
