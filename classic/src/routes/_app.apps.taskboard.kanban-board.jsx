import { createFileRoute } from '@tanstack/react-router';
import KanbanBoard from '/src/views/Scrumboard/KanbanBoard/Index';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/taskboard/kanban-board')({
  component: () => <RoutePage component={KanbanBoard} path="/apps/taskboard/kanban-board" />,
});
