import { createFileRoute } from '@tanstack/react-router';
import ContactList from '/src/views/Contact/ContactList';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/contacts/contact-list')({
  component: () => <RoutePage component={ContactList} path="/apps/contacts/contact-list" />,
});
