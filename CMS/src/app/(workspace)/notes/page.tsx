'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentProfile } from '@/lib/session';
import { Loader2 } from 'lucide-react';

export default function NotesLegacyRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile, isLoading } = useCurrentProfile();

  useEffect(() => {
    if (isLoading) return;
    const userRoles = profile?.roles || [];
    const isHrOrAdmin = userRoles.some((r) =>
      ['admin', 'super_admin', 'tenant_admin', 'hr_admin'].includes(r)
    );
    const target = isHrOrAdmin ? '/apps/notes' : '/me/notes';
    const qs = searchParams?.toString();
    router.replace(`${target}${qs ? `?${qs}` : ''}`);
  }, [router, searchParams, profile, isLoading]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Redirecting to Notes & Scratchpad...</p>
    </div>
  );
}
