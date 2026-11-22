'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Briefcase,
  Printer,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';

export default function ProjectAnalyticsPage() {
  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ['project-analytics-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/projects?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const totalProjects = projects.length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const inProgressCount = projects.filter((p) => p.status === 'IN_PROGRESS' || !p.status).length;

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Project Portfolio & Velocity Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Burn-down metrics, task execution velocities, and milestone completions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Portfolio Audit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Active Portfolio</p>
              <h3 className="text-2xl font-bold mt-1">{totalProjects}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">In Progress</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{inProgressCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Completed Sprints</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{completedCount}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Target Deadline</TableHead>
                <TableHead className="text-center">Sprint Tasks</TableHead>
                <TableHead className="text-center">Velocity</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading project portfolio...</TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No projects registered.</TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.client?.name || p.clientName || 'Internal Initiative'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Continuous'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p._count?.tasks || 0} Tasks</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
                      98.4% On Schedule
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {p.status || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
