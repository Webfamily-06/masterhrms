import { createFileRoute } from '@tanstack/react-router';
import IntegrationsDetail from '/src/views/Integrations/App Details';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/integrations/integrations-detail')({
  component: () => <RoutePage component={IntegrationsDetail} path="/apps/integrations/integrations-detail" />,
});
