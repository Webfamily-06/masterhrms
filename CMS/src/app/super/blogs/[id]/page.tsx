'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DedicatedBlogEditor } from '@/components/cms/dedicated-blog-editor';

export default function BlogIdPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  return <DedicatedBlogEditor articleId={id} isNew={false} />;
}
