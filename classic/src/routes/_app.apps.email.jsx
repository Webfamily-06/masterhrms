import { createFileRoute } from '@tanstack/react-router';
import Email from '/src/views/Email';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/email')({
  component: () => <RoutePage component={Email} path="/apps/email" />,
});
