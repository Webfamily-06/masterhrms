'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractRolesFromToken, resolveDefaultRoute } from '@/lib/auth-navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hrms_auth_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    const { roles } = extractRolesFromToken(token);
    const target = resolveDefaultRoute(roles || []);
    router.replace(target || '/hrm-dashboard');
  }, [router]);

  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium">Resolving your dashboard...</p>
    </div>
  );
}
