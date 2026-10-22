import { createFileRoute } from '@tanstack/react-router';
import ContactCards from '/src/views/Contact/ContactCards';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/contacts/contact-cards')({
  component: () => <RoutePage component={ContactCards} path="/apps/contacts/contact-cards" />,
});
