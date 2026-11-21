'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AddonsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tenant/addon");
  }, [router]);

  return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <Loader2 className="size-8 animate-spin text-emerald-600" />
      <p className="text-xs text-muted-foreground font-mono">Redirecting to /tenant/addon...</p>
    </div>
  );
}
