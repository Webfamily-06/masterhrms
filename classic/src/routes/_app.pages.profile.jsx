import { createFileRoute } from '@tanstack/react-router';
import Profile from '/src/views/Profiles/Profile';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/pages/profile')({
  component: () => <RoutePage component={Profile} path="/pages/profile" />,
});
