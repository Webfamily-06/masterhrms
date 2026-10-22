import { createFileRoute } from '@tanstack/react-router';
import ChatBot from '/src/views/ChatPopup/ChatBot';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/chat-bot/chatbot')({
  component: () => <RoutePage component={ChatBot} path="/apps/chat-bot/chatbot" />,
});
