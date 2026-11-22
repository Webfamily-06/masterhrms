'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  FileText,
  Printer,
  Plus,
} from 'lucide-react';

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('');

  const { data: articles = [], isLoading } = useQuery<any[]>({
    queryKey: ['knowledge-base-articles'],
    queryFn: async () => {
      const res = await api.get<any>('/api/knowledge-base/articles');
      return Array.isArray(res.data) ? res.data : res.data?.articles || res.data?.data || [];
    },
  });

  const filtered = articles.filter(
    (a) => a.title?.toLowerCase().includes(search.toLowerCase()) || a.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Knowledge Base & SOP Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Company standard operating procedures, manuals, and internal documentation.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Search procedures, policies, guides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Loading articles...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No knowledge base articles published yet.</div>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} className="p-4 border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <Badge variant="secondary" className="text-[10px]">{a.category?.name || 'General SOP'}</Badge>
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{a.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{a.content || a.summary || 'Comprehensive organizational procedure document.'}</p>
              <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border flex justify-between">
                <span>Updated {new Date(a.updatedAt || a.createdAt).toLocaleDateString()}</span>
                <span className="font-medium text-primary cursor-pointer hover:underline">Read SOP →</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
