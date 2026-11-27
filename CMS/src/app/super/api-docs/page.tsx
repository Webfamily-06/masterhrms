'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SuperApiDocsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/super/developer");
  }, [router]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[45vh] gap-2.5 text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-primary" />
      <p className="text-xs font-medium">Redirecting to consolidated Developer Portal...</p>
    </div>
  );
}
