import { createFileRoute } from '@tanstack/react-router';
import ChatPopup from '/src/views/ChatPopup/DirectMessage';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/chat-bot/chatpopup')({
  component: () => <RoutePage component={ChatPopup} path="/apps/chat-bot/chatpopup" />,
});
