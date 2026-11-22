'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Flag,
  Search,
  Printer,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function MilestonesPage() {
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ['milestones-projects'],
    queryFn: async () => {
      const res = await api.get<any>('/api/projects?limit=50');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));
  }, [projects, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Project Milestones & Deliverables</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Phase gates, release target checkpoints, and critical sprint deliverables.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Milestones
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search project or milestone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Project</TableHead>
                <TableHead>Phase Milestone</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Target Due</TableHead>
                <TableHead className="text-center">Tasks Completed</TableHead>
                <TableHead className="text-center">Phase Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading project milestones...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No milestones recorded.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-primary" />
                        Release Phase v1.0
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Sprint Start'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p._count?.tasks || 0} Deliverables</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {p.status || 'IN_PROGRESS'}
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
