import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/system-states/loading-state";

export const Route = createFileRoute("/_authenticated/hr/media")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/hr/files", search: search || {}, replace: true });
  },
  component: HrMediaRedirectPage,
  head: () => ({
    meta: [{ title: "File Manager — HR Management — Master HRMS" }],
  }),
});

export function HrMediaRedirectPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  useEffect(() => {
    navigate({ to: "/hr/files", search: search || {}, replace: true });
  }, [navigate, search]);

  return <LoadingState message="Redirecting to File Manager..." />;
}

export default HrMediaRedirectPage;
