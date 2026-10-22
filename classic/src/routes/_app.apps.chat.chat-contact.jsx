import { createFileRoute } from '@tanstack/react-router';
import ChatContacts from '/src/views/Chat/Contact';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/chat/chat-contact')({
  component: () => <RoutePage component={ChatContacts} path="/apps/chat/chat-contact" />,
});
