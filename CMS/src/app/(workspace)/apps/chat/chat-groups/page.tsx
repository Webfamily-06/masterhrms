"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveWorkspaceChatRoute } from "@/lib/auth-navigation";

export default function ChatGroupsPage() {
  const router = useRouter();
  useEffect(() => {
    const target = resolveWorkspaceChatRoute("/groups") || "/super/dashboard";
    router.replace(target);
  }, [router]);
  return null;
}
