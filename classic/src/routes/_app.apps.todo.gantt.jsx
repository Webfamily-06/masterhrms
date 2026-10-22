import { createFileRoute } from '@tanstack/react-router';
import Gantt from '/src/views/Todo/Gantt';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/todo/gantt')({
  component: () => <RoutePage component={Gantt} path="/apps/todo/gantt" />,
});
