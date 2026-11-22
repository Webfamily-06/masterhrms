'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  Calendar,
  Clock,
  Video,
  Printer,
  Users,
} from 'lucide-react';

export default function InterviewSchedulerPage() {
  const { data: candidates = [], isLoading } = useQuery<any[]>({
    queryKey: ['scheduled-interviews'],
    queryFn: async () => {
      const res = await api.get<any>('/api/recruitment/candidates?limit=50');
      const all = Array.isArray(res.data) ? res.data : res.data?.candidates || res.data?.data || [];
      return all.filter((c: any) => c.status === 'INTERVIEW' || c.stage === 'INTERVIEW');
    },
  });

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Interview Scheduler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Coordinate candidate video evaluations, panel interviews, and feedback scores.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Daily Schedule
        </Button>
      </div>

      <Card className="border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Candidate</TableHead>
                <TableHead>Target Position</TableHead>
                <TableHead>Interview Slot</TableHead>
                <TableHead>Meeting Link</TableHead>
                <TableHead className="text-center">Round</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading interview schedule...</TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No interviews scheduled today.</TableCell>
                </TableRow>
              ) : (
                candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name || `${c.firstName || ''} ${c.lastName || ''}`}</TableCell>
                    <TableCell>{c.job?.title || 'Senior Engineer'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground flex items-center gap-1.5 pt-4">
                      <Clock className="w-3.5 h-3.5" /> 2:30 PM - 3:15 PM
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-primary">
                        <Video className="w-3.5 h-3.5" /> Join Meet
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">Technical Round 1</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">SCHEDULED</Badge>
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
