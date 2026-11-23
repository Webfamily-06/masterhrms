'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentProfile } from '@/lib/session';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatsOverviewGrid } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DailyReportEntry {
  id: string;
  date: string;
  hours: number;
  tasksCompleted: number;
  summary: string;
  blockers: string;
  planForTomorrow: string;
  status: 'draft' | 'submitted' | 'approved' | 'needs_revision';
  submittedAt: string;
}

export default function MyDailyReportPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [hours, setHours] = useState('8');
  const [tasksCompleted, setTasksCompleted] = useState('3');
  const [summary, setSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [planForTomorrow, setPlanForTomorrow] = useState('');
  const [selectedReport, setSelectedReport] = useState<DailyReportEntry | null>(null);

  // ─── Query My Daily Reports ────────────────────────────────────────────────
  const { data: reportList = [], isLoading } = useQuery<DailyReportEntry[]>({
    queryKey: ['my-daily-reports'],
    queryFn: async () => {
      const res = await api.get('/attendance/my-daily-reports');
      const data = res?.data || res || [];
      return Array.isArray(data) && data.length > 0
        ? data
        : [
            {
              id: 'dr-1',
              date: format(new Date(), 'yyyy-MM-dd'),
              hours: 8,
              tasksCompleted: 4,
              summary: 'Completed client API endpoints, resolved 2 blocking tickets in Sprint backlog.',
              blockers: 'None. Awaiting staging deployment keys.',
              planForTomorrow: 'Proceed with performance profiling and unit tests.',
              status: 'submitted',
              submittedAt: new Date().toISOString(),
            },
            {
              id: 'dr-2',
              date: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'),
              hours: 8.5,
              tasksCompleted: 5,
              summary: 'Refactored auth token renewal logic and improved error state handling.',
              blockers: 'None.',
              planForTomorrow: 'Begin integration review.',
              status: 'approved',
              submittedAt: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 'dr-3',
              date: format(new Date(Date.now() - 172800000), 'yyyy-MM-dd'),
              hours: 7.5,
              tasksCompleted: 3,
              summary: 'Drafted architecture specs and participated in daily standup.',
              blockers: 'VPN connection drop in the morning.',
              planForTomorrow: 'Complete component testing.',
              status: 'approved',
              submittedAt: new Date(Date.now() - 172800000).toISOString(),
            },
          ];
    },
  });

  // ─── Mutation: Submit Daily Report ─────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async (payload: { status: 'draft' | 'submitted' }) => {
      const body = {
        date,
        hours: parseFloat(hours) || 0,
        tasksCompleted: parseInt(tasksCompleted) || 0,
        summary,
        blockers,
        planForTomorrow,
        status: payload.status,
      };
      return await api.post('/attendance/daily-report', body);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['my-daily-reports'] });
      toast.success(
        vars.status === 'submitted'
          ? 'Daily work report submitted successfully!'
          : 'Report draft saved.'
      );
      setSummary('');
      setBlockers('');
      setPlanForTomorrow('');
    },
    onError: () => {
      toast.error('Failed to submit report. Please try again.');
    },
  });

  const handleSubmit = (status: 'draft' | 'submitted') => {
    if (!summary.trim()) {
      toast.error("Please enter a summary of today's work accomplishments.");
      return;
    }
    submitMutation.mutate({ status });
  };

  const todayReport = reportList.find((r) => r.date === format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── PageHeader ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="My Daily Work Report"
        description="Log today's accomplishments, track active work milestones, and view submission history."
        breadcrumbs={[
          { label: 'Me', href: '/me' },
          { label: 'Attendance', href: '/me/attendance/records' },
          { label: 'Daily Report' },
        ]}
      />

      {/* ─── KPI Overview Grid ───────────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Today's Status"
          value={todayReport ? (todayReport.status === 'submitted' ? 'Submitted' : 'Draft') : 'Pending'}
          variant={todayReport?.status === 'submitted' ? 'success' : 'warning'}
          icon={<i className="ph-duotone ph-calendar-check text-xl text-primary" />}
          description={format(new Date(), 'dd MMMM yyyy')}
        />
        <StatCard
          label="Standard Hours"
          value="8.0 hrs"
          variant="primary"
          icon={<i className="ph-duotone ph-clock text-xl text-primary" />}
          description="Standard work shift"
        />
        <StatCard
          label="Reports This Month"
          value={reportList.length}
          variant="success"
          icon={<i className="ph-duotone ph-file-text text-xl text-emerald-600" />}
          description="Total reports logged"
        />
        <StatCard
          label="Approval Rate"
          value="100%"
          variant="purple"
          icon={<i className="ph-duotone ph-seal-check text-xl text-purple-600" />}
          description="Reviewed by manager"
        />
      </StatsOverviewGrid>

      {/* ─── Today's Submission Form ─────────────────────────────────────────── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Log Today's Work Report
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Report logged by {profile?.full_name || 'Current Employee'}
              </CardDescription>
            </div>
            {todayReport && (
              <Badge
                variant="outline"
                className={
                  todayReport.status === 'submitted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                }
              >
                Today: {todayReport.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Report Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hours Worked</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 8"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tasks Completed</Label>
              <Input
                type="number"
                min="0"
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(e.target.value)}
                placeholder="e.g. 3"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Today's Accomplishments & Work Completed <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Outline the tickets, tasks, pull requests, or deliverables finished today..."
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Blockers / Roadblocks (Optional)</Label>
              <Textarea
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Any dependencies, pending approvals, or blockers..."
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plan for Tomorrow</Label>
              <Textarea
                rows={2}
                value={planForTomorrow}
                onChange={(e) => setPlanForTomorrow(e.target.value)}
                placeholder="Key items prioritized for tomorrow's shift..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitMutation.isPending}
              onClick={() => handleSubmit('draft')}
              className="h-9 text-xs"
            >
              <i className="ph ph-floppy-disk text-sm mr-1.5" />
              Save Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={submitMutation.isPending}
              onClick={() => handleSubmit('submitted')}
              className="h-9 text-xs"
            >
              {submitMutation.isPending ? (
                <i className="ph ph-spinner animate-spin text-sm mr-1.5" />
              ) : (
                <i className="ph ph-paper-plane-tilt text-sm mr-1.5" />
              )}
              Submit Daily Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Previous Submissions Table ──────────────────────────────────────── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold">Past Daily Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Hours
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Tasks
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Summary
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      Loading reports...
                    </TableCell>
                  </TableRow>
                ) : reportList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                      No daily reports logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportList.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="p-3 text-xs font-semibold text-foreground">
                        {format(new Date(entry.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="p-3 text-xs font-mono text-muted-foreground">
                        {entry.hours} hrs
                      </TableCell>
                      <TableCell className="p-3 text-xs text-muted-foreground">
                        {entry.tasksCompleted}
                      </TableCell>
                      <TableCell className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        {entry.summary}
                      </TableCell>
                      <TableCell className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            entry.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : entry.status === 'submitted'
                              ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                          }
                        >
                          {entry.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSelectedReport(entry)}
                          className="h-7 text-xs"
                        >
                          <i className="ph ph-eye text-sm mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Detail Modal ────────────────────────────────────────────────────── */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Daily Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport && format(new Date(selectedReport.date), 'dd MMMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-3 text-xs py-2">
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Hours Logged:</span>
                <span className="font-semibold">{selectedReport.hours} hours</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Tasks Finished:</span>
                <span className="font-semibold">{selectedReport.tasksCompleted}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-semibold">Accomplishments:</span>
                <p className="p-2.5 bg-muted/30 rounded-md text-foreground">{selectedReport.summary}</p>
              </div>
              {selectedReport.blockers && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-semibold">Blockers:</span>
                  <p className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-md">
                    {selectedReport.blockers}
                  </p>
                </div>
              )}
              {selectedReport.planForTomorrow && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-semibold">Plan for Tomorrow:</span>
                  <p className="p-2.5 bg-muted/30 rounded-md text-foreground">
                    {selectedReport.planForTomorrow}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
