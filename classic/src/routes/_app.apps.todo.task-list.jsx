import { createFileRoute } from '@tanstack/react-router';
import TaskList from '/src/views/Todo/Tasklist';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/todo/task-list')({
  component: () => <RoutePage component={TaskList} path="/apps/todo/task-list" />,
});
