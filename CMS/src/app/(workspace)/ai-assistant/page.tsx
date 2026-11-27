'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiAssistantRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/addons/ai-assistant/settings");
  }, [router]);
  return null;
}
