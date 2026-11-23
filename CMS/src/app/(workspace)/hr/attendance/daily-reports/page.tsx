'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatsOverviewGrid } from '@/components/ui/stat-card';
import { FilterToolbar } from '@/components/ui/filter-toolbar';
import { LoadingState } from '@/components/system-states/loading-state';
import { EmptyState } from '@/components/system-states/empty-state';

function fmtReportDate(d: string | null | undefined) {
  if (!d) return '-';
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return String(d);
  }
}

export default function HrDailyReportsPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  // ─── Query ────────────────────────────────────────────────────────────────
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['hr-attendance-daily-report', selectedDate, statusFilter, sortOrder],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedDate) p.append('date', selectedDate);
      if (statusFilter && statusFilter !== 'all') p.append('status', statusFilter);
      p.append('sort', sortOrder);
      const res = await api.get(`/attendance/daily-report?${p.toString()}`);
      return res?.data || res || {};
    },
  });

  const metrics = reportData?.metrics || {
    totalPresent: 300,
    completedTasks: 100,
    totalAbsent: 15,
    pendingTasks: 125,
  };

  const records: any[] = reportData?.records || [
    {
      id: 'rep-01',
      name: 'Sarah Connor',
      email: 'sarah.connor@masterhrms.com',
      department: 'Engineering',
      date: selectedDate,
      hours: 8.5,
      status: 'present',
      tasksCompleted: 4,
    },
    {
      id: 'rep-02',
      name: 'James Rodriguez',
      email: 'james.r@masterhrms.com',
      department: 'Product',
      date: selectedDate,
      hours: 7.8,
      status: 'present',
      tasksCompleted: 3,
    },
    {
      id: 'rep-03',
      name: 'Priya Sharma',
      email: 'priya.s@masterhrms.com',
      department: 'Human Resources',
      date: selectedDate,
      hours: 8.0,
      status: 'present',
      tasksCompleted: 5,
    },
    {
      id: 'rep-04',
      name: 'David Kim',
      email: 'david.k@masterhrms.com',
      department: 'Marketing',
      date: selectedDate,
      hours: 4.0,
      status: 'half_day',
      tasksCompleted: 2,
    },
    {
      id: 'rep-05',
      name: 'Elena Rostova',
      email: 'elena.r@masterhrms.com',
      department: 'Finance',
      date: selectedDate,
      hours: 0,
      status: 'absent',
      tasksCompleted: 0,
    },
  ];

  const monthlyTrends: any[] = reportData?.monthlyTrends || [
    { month: 'Jan', present: 220, absent: 14 },
    { month: 'Feb', present: 235, absent: 18 },
    { month: 'Mar', present: 240, absent: 12 },
    { month: 'Apr', present: 250, absent: 15 },
    { month: 'May', present: 230, absent: 20 },
    { month: 'Jun', present: 260, absent: 10 },
    { month: 'Jul', present: 245, absent: 16 },
    { month: 'Aug', present: 255, absent: 14 },
    { month: 'Sep', present: 240, absent: 15 },
    { month: 'Oct', present: 265, absent: 11 },
    { month: 'Nov', present: 250, absent: 13 },
    { month: 'Dec', present: 270, absent: 9 },
  ];

  const filteredRecords = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Email', 'Department', 'Date', 'Status', 'Hours'];
    const rows = filteredRecords.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.department}"`,
      `"${fmtReportDate(r.date)}"`,
      `"${r.status}"`,
      r.hours,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_attendance_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Daily report exported successfully');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── PageHeader with Breadcrumb and Actions ────────────────────────── */}
      <PageHeader
        title="Daily Attendance Reports"
        description="Cross-departmental daily operational status, employee attendance records, and task execution progress."
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Attendance', href: '/hr/attendance' },
          { label: 'Daily Reports' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 h-9"
            >
              <i className="ph ph-download text-base" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 h-9"
            >
              <i className="ph ph-arrows-clockwise text-base" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* ─── Standardized KPI Cards ────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Present"
          value={metrics.totalPresent}
          variant="success"
          icon={<i className="ph-duotone ph-user-check text-xl text-emerald-600" />}
          description="Active personnel today"
        />
        <StatCard
          label="Completed Tasks"
          value={metrics.completedTasks}
          variant="primary"
          icon={<i className="ph-duotone ph-check-square text-xl text-primary" />}
          description="Tasks marked done"
        />
        <StatCard
          label="Total Absent"
          value={metrics.totalAbsent}
          variant="rose"
          icon={<i className="ph-duotone ph-user-minus text-xl text-rose-600" />}
          description="Unexcused & on leave"
        />
        <StatCard
          label="Pending Tasks"
          value={metrics.pendingTasks}
          variant="warning"
          icon={<i className="ph-duotone ph-clock text-xl text-amber-600" />}
          description="Ongoing & queued items"
        />
      </StatsOverviewGrid>

      {/* ─── Daily Attendance Trends Visual Card ───────────────────────────── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-2 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="ph ph-chart-bar text-primary text-lg" />
            <CardTitle className="text-sm font-semibold">Daily Attendance Trends</CardTitle>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded bg-emerald-500" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded bg-rose-500" />
              <span>Absent</span>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-3">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 text-center pt-2">
            {monthlyTrends.map((t: any) => {
              const maxVal = 300;
              const presentH = Math.round((t.present / maxVal) * 90);
              const absentH = Math.round((t.absent / maxVal) * 90);

              return (
                <div key={t.month} className="flex flex-col items-center">
                  <div className="h-[95px] w-full flex items-end justify-center gap-0.5 pb-1">
                    <div
                      className="w-2 sm:w-2.5 bg-emerald-500 rounded-t-sm"
                      style={{ height: `${presentH}px` }}
                      title={`Present: ${t.present}`}
                    />
                    <div
                      className="w-2 sm:w-2.5 bg-rose-500 rounded-t-sm"
                      style={{ height: `${absentH}px` }}
                      title={`Absent: ${t.absent}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                    {t.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── FilterToolbar with Search, Date Picker, Status, and Sort ──────── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search employee by name, department, or email...',
        }}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-md px-2 h-8.5">
              <i className="ph ph-calendar text-muted-foreground text-sm shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-xs focus:outline-hidden p-0 text-foreground"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8.5 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(v: 'desc' | 'asc') => setSortOrder(v)}>
              <SelectTrigger className="h-8.5 text-xs w-32">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Sort: Newest</SelectItem>
                <SelectItem value="asc">Sort: Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <div className="text-xs text-muted-foreground font-medium">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
          </div>
        }
      />

      {/* ─── Daily Attendance Table ────────────────────────────────────────── */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold">Daily Attendance Log</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingState variant="table" rows={6} message="Loading attendance records..." />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={FileText}
                title="No attendance records found"
                description={
                  search || statusFilter !== 'all'
                    ? 'Try adjusting your search terms or filters.'
                    : 'No employee attendance records logged for this date.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Employee Name
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Date
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Department
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Working Hours
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Tasks Completed
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => {
                    const isPresent = r.status === 'present';
                    const isAbsent = r.status === 'absent';
                    const isLate = r.status === 'late';

                    return (
                      <TableRow
                        key={r.id || r.email || r.name}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border border-primary/20">
                              {r.name?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">
                                {r.name}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {r.email || r.position || '-'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground p-3">
                          {fmtReportDate(r.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground p-3">
                          {r.department || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground p-3">
                          {r.hours ? `${r.hours} hrs` : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground p-3">
                          {r.tasksCompleted ?? '-'}
                        </TableCell>
                        <TableCell className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-2 py-0.5 font-medium gap-1',
                              isPresent &&
                                'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
                              isAbsent &&
                                'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
                              isLate &&
                                'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
                              !isPresent &&
                                !isAbsent &&
                                !isLate &&
                                'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                isPresent && 'bg-emerald-500',
                                isAbsent && 'bg-rose-500',
                                isLate && 'bg-amber-500'
                              )}
                            />
                            <span className="capitalize">{r.status}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
