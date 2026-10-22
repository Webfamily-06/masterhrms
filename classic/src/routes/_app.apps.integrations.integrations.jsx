import { createFileRoute } from '@tanstack/react-router';
import Integration from '/src/views/Integrations/Integration';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/integrations/integrations')({
  component: () => <RoutePage component={Integration} path="/apps/integrations/integrations" />,
});
