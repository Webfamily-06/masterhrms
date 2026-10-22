'use client';

import { useParams } from 'next/navigation';
import { DedicatedPageEditor } from '@/components/cms/dedicated-page-editor';

export default function EditCmsPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  return <DedicatedPageEditor pageId={id} isNew={false} />;
}
