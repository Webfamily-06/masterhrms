'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MeetingHubRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hr/meetings");
  }, [router]);
  return null;
}
