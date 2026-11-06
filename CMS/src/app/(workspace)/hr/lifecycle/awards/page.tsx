'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/system-states/loading-state";

export default function HrLifecycleAwardsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/awards");
  }, [router]);

  return <LoadingState message="Redirecting to HR Awards Management..." />;
}