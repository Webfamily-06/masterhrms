import { createFileRoute, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/system-states/loading-state";

export const Route = createFileRoute("/_authenticated/me/media")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/me/files", search: search || {}, replace: true });
  },
  component: MeMediaRedirectPage,
  head: () => ({
    meta: [{ title: "File Manager — Employee Portal — Master HRMS" }],
  }),
});

export function MeMediaRedirectPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  useEffect(() => {
    navigate({ to: "/me/files", search: search || {}, replace: true });
  }, [navigate, search]);

  return <LoadingState message="Redirecting to File Manager..." />;
}

export default MeMediaRedirectPage;
