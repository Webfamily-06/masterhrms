import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hr/recruitment/")({
  component: () => <Navigate to="/hr/recruitment/job-postings" />,
});
