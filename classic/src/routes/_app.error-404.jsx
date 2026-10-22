import { createFileRoute } from '@tanstack/react-router';
import Error404 from '/src/views/Authentication/Error404/Error404';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/error-404')({
  component: () => <RoutePage component={Error404} path="/error-404" />,
});
