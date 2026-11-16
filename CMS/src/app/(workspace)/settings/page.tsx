'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Settings, ArrowRight } from "lucide-react";

export default function WorkspaceSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr/settings");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center p-6 space-y-4 shadow-sm border">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Settings className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Redirecting to Settings...</h2>
          <p className="text-sm text-muted-foreground">
            Navigating to the authoritative Organization & System Settings dashboard.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/hr/settings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Click here if you are not redirected automatically <ArrowRight className="size-4" />
          </a>
        </div>
      </Card>
    </div>
  );
}
