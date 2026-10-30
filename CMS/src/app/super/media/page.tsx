'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SuperMediaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/super/files');
  }, [router]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Redirecting to Platform File Manager...</p>
    </div>
  );
}
