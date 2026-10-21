'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractRolesFromToken } from '@/lib/auth-navigation';
import { Loader2 } from 'lucide-react';

export default function ChatRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hrms_auth_token') : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) => ['admin', 'super_admin', 'tenant_admin', 'hr_admin', 'hr'].includes(r));
    router.replace(isHrOrAdmin ? '/hr/chat' : '/me/chat');
  }, [router]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Opening chat...</p>
    </div>
  );
}
