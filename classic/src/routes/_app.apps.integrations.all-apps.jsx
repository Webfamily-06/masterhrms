import { createFileRoute } from '@tanstack/react-router';
import AllApps from '/src/views/Integrations/All Apps';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/integrations/all-apps')({
  component: () => <RoutePage component={AllApps} path="/apps/integrations/all-apps" />,
});
