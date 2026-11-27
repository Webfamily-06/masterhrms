'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RequestManagementRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workflow-requests");
  }, [router]);
  return null;
}
