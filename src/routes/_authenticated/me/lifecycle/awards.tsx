import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/system-states/loading-state";

export const Route = createFileRoute("/_authenticated/me/lifecycle/awards")({
  component: MeLifecycleAwardsRedirect,
});

export default function MeLifecycleAwardsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/me/awards", replace: true });
  }, [navigate]);

  return <LoadingState message="Redirecting to My Awards..." />;
}