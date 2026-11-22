'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';

const STAGES = [
  { id: 'APPLIED', label: 'Applied', color: 'border-blue-500' },
  { id: 'SCREENING', label: 'Screening', color: 'border-amber-500' },
  { id: 'INTERVIEW', label: 'Interviewing', color: 'border-purple-500' },
  { id: 'OFFER', label: 'Offered', color: 'border-emerald-500' },
  { id: 'HIRED', label: 'Hired', color: 'border-teal-500' },
];

export default function CandidatePipelinePage() {
  const { data: candidates = [], isLoading } = useQuery<any[]>({
    queryKey: ['candidate-pipeline-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/recruitment/candidates?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.candidates || res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Candidate Pipeline Kanban</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visual applicant tracking system (ATS) across hiring stages.</p>
        </div>
        <Link href="/recruitment">
          <Button size="sm" className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> New Candidate
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-[500px]">
        {STAGES.map((st) => {
          const inStage = candidates.filter(
            (c) => (c.status || c.stage || 'APPLIED').toUpperCase() === st.id
          );
          return (
            <div key={st.id} className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col min-w-[220px]">
              <div className={`flex items-center justify-between pb-2 border-b-2 ${st.color} mb-3`}>
                <span className="font-bold text-sm">{st.label}</span>
                <Badge variant="secondary">{inStage.length}</Badge>
              </div>

              <div className="space-y-2.5 flex-1">
                {inStage.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center">
                    No candidates
                  </div>
                ) : (
                  inStage.map((c) => (
                    <Card key={c.id} className="p-3 border-border hover:shadow-sm transition-shadow">
                      <div className="font-semibold text-sm">{c.name || `${c.firstName || ''} ${c.lastName || ''}`}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {c.job?.title || c.appliedRole || 'Applicant'}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2 truncate">
                        {c.email}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
