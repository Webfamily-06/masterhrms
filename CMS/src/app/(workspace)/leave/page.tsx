'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { Loader2 } from "lucide-react";

export default function LegacyLeaveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) =>
      ["admin", "super_admin", "tenant_admin", "hr_admin", "hr"].includes(r)
    );
    router.replace(isHrOrAdmin ? "/hr/leave/applications" : "/me/leave/applications");
  }, [router]);

  return (
    <div className="py-16 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      Redirecting to Leave Management...
    </div>
  );
}
