import { createFileRoute } from '@tanstack/react-router';
import Gallery from '/src/views/Gallery';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/gallery')({
  component: () => <RoutePage component={Gallery} path="/apps/gallery" />,
});
