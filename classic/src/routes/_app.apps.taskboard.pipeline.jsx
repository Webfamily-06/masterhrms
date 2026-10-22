import { createFileRoute } from '@tanstack/react-router';
import Pipeline from '/src/views/Scrumboard/Pipeline';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/taskboard/pipeline')({
  component: () => <RoutePage component={Pipeline} path="/apps/taskboard/pipeline" />,
});
