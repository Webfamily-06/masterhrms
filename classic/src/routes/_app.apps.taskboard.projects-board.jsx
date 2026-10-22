import { createFileRoute } from '@tanstack/react-router';
import ProjectsBoard from '/src/views/Scrumboard/ProjectsBoard';
import { RoutePage } from '/src/utils/file-route-page.jsx';

export const Route = createFileRoute('/_app/apps/taskboard/projects-board')({
  component: () => <RoutePage component={ProjectsBoard} path="/apps/taskboard/projects-board" />,
});
