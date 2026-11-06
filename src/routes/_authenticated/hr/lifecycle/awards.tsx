import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingState } from "@/components/system-states/loading-state";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/awards")({
  component: HrLifecycleAwardsRedirect,
});

export default function HrLifecycleAwardsRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/hr/awards", replace: true });
  }, [navigate]);

  return <LoadingState message="Redirecting to HR Awards Management..." />;
}