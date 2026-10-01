// pages/hr/time-entries/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, FileDown, FileUp, LayoutGrid, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Eye, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { ImportModal } from '@/components/ImportModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInitials } from '@/hooks/use-initials';
import {
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import View from './view';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

export default function TimeEntries() {
  const { t } = useTranslation();
  const { auth, timeEntries, employees, filters: pageFilters = {}, hasSampleFile, globalSettings, statusCounts = {}, workingDays = [1,2,3,4,5] } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [dayEntriesModal, setDayEntriesModal] = useState<{ isOpen: boolean; employeeId?: string; dateKey?: string; date?: Date; employeeName?: string }>({ isOpen: false });

  const today = new Date();

  // Helper: format a Date as YYYY-MM-DD for URL params
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Returns the Monday of the week containing the given date
  const getMondayOf = (d: Date): Date => {
    const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Restore weekStart from URL if present, otherwise default to current week's Monday
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (pageFilters.week_start) {
      const d = new Date(pageFilters.week_start);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return getMondayOf(today);
  });

  // currentMonth is derived from weekStart — use Thursday of the week as pivot
  // (Thursday always belongs to the dominant month of the week, same as ISO week logic)
  const currentMonth = useMemo(() => {
    const thursday = new Date(weekStart);
    thursday.setDate(weekStart.getDate() + 3);
    return thursday;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Navigate to a new week — fires a server request so the controller fetches that week's data
  const navigateToWeek = (newWeekStart: Date) => {
    const newWeekEnd = new Date(newWeekStart);
    newWeekEnd.setDate(newWeekStart.getDate() + 6);
    setWeekStart(newWeekStart);
    router.get(route('hr.time-entries.index'), {
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      week_start: formatDate(newWeekStart),
      week_end: formatDate(newWeekEnd),
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePrevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7);
    navigateToWeek(d);
  };
  const handleNextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7);
    navigateToWeek(d);
  };

  const handlePrevMonth = () => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    navigateToWeek(getMondayOf(d));
  };
  const handleNextMonth = () => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    navigateToWeek(getMondayOf(d));
  };

  // JS getDay(): 0=Sun,1=Mon,...,6=Sat — workingDays from backend uses same convention
  const isNonWorkingDay = (d: Date) => !workingDays.includes(d.getDay());

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const formatDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const entriesByEmpDate = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    (timeEntries || []).forEach((entry: any) => {
      const empId = entry.employee_id?.toString() || entry.employee?.id?.toString();
      if (!empId) return;
      const dateKey = entry.date?.slice(0, 10);
      if (!dateKey) return;
      if (!map[empId]) map[empId] = {};
      if (!map[empId][dateKey]) map[empId][dateKey] = [];
      map[empId][dateKey].push(entry);
    });
    return map;
  }, [timeEntries]);

  const hasActiveFilters = () =>
    searchTerm !== '' || selectedEmployee !== '_empty_' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined;

  const activeFilterCount = () =>
    (searchTerm ? 1 : 0) + (selectedEmployee !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const applyFilters = () => {
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    router.get(route('hr.time-entries.index'), {
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      week_start: formatDate(weekStart),
      week_end: formatDate(weekEnd),
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => router.get(route('hr.time-entries.index'));

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    switch (action) {
      case 'view': setViewingItem(item); break;
      case 'edit': setFormMode('edit'); setIsFormModalOpen(true); break;
      case 'delete': setIsDeleteModalOpen(true); break;
      case 'approve': handleStatusUpdate(item, 'approved'); break;
      case 'reject': handleStatusUpdate(item, 'rejected'); break;
    }
  };

  const handleAddNew = () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating timesheet...'));
      router.post(route('hr.time-entries.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          typeof errors === 'string' ? toast.error(errors) : toast.error(`Failed to create timesheet: ${Object.values(errors).join(', ')}`);
        }
      });
    } else {
      if (!globalSettings?.is_demo) toast.loading(t('Updating timesheet...'));
      router.put(route('hr.time-entries.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          typeof errors === 'string' ? toast.error(errors) : toast.error(`Failed to update timesheet: ${Object.values(errors).join(', ')}`);
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting timesheet...'));
    router.delete(route('hr.time-entries.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        typeof errors === 'string' ? toast.error(errors) : toast.error(`Failed to delete timesheet: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const handleStatusUpdate = (timeEntry: any, status: string) => {
    const statusText = status === 'approved' ? t('Approving') : t('Rejecting');
    if (!globalSettings?.is_demo) toast.loading(`${statusText} timesheet...`);
    router.put(route('hr.time-entries.update-status', timeEntry.id), { status, manager_comments: '' }, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        typeof errors === 'string' ? toast.error(errors) : toast.error(`Failed to update timesheet status: ${Object.values(errors).join(', ')}`);
      }
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.time-entries.export'), { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!response.ok) { const data = await response.json().catch(() => ({})); toast.error(t(data.message || 'Failed to export time entries')); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `time_entries_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { toast.error(t('Failed to export time entries')); }
  };

  const pageActions: any[] = [];
  if (hasPermission(permissions, 'export-time-entry')) pageActions.push({ label: t('Export'), icon: <FileDown className="h-4 w-4 mr-2" />, variant: 'outline', onClick: handleExport });
  if (hasPermission(permissions, 'import-time-entry')) pageActions.push({ label: t('Import'), icon: <FileUp className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => setIsImportModalOpen(true) });
  if (hasPermission(permissions, 'create-time-entries')) pageActions.push({ label: t('Add Timesheet'), icon: <Plus className="h-4 w-4 mr-2" />, variant: 'default', onClick: handleAddNew });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Attendance') },
    { title: t('Timesheet') }
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({ value: emp.id.toString(), label: emp.name }))
  ];

  const statusTabs = [
    { value: '_empty_',  label: t('All'),      icon: <LayoutGrid className="h-4 w-4" />,   count: statusCounts.all      ?? 0 },
    { value: 'pending',  label: t('Pending'),  icon: <Clock className="h-4 w-4" />,        count: statusCounts.pending  ?? 0 },
    { value: 'approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.approved ?? 0 },
    { value: 'rejected', label: t('Rejected'), icon: <XCircle className="h-4 w-4" />,      count: statusCounts.rejected ?? 0 },
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedEmployee, selectedStatus, dateFrom, dateTo]);

  const getInitials = useInitials();

  const statusBadgeClass = (status: string) => {
    if (status === 'approved') return 'bg-green-50 text-green-700 ring-green-600/20';
    if (status === 'rejected') return 'bg-red-50 text-red-700 ring-red-600/20';
    return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
  };

  // When a filter is active, only show employees who have entries in the current view.
  // Otherwise show all employees from the prop (same approach as old file).
  const employeeMap = useMemo(() => {
    const map: Record<string, any> = {};
    (employees || []).forEach((emp: any) => { map[emp.id.toString()] = emp; });
    return map;
  }, [employees]);

  const allEmployees = useMemo(() => {
    const hasFilter = searchTerm !== '' || selectedEmployee !== '_empty_' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined;
    if (!hasFilter) return employees || [];
    // If a specific employee is selected, show only that employee (even with no entries)
    if (selectedEmployee !== '_empty_' && employeeMap[selectedEmployee]) {
      return [employeeMap[selectedEmployee]];
    }
    // For other filters (search/status/date), derive from returned time entries
    const seen = new Set<string>();
    const filtered: any[] = [];
    (timeEntries || []).forEach((entry: any) => {
      const empId = (entry.employee_id || entry.employee?.id)?.toString();
      if (empId && !seen.has(empId)) {
        seen.add(empId);
        filtered.push(employeeMap[empId] || {
          id: entry.employee_id || entry.employee?.id,
          name: entry.employee?.name,
          avatar: entry.employee?.avatar,
          designation: '',
        });
      }
    });
    return filtered;
  }, [employees, employeeMap, timeEntries, searchTerm, selectedEmployee, selectedStatus, dateFrom, dateTo]);

return (
    <PageTemplate
      title={t('Timesheet')}
      description={t('Track and manage time sheets and work hours.')}
      url="/hr/time-entries"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search + Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions
            },
            // {
            //   name: 'date_from',
            //   label: t('Date From'),
            //   type: 'date',
            //   value: dateFrom,
            //   onChange: (date) => setDateFrom(date)
            // },
            // {
            //   name: 'date_to',
            //   label: t('Date To'),
            //   type: 'date',
            //   value: dateTo,
            //   onChange: (date) => setDateTo(date)
            // }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Month Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border px-4 py-3 flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Timesheet Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border mb-4" style={{ maxHeight: '520px', overflowX: 'auto', overflowY: 'auto' }}>
          <table className="table-fixed w-full caption-bottom text-sm text-foreground dark:bg-gray-900">
            <TableHeader className="sticky top-0 z-30 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gray-300 dark:after:bg-gray-600">
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead style={{ width: '160px', minWidth: '160px' }} className="lg:sticky lg:left-0 lg:z-30 bg-gray-50 dark:bg-gray-800 border-r-1 border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                  {t('Employee')}
                </TableHead>
                {weekDays.map((day, i) => (
                  <TableHead
                    key={i}
                    className={`text-center px-2 py-3 min-w-[80px] w-[80px] lg:min-w-[100px] lg:w-[100px] font-medium border-r border-gray-300 dark:border-gray-600 ${
                      isToday(day)
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : isNonWorkingDay(day)
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100/60 dark:bg-gray-700/40'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {i === 0 ? (
                      <div className="relative flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handlePrevWeek}
                          className="absolute left-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-5 w-5 text-gray-800 dark:text-gray-800" />
                        </button>
                        <div>
                          <div className="text-xs font-semibold tracking-wide">{DAY_NAMES[day.getDay()]}</div>
                          <div className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>{String(day.getDate()).padStart(2, '0')}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{day.toLocaleDateString(undefined, { month: 'short' })}</div>
                        </div>
                      </div>
                    ) : i === 6 ? (
                      <div className="relative flex items-center justify-center">
                        <div>
                          <div className="text-xs font-semibold tracking-wide">{DAY_NAMES[day.getDay()]}</div>
                          <div className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>{String(day.getDate()).padStart(2, '0')}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{day.toLocaleDateString(undefined, { month: 'short' })}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleNextWeek}
                          className="absolute right-0 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="h-5 w-5 text-gray-800 dark:text-gray-800" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-semibold tracking-wide">{DAY_NAMES[day.getDay()]}</div>
                        <div className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>{String(day.getDate()).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{day.toLocaleDateString(undefined, { month: 'short' })}</div>
                      </>
                    )}
                  </TableHead>
                ))}
                <TableHead className="lg:sticky lg:right-0 lg:z-30 bg-gray-50 dark:bg-gray-800 min-w-[70px] w-[70px] border-l-1 border-gray-300 dark:border-gray-600 text-center px-2 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  {t('Total')}
                </TableHead>
              </TableRow>
            </TableHeader>

            <tbody className="[&_tr:last-child]:border-0">
              {allEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    {t('No employees found.')}
                  </TableCell>
                </TableRow>
              ) : (
                allEmployees.map((emp: any, idx: number) => {
                  const empId = emp?.id?.toString();
                  const empEntries = entriesByEmpDate[empId] || {};
                  let weekTotal = 0;

                  return (
                    <TableRow
                      key={empId || idx}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        idx % 2 !== 0 ? 'bg-gray-50 dark:bg-gray-800/20' : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      {/* Employee info — sticky left */}
                      <TableCell style={{ width: '100px', minWidth: '100px' }} className="lg:sticky lg:left-0 lg:z-10 bg-white dark:bg-gray-900 px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm overflow-hidden shrink-0">
                            {emp?.avatar
                              ? <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover rounded-full" />
                              : getInitials(emp?.name || '')
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{emp?.name || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp?.designation || ''}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Day cells */}
                      {weekDays.map((day, di) => {
                        const dateKey = formatDateKey(day);
                        const dayEntries = empEntries[dateKey] || [];
                        const dayHours = dayEntries.reduce((sum: number, e: any) => sum + (parseFloat(e.hours) || 0), 0);
                        weekTotal += dayHours;
                        const isWeekend = isNonWorkingDay(day);
                        const isTodayCell = isToday(day);

                        return (
                          <TableCell
                            key={di}
                            className={`group relative text-center px-1 py-2 min-w-[80px] w-[80px] lg:min-w-[100px] lg:w-[100px] border-r border-gray-200 dark:border-gray-700 ${
                              isTodayCell ? 'bg-primary/5 dark:bg-primary/10' : isWeekend ? 'bg-gray-50 dark:bg-gray-800/30' : idx % 2 !== 0 ? 'bg-gray-50 dark:bg-gray-800/20' : 'bg-white dark:bg-gray-900'
                            }`}
                          >
                            {dayHours > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{dayHours}h</span>
                                {dayEntries.length > 1 && (
                                  <span className="text-xs text-gray-400">{dayEntries.length} {t('entries')}</span>
                                )}
                                {dayEntries[0]?.status && (
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(dayEntries[0].status)}`}
                                  >
                                    {dayEntries[0].status.charAt(0).toUpperCase() + dayEntries[0].status.slice(1)}
                                  </span>
                                )}
                                {/* Action buttons — absolute overlay, no layout impact */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/90 dark:bg-gray-900/90 rounded">
                                  {dayEntries.length > 1 ? (
                                      <Button size="sm" variant="outline" className="h-7 text-xs bg-white dark:bg-gray-800" onClick={() => setDayEntriesModal({ isOpen: true, employeeId: empId, dateKey: dateKey, date: day, employeeName: emp?.name })}>
                                        {t('View All')} ({dayEntries.length})
                                      </Button>
                                  ) : (
                                    <>
                                      {/* lg and above: icon row */}
                                      <div className="hidden lg:flex items-center gap-0.5">
                                        {hasPermission(permissions, 'view-time-entries') && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" onClick={() => handleAction('view', dayEntries[0])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                                <Eye className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('View')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                        {hasPermission(permissions, 'edit-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" onClick={() => handleAction('edit', dayEntries[0])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                                <Edit className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Edit')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                        {hasPermission(permissions, 'approve-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" onClick={() => handleAction('approve', dayEntries[0])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Approve')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                        {hasPermission(permissions, 'reject-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" onClick={() => handleAction('reject', dayEntries[0])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                                <XCircle className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Reject')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                        {hasPermission(permissions, 'delete-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button type="button" onClick={() => handleAction('delete', dayEntries[0])} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Delete')}</TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                      {/* below lg: 2-column compact grid */}
                                      <div className="flex lg:hidden flex-wrap justify-center gap-0.5 p-0.5">
                                        {hasPermission(permissions, 'view-time-entries') && (
                                          <button type="button" onClick={() => handleAction('view', dayEntries[0])} title={t('View')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                            <Eye className="h-3 w-3" />
                                          </button>
                                        )}
                                        {hasPermission(permissions, 'edit-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <button type="button" onClick={() => handleAction('edit', dayEntries[0])} title={t('Edit')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        )}
                                        {hasPermission(permissions, 'approve-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <button type="button" onClick={() => handleAction('approve', dayEntries[0])} title={t('Approve')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                            <CheckCircle className="h-3 w-3" />
                                          </button>
                                        )}
                                        {hasPermission(permissions, 'reject-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <button type="button" onClick={() => handleAction('reject', dayEntries[0])} title={t('Reject')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                            <XCircle className="h-3 w-3" />
                                          </button>
                                        )}
                                        {hasPermission(permissions, 'delete-time-entries') && dayEntries[0]?.status === 'pending' && (
                                          <button type="button" onClick={() => handleAction('delete', dayEntries[0])} title={t('Delete')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 cursor-pointer">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* Weekly total — sticky right */}
                      <TableCell className="lg:sticky lg:right-0 lg:z-10 bg-white dark:bg-gray-900 text-center px-2 py-3 border-l-1 border-gray-300 dark:border-gray-600 min-w-[70px] w-[70px]">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {weekTotal > 0 ? `${weekTotal}h` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      {/* Day Entries Modal */}
      <Dialog open={dayEntriesModal.isOpen} onOpenChange={(open) => !open && setDayEntriesModal(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dayEntriesModal.employeeName} - {dayEntriesModal.date?.toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4">
            {((dayEntriesModal.employeeId && dayEntriesModal.dateKey) ? (entriesByEmpDate[dayEntriesModal.employeeId]?.[dayEntriesModal.dateKey] || []) : []).map((entry, idx) => (
               <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                       <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">{entry.hours}h</span>
                       {entry.status && (
                         <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusBadgeClass(entry.status)}`}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                         </span>
                       )}
                    </div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 truncate">{entry.project || t('No Project')}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words line-clamp-2" title={entry.description}>{entry.description || '-'}</div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-gray-800 p-1 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
                     {hasPermission(permissions, 'view-time-entries') && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleAction('view', entry)} className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <Eye className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('View')}</TooltipContent>
                        </Tooltip>
                     )}
                     {hasPermission(permissions, 'edit-time-entries') && entry.status === 'pending' && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleAction('edit', entry)} className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <Edit className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('Edit')}</TooltipContent>
                        </Tooltip>
                     )}
                     {hasPermission(permissions, 'approve-time-entries') && entry.status === 'pending' && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleAction('approve', entry)} className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('Approve')}</TooltipContent>
                        </Tooltip>
                     )}
                     {hasPermission(permissions, 'reject-time-entries') && entry.status === 'pending' && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleAction('reject', entry)} className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <XCircle className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('Reject')}</TooltipContent>
                        </Tooltip>
                     )}
                     {hasPermission(permissions, 'delete-time-entries') && entry.status === 'pending' && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleAction('delete', entry)} className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{t('Delete')}</TooltipContent>
                        </Tooltip>
                     )}
                  </div>
               </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              required: true,
              placeholder: t('Select Employee'),
              searchable: true,
              options: employees ? employees.map((emp: any) => ({ value: emp.id.toString(), label: emp.name })) : []
            },
            { name: 'date', label: t('Date'), type: 'date', required: true, placeholder: t('Select Date') },
            { name: 'hours', label: t('Hours'), type: 'number', required: true, min: 0.5, max: 24, step: 0.5, placeholder: t('e.g. 8') },
            { name: 'project', label: t('Project'), type: 'text', placeholder: t('e.g. Website Redesign') },
            { name: 'description', label: t('Description'), type: 'textarea', required: true, placeholder: t('e.g. Worked on frontend development and bug fixes...') }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          date: currentItem.date ? window.appSettings.formatDateTimeSimple(currentItem.date, false) : currentItem.date
        } : null}
        title={formMode === 'create' ? t('Add New Timesheet') : t('Edit Timesheet')}
        mode={formMode}
      />

      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View record={viewingItem} />}
      </Dialog>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name}` || ''}
        entityName="timesheet"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('Import Time Entries from CSV/Excel')}
        importRoute="hr.time-entries.import"
        parseRoute="hr.time-entries.parse"
        sampleRoute={hasSampleFile ? 'hr.time-entries.download.template' : undefined}
        importNotes={t('Ensure that the employee names match exactly with existing employees in your system.')}
        modalSize="xl"
        databaseFields={[
          { key: 'employee', required: true },
          { key: 'date', required: true },
          { key: 'hours', required: true },
          { key: 'project' },
          { key: 'description' }
        ]}
      />
    </PageTemplate>
  );
}
