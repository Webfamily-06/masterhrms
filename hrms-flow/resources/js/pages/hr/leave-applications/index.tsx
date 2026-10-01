// pages/hr/leave-applications/index.tsx
import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MediaPicker from '@/components/MediaPicker';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { useInitials } from '@/hooks/use-initials';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import View from './view';

export default function LeaveApplications() {
  const { t } = useTranslation();
  const {
    auth,
    employees,
    leaveTypes,
    filters: pageFilters = {},
    globalSettings,
    employeeRows,
    weekDays,
    weekStart,
    monthLabel,
    currentMonthNum,
    currentYearNum,
    leaveApplications,
  } = usePage().props as any;

  const permissions  = auth?.permissions || [];
  const getInitials  = useInitials();

  // State
  // Calendar filter state
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.calendar_employee_id || 'all');

  // List filter state (separate)
  const [listEmployee, setListEmployee]         = useState(pageFilters.list_employee_id || '_empty_');
  const [searchTerm, setSearchTerm]             = useState(pageFilters.search || '');
  const [selectedLeaveType, setSelectedLeaveType] = useState(pageFilters.leave_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus]     = useState(pageFilters.status || 'pending');
  const [showFilters, setShowFilters]           = useState(false);
  const [isFormModalOpen, setIsFormModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem]           = useState<any>(null);
  const [formMode, setFormMode]                 = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem]           = useState<any>(null);
  const [viewingLeave, setViewingLeave]         = useState<any>(null);

  // ── Week navigation ──────────────────────────────────────────────────────
  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    router.get(route('hr.leave-applications.index'), {
      week_start:          current.toISOString().slice(0, 10),
      calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      list_employee_id:    listEmployee !== '_empty_' ? listEmployee : undefined,
      search:              searchTerm || undefined,
      leave_type_id:       selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status:              selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:            pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    let year  = currentYearNum;
    let month = currentMonthNum - 1 + (direction === 'next' ? 1 : -1); // 0-based
    if (month > 11) { month = 0;  year++; }
    if (month < 0)  { month = 11; year--; }

    // Find Monday of the week containing the 1st of target month
    const firstDay = new Date(year, month, 1);
    const dow      = firstDay.getDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    let monday     = new Date(year, month, 1 + toMonday);

    // If Monday falls in previous month, move to next week
    if (monday.getMonth() !== month) {
      monday = new Date(year, month, 1 + toMonday + 7);
    }

    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');

    router.get(route('hr.leave-applications.index'), {
      week_start:           `${y}-${m}-${d}`,
      calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
      search:               searchTerm || undefined,
      leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status:               selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:             pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleEmployeeChange = (val: string) => {
    setSelectedEmployee(val);
    router.get(route('hr.leave-applications.index'), {
      week_start:          weekStart,
      calendar_employee_id: val !== 'all' ? val : undefined,
      list_employee_id:    listEmployee !== 'all' ? listEmployee : undefined,
      search:              searchTerm || undefined,
      leave_type_id:       selectedLeaveType !== 'all' ? selectedLeaveType : undefined,
      status:              selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:            pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  // ── Form handlers (unchanged) ────────────────────────────────────────────
  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating leave application...'));
      router.post(route('hr.leave-applications.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash?.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
        },
      });
    } else {
      if (!globalSettings?.is_demo) toast.loading(t('Updating leave application...'));
      router.put(route('hr.leave-applications.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash?.success) toast.success(t(page.props.flash.success));
          else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
        },
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting leave application...'));
    router.delete(route('hr.leave-applications.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      },
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.leave-applications.export'), {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(t(data.message || 'Failed to export leave applications'));
        return;
      }
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `leave_applications_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error(t('Failed to export leave applications'));
    }
  };

  // ── List handlers ────────────────────────────────────────────────────────
  const applyListFilters = () => {
    router.get(route('hr.leave-applications.index'), {
      page: 1,
      search:               searchTerm || undefined,
      list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
      leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status:               selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:             pageFilters.per_page,
      sort_field:           pageFilters.sort_field || undefined,
      sort_direction:       pageFilters.sort_direction || undefined,
      week_start:           pageFilters.week_start,
      calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.leave-applications.index'), {
      page,
      search:               searchTerm || undefined,
      list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
      leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status:               selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:             pageFilters.per_page,
      sort_field:           pageFilters.sort_field || undefined,
      sort_direction:       pageFilters.sort_direction || undefined,
      week_start:           pageFilters.week_start,
      calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleListSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.leave-applications.index'), {
      sort_field:           field,
      sort_direction:       direction,
      page: 1,
      search:               searchTerm || undefined,
      list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
      leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status:               selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page:             pageFilters.per_page,
      week_start:           pageFilters.week_start,
      calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetListFilters = () => {
    router.get(route('hr.leave-applications.index'));
  };

  const handleListAction = (action: string, item: any) => {
    setCurrentItem(item);
    switch (action) {
      case 'view':    setViewingItem(item); break;
      case 'edit':    setFormMode('edit'); setIsFormModalOpen(true); break;
      case 'delete':  setIsDeleteModalOpen(true); break;
      case 'approve': handleStatusUpdate(item, 'approved'); break;
      case 'reject':  handleStatusUpdate(item, 'rejected'); break;
    }
  };

  const handleStatusUpdate = (application: any, status: string) => {
    const statusText = status === 'approved' ? t('Approving') : t('Rejecting');
    if (!globalSettings?.is_demo) toast.loading(`${statusText} leave application...`);
    router.put(route('hr.leave-applications.update-status', application.id), {
      status,
      manager_comments: ''
    }, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      }
    });
  };

  // ── Page actions ─────────────────────────────────────────────────────────
  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyListFilters();
    setPageInitialState(false);
  }, [searchTerm, listEmployee, selectedLeaveType]);

  const pageActions: any[] = [];

  if (hasPermission(permissions, 'export-leave-applications')) {
    pageActions.push({
      label: t('Export'),
      icon: <FileDown className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handleExport,
    });
  }

  if (hasPermission(permissions, 'create-leave-applications')) {
    pageActions.push({
      label: t('Add Leave Application'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default' as const,
      onClick: handleAddNew,
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Leave Management') },
    { title: t('Leave Applications') },
  ];

  return (
    <PageTemplate
      title={t('Leave Applications')}
      description={t("View and manage leave applications.")}
      url="/hr/leave-applications"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="min-w-0 w-full space-y-4">

        {/* ── Header: Month + Navigation + Employee Filter ── */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">

            {/* Month + Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[140px] text-center">
                {monthLabel}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Employee Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('Employee')}</label>
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="w-full sm:w-[180px] text-sm">
                  <SelectValue placeholder={t('All Employees')} />
                </SelectTrigger>
                <SelectContent searchable={true}>
                  <SelectItem value="all">{t('All Employees')}</SelectItem>
                  {(employees || []).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Legend — between week switcher and calendar */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('Legend')}:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary/10 border border-primary/30 inline-block" />
            {t('Today')}
          </span>
          {(leaveTypes || []).map((type: any) => (
            <span key={type.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block border"
                style={{ backgroundColor: `${type.color}22`, borderColor: `${type.color}66` }}
              />
              <span style={{ color: type.color }} className="font-medium">{type.name}</span>
            </span>
          ))}
        </div>

        {/* ── Calendar Table ── */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <TableHead className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] w-[140px] sm:min-w-[200px] sm:w-[200px] border-r border-gray-200 dark:border-gray-700">
                  {t('Employee')}
                </TableHead>
                {(weekDays || []).map((day: any, dIdx: number) => (
                  <TableHead
                    key={day.date}
                    className={`text-center px-2 py-3 font-medium min-w-[130px] border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                      day.is_today
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {/* Prev week button on first day */}
                    {dIdx === 0 ? (
                      <div className="relative flex items-center justify-center">
                        <button
                          onClick={() => navigateWeek('prev')}
                          className="absolute left-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-6 w-6 text-gray-800 dark:text-gray-800" />
                        </button>
                        <div>
                          <div className="text-sm font-semibold">{day.day}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{day.day_name}</div>
                        </div>
                      </div>
                    ) : dIdx === (weekDays.length - 1) ? (
                      <div className="relative flex items-center justify-center">
                        <div>
                          <div className="text-sm font-semibold">{day.day}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{day.day_name}</div>
                        </div>
                        <button
                          onClick={() => navigateWeek('next')}
                          className="absolute right-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="h-6 w-6 text-gray-800 dark:text-gray-800" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm font-semibold">{day.day}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{day.day_name}</div>
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {(employeeRows || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(weekDays?.length || 0) + 1} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    {t('No employees found.')}
                  </TableCell>
                </TableRow>
              ) : (
                (employeeRows || []).map((emp: any, idx: number) => (
                  <TableRow
                    key={emp.id}
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${
                      idx % 2 !== 0 ? 'bg-gray-50/20 dark:bg-gray-800/10' : ''
                    }`}
                  >
                    {/* Employee info */}
                    <TableCell className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 border-r border-gray-200 dark:border-gray-700 min-w-[140px] w-[140px] sm:min-w-[200px] sm:w-[200px] h-[72px]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm overflow-hidden shrink-0">
                          {emp.avatar
                            ? <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover rounded-full" />
                            : getInitials(emp.name || '')
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{emp.name}</div>
                          {emp.designation && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Day cells — merge consecutive same-leave cells */}
                    {(() => {
                      const cells: React.ReactNode[] = [];
                      const days = emp.days || [];
                      let i = 0;
                      while (i < days.length) {
                        const day = days[i];
                        if (day.has_leave && day.leave_id) {
                          // Count consecutive days with same leave_id
                          let span = 1;
                          while (
                            i + span < days.length &&
                            days[i + span].has_leave &&
                            days[i + span].leave_id === day.leave_id
                          ) {
                            span++;
                          }
                          cells.push(
                            <TableCell
                              key={i}
                              colSpan={span}
                              className={`px-1.5 py-1 align-middle h-[72px] border-r border-gray-200 dark:border-gray-700 ${
                                weekDays[i]?.is_today ? 'bg-primary/5 dark:bg-primary/10' : ''
                              }`}
                              style={{ minWidth: `${130 * span}px` }}
                            >
                              <div
                                className={`rounded-lg px-2.5 py-1.5 text-xs border transition-opacity flex flex-col justify-center h-full ${
                                  hasPermission(permissions, 'view-leave-applications')
                                    ? 'cursor-pointer hover:opacity-90'
                                    : 'cursor-default'
                                }`}
                                style={{
                                  backgroundColor: `${day.leave_type_color}22`,
                                  borderColor: `${day.leave_type_color}66`,
                                  color: day.leave_type_color,
                                }}
                                onClick={() => hasPermission(permissions, 'view-leave-applications') && setViewingLeave({ ...day, employee: emp })}
                              >
                                <div className="font-semibold text-xs leading-tight truncate">{day.leave_type_name}</div>
                                <div className="text-[10px] mt-0.5 opacity-80">
                                  {day.is_paid ? t('Paid Leave') : t('Unpaid Leave')}
                                </div>
                              </div>
                            </TableCell>
                          );
                          i += span;
                        } else {
                          cells.push(
                            <TableCell
                              key={i}
                              className={`px-1.5 py-1 align-middle min-w-[130px] h-[72px] border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                                weekDays[i]?.is_today ? 'bg-primary/5 dark:bg-primary/10' : ''
                              }`}
                            />
                          );
                          i++;
                        }
                      }
                      return cells;
                    })()}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* ── Leave Applications List ── */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'pending',  label: t('Pending Leaves') },
              { key: 'rejected', label: t('Rejected Leaves') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedStatus(tab.key);
                  router.get(route('hr.leave-applications.index'), {
                    page: 1,
                    status:               tab.key,
                    search:               searchTerm || undefined,
                    list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
                    leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
                    per_page:             pageFilters.per_page,
                    week_start:           pageFilters.week_start,
                    calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
                  }, { preserveState: true, preserveScroll: true });
                }}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  selectedStatus === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            <SearchAndFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSearch={(e) => { e.preventDefault(); applyListFilters(); }}
              filters={[
                {
                  name: 'list_employee_id',
                  label: t('Employee'),
                  type: 'select',
                  value: listEmployee,
                  onChange: (val: string) => { setListEmployee(val); },
                  options: [
                  { value: '_empty_', label: t('All Employees'), disabled: true },
                    ...(employees || []).map((emp: any) => ({ value: emp.id.toString(), label: emp.name }))
                  ],
                  searchable: true,
                },
                {
                  name: 'leave_type_id',
                  label: t('Leave Type'),
                  type: 'select',
                  value: selectedLeaveType,
                  onChange: setSelectedLeaveType,
                  options: [
                  { value: '_empty_', label: t('All Leave Types'), disabled: true },
                    ...(leaveTypes || []).map((type: any) => ({ value: type.id.toString(), label: type.name }))
                  ],
                  searchable: true,
                },
              ]}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              hasActiveFilters={() => searchTerm !== '' || listEmployee !== '_empty_' || selectedLeaveType !== '_empty_'}
              activeFilterCount={() => (searchTerm ? 1 : 0) + (listEmployee !== '_empty_' ? 1 : 0) + (selectedLeaveType !== '_empty_' ? 1 : 0)}
              onResetFilters={handleResetListFilters}
            />
          </div>
          <CrudTable
            columns={[
              {
                key: 'employee',
                label: t('Employee'),
                render: (_: any, row: any) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                      {row.employee?.avatar
                        ? <img src={row.employee.avatar} alt={row.employee?.name} className="h-full w-full object-cover" />
                        : getInitials(row.employee?.name || '')}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{row.employee?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{row.employee?.email || ''}</div>
                    </div>
                  </div>
                )
              },
              {
                key: 'leave_type',
                label: t('Leave Type'),
                render: (_: any, row: any) => (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.leave_type?.color }} />
                    <span className="text-sm">{row.leave_type?.name || '-'}</span>
                  </div>
                )
              },
              {
                key: 'start_date', label: t('Start Date'), sortable: true,
                render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
              },
              {
                key: 'end_date', label: t('End Date'), sortable: true,
                render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
              },
              {
                key: 'total_days', label: t('Days'),
                render: (value: number) => <span className="font-mono">{value}</span>
              },
              {
                key: 'status', label: t('Status'),
                render: (value: string) => {
                  const colors: any = {
                    pending:  'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    approved: 'bg-green-50 text-green-700 ring-green-600/20',
                    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
                  };
                  return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[value] || colors.pending}`}>
                      {value?.charAt(0).toUpperCase() + value?.slice(1)}
                    </span>
                  );
                }
              },
              {
                key: 'created_at', label: t('Applied On'), sortable: true,
                render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
              },
            ]}
            actions={[
              { label: t('View'),    icon: 'Eye',         action: 'view',    className: 'text-blue-500',  requiredPermission: 'view-leave-applications' },
              { label: t('Edit'),    icon: 'Edit',        action: 'edit',    className: 'text-amber-500', requiredPermission: 'edit-leave-applications',    condition: (item: any) => item.status === 'pending' },
              { label: t('Approve'), icon: 'CheckCircle', action: 'approve', className: 'text-green-500', requiredPermission: 'approve-leave-applications', condition: (item: any) => item.status === 'pending' },
              { label: t('Reject'),  icon: 'XCircle',     action: 'reject',  className: 'text-red-500',   requiredPermission: 'reject-leave-applications',  condition: (item: any) => item.status === 'pending' },
              { label: t('Delete'),  icon: 'Trash2',      action: 'delete',  className: 'text-red-500',   requiredPermission: 'delete-leave-applications' },
            ]}
            data={leaveApplications?.data || []}
            from={leaveApplications?.from || 1}
            onAction={handleListAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleListSort}
            permissions={permissions}
            entityPermissions={{
              view: 'view-leave-applications',
              create: 'create-leave-applications',
              edit: 'edit-leave-applications',
              delete: 'delete-leave-applications',
            }}
          />
          <Pagination
            from={leaveApplications?.from || 0}
            to={leaveApplications?.to || 0}
            total={leaveApplications?.total || 0}
            links={leaveApplications?.links}
            entityName={t('leave applications')}
            onPageChange={handlePageChange}
            currentPerPage={pageFilters.per_page?.toString() || '10'}
            onPerPageChange={(value) => {
              router.get(route('hr.leave-applications.index'), {
                page: 1,
                per_page:             value,
                search:               searchTerm || undefined,
                list_employee_id:     listEmployee !== '_empty_' ? listEmployee : undefined,
                leave_type_id:        selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
                status:               selectedStatus !== 'all' ? selectedStatus : undefined,
                sort_field:           pageFilters.sort_field || undefined,
                sort_direction:       pageFilters.sort_direction || undefined,
                week_start:           pageFilters.week_start,
                calendar_employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
              }, { preserveState: true, preserveScroll: true });
            }}
          />
        </div>

      </div>

      {/* ── Form Modal (unchanged) ── */}
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
              options: employees ? employees.map((emp: any) => ({
                value: emp.id.toString(),
                label: emp.name,
              })) : [],
            },
            {
              name: 'leave_type_id',
              label: t('Leave Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Leave Type'),
              searchable: true,
              options: leaveTypes ? leaveTypes.map((type: any) => ({
                value: type.id.toString(),
                label: type.name,
              })) : [],
            },
            { name: 'start_date', label: t('Start Date'), type: 'date', required: true, placeholder: t('Select Start Date') },
            { name: 'end_date',   label: t('End Date'),   type: 'date', required: true, placeholder: t('Select End Date') },
            { name: 'reason',     label: t('Reason'),     type: 'textarea', required: true, placeholder: t('e.g. Family emergency, Medical appointment...') },
            {
              name: 'attachment',
              label: t('Attachment'),
              type: 'custom',
              render: (field: any, formData: any, handleChange: any) => (
                <div>
                  <MediaPicker
                    value={String(formData[field.name] || '')}
                    onChange={(url) => handleChange(field.name, url)}
                    placeholder={t('Select attachment file...')}
                  />
                </div>
              ),
              helpText: t('Upload PDF, DOC, DOCX, JPG, JPEG, PNG files'),
            },
          ],
          modalSize: 'lg',
        }}
        initialData={currentItem ? {
          ...currentItem,
          start_date: currentItem.start_date ? window.appSettings.formatDateTimeSimple(currentItem.start_date, false) : currentItem.start_date,
          end_date:   currentItem.end_date   ? window.appSettings.formatDateTimeSimple(currentItem.end_date, false)   : currentItem.end_date,
        } : null}
        title={formMode === 'create' ? t('Add New Leave Application') : t('Edit Leave Application')}
        mode={formMode}
      />

      {/* ── Delete Modal (unchanged) ── */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name} - ${currentItem?.leave_type?.name}` || ''}
        entityName="leave application"
      />

      {/* ── View Modal (unchanged) ── */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View leaveApplication={viewingItem} />}
      </Dialog>

      {/* ── Calendar Leave View Popup ── */}
      <Dialog open={!!viewingLeave} onOpenChange={() => setViewingLeave(null)}>
        {viewingLeave && (
          <View leaveApplication={{
            employee:   { name: viewingLeave.employee?.name, avatar: viewingLeave.employee?.avatar },
            leave_type: { name: viewingLeave.leave_type_name, color: viewingLeave.leave_type_color },
            start_date: viewingLeave.start_date,
            end_date:   viewingLeave.end_date,
            total_days: viewingLeave.total_days,
            status:     viewingLeave.status,
            reason:     viewingLeave.reason,
          }} />
        )}
      </Dialog>
    </PageTemplate>
  );
}
