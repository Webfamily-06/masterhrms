'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

export interface CmsPageData {
  id: string;
  slug: string;
  title: string;
  metaDescription?: string | null;
  published: boolean;
  content: Record<string, any>;
  updatedAt?: string;
  createdAt?: string;
}

export function useCmsPage(slug: string) {
  const query = useQuery<CmsPageData | null>({
    queryKey: ['cms-public-page', slug],
    queryFn: async () => {
      try {
        const data = await api.get(`/cms/pages/${slug}`);
        if (!data || typeof data !== 'object') return null;
        return data as CmsPageData;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    page: query.data,
    content: (query.data?.content as Record<string, any>) || {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
