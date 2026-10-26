"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveWorkspaceChatRoute } from "@/lib/auth-navigation";

export default function PersonalChatsPage() {
  const router = useRouter();
  useEffect(() => {
    const target = resolveWorkspaceChatRoute("") || "/super/dashboard";
    router.replace(target);
  }, [router]);
  return null;
}
