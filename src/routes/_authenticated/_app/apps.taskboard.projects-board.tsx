import { createFileRoute } from "@tanstack/react-router";
import { ClassicTaskboardApp } from "@/components/apps/taskboard/classic-taskboard-app";

export const Route = createFileRoute("/_authenticated/_app/apps/taskboard/projects-board")({
  component: ProjectsBoardPage,
  head: () => ({ meta: [{ title: "Projects Board — Master HRMS" }] }),
});

export function ProjectsBoardPage() {
  return <ClassicTaskboardApp initialMode="projects" />;
}

export default ProjectsBoardPage;
