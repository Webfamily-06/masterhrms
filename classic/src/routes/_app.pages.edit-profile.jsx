import { createFileRoute } from '@tanstack/react-router';
import EditProfile from '/src/views/Profiles/EditProfile';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/pages/edit-profile')({
  component: () => <RoutePage component={EditProfile} path="/pages/edit-profile" />,
});
