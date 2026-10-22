import { createFileRoute } from '@tanstack/react-router';
import Chats from '/src/views/Chat/Chats';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/chat/chats')({
  component: () => <RoutePage component={Chats} path="/apps/chat/chats" />,
});
