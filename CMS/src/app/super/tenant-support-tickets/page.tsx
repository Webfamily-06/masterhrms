'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function TenantSupportTicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/super/support");
  }, [router]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-xs font-medium">Redirecting to Unified Platform Support Desk...</p>
    </div>
  );
}
