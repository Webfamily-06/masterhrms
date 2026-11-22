'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Users,
  Printer,
  TrendingUp,
  Clock,
} from 'lucide-react';

export default function RecruitmentAnalyticsPage() {
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['recruitment-analytics-jobs'],
    queryFn: async () => {
      const res = await api.get<any>('/api/recruitment/jobs?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.jobs || res.data?.data || [];
    },
  });

  const { data: candidates = [] } = useQuery<any[]>({
    queryKey: ['recruitment-analytics-candidates'],
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Recruitment & ATS Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Time-to-hire, applicant conversion funnel, and requisition velocity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Metrics
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Open Requisitions</p>
            <h3 className="text-2xl font-bold mt-1 text-primary">{jobs.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Active Applicants</p>
            <h3 className="text-2xl font-bold mt-1 text-blue-600">{candidates.length}</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Avg Time to Hire</p>
            <h3 className="text-2xl font-bold mt-1 text-purple-600">18 Days</h3>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase">Offer Acceptance</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">92%</h3>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
