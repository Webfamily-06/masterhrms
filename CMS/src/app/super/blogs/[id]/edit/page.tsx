'use client';

import { useParams } from 'next/navigation';
import { DedicatedBlogEditor } from '@/components/cms/dedicated-blog-editor';

export default function EditBlogPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  return <DedicatedBlogEditor articleId={id} isNew={false} />;
}
