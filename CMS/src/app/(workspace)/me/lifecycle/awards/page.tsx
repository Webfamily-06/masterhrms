'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/system-states/loading-state";

export default function MeLifecycleAwardsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/me/awards");
  }, [router]);

  return <LoadingState message="Redirecting to My Awards..." />;
}