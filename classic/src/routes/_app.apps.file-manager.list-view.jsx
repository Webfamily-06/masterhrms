import { createFileRoute } from '@tanstack/react-router';
import ListView from '/src/views/FileManager/ListView';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/file-manager/list-view')({
  component: () => <RoutePage component={ListView} path="/apps/file-manager/list-view" />,
});
