import { createFileRoute } from '@tanstack/react-router';
import ChatGroups from '/src/views/Chat/Groups';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/chat/chat-groups')({
  component: () => <RoutePage component={ChatGroups} path="/apps/chat/chat-groups" />,
});
