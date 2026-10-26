'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveWorkspaceChatRoute } from '@/lib/auth-navigation';
import { Loader2 } from 'lucide-react';

export default function ChatRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const target = resolveWorkspaceChatRoute('') || '/super/dashboard';
    router.replace(target);
  }, [router]);

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Opening chat...</p>
    </div>
  );
}
