'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DynamicRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    let slug = '';
    if (params && params.slug) {
      slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;
    }
    const target = slug ? `/tenant/${slug}` : '/tenant/dashboard';
    router.replace(target);
  }, [router, params]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
