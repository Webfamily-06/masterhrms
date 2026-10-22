import { createFileRoute } from '@tanstack/react-router';
import EditContact from '/src/views/Contact/EditContact';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/contacts/edit-contact')({
  component: () => <RoutePage component={EditContact} path="/apps/contacts/edit-contact" />,
});
