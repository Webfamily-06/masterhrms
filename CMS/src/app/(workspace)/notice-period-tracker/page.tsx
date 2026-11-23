'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NoticePeriodTrackerLegacyRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    router.replace(`/hr/lifecycle/notice-period${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Redirecting to Notice Period Tracker (/hr/lifecycle/notice-period)...</p>
    </div>
  );
}
