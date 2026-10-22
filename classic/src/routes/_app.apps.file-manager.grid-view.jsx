import { createFileRoute } from '@tanstack/react-router';
import GridView from '/src/views/FileManager/GridView';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/file-manager/grid-view')({
  component: () => <RoutePage component={GridView} path="/apps/file-manager/grid-view" />,
});
