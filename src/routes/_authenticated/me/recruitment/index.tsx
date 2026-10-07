import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/me/recruitment/")({
  component: () => <Navigate to="/me/recruitment/job-postings" />,
});
