import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus, LayoutGrid, CalendarClock, CheckCircle2, XCircle, UserMinus, Users, MessageSquare, ChevronLeft, ChevronRight, MapPin, Video, Eye, Edit, RefreshCw, Trash2, Kanban } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UserInitials from '@/components/user-initials';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function Interviews() {
  const { t } = useTranslation();
  const { auth, interviews, candidates, interviewTypes, employees, filters: pageFilters = {}, globalSettings, statusCounts = {}, kpiStats = {}, weeklyCalendar = [], weekRange = {}, upcomingNext = [], monthlySummary = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [candidateFilter, setCandidateFilter] = useState(pageFilters.candidate_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [availableRounds, setAvailableRounds] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(
    pageFilters.selected_date || weekRange?.default_selected || null
  );

  const hasActiveFilters = () => {
    return statusFilter !== '_empty_' || candidateFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (statusFilter !== '_empty_' ? 1 : 0) + (candidateFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.recruitment.interviews.index'), buildParams(), { preserveState: true, preserveScroll: true });
  };

  const buildParams = (overrides: Record<string, any> = {}) => ({
    page: 1,
    search: searchTerm || undefined,
    status: statusFilter !== '_empty_' ? statusFilter : undefined,
    candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined,
    per_page: pageFilters.per_page,
    sort_field: pageFilters.sort_field || undefined,
    sort_direction: pageFilters.sort_direction || undefined,
    selected_date: pageFilters.selected_date || undefined,
    ...overrides,
  });

  const getAnchorDate = () => selectedDay || pageFilters.selected_date || weekRange?.default_selected || new Date().toLocaleDateString('en-CA');

  const handleWeekNav = (direction: 'prev' | 'next') => {
    const current = new Date(getAnchorDate() + 'T00:00:00');
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    const newDate = current.toISOString().slice(0, 10);
    setSelectedDay(newDate);
    router.get(route('hr.recruitment.interviews.index'), buildParams({ selected_date: newDate }), { preserveState: true, preserveScroll: true });
  };

  const handleMonthNav = (direction: 'prev' | 'next') => {
    const anchor = getAnchorDate();
    const [year, month] = anchor.split('-').map(Number);
    const newMonth = direction === 'next' ? month : month - 2;
    const newYear = direction === 'next'
      ? (month === 12 ? year + 1 : year)
      : (month === 1 ? year - 1 : year);
    const normalizedMonth = direction === 'next'
      ? (month === 12 ? 1 : month + 1)
      : (month === 1 ? 12 : month - 1);
    const newDate = `${newYear}-${String(normalizedMonth).padStart(2, '0')}-01`;
    setSelectedDay(newDate);
    router.get(route('hr.recruitment.interviews.index'), buildParams({ selected_date: newDate }), { preserveState: true, preserveScroll: true });
  };

  const handleDaySelect = (date: string) => {
    const isAlreadySelected = selectedDay === date;
    const newSelectedDay = isAlreadySelected ? null : date;
    setSelectedDay(newSelectedDay);
    router.get(route('hr.recruitment.interviews.index'), buildParams({ selected_date: isAlreadySelected ? undefined : date }), { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.recruitment.interviews.index'), buildParams({ page }), { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.recruitment.interviews.index'), buildParams({ sort_field: field, sort_direction: direction }), { preserveState: true, preserveScroll: true });
  };

  const handleAction = async (action: string, item: any) => {
    setCurrentItem(item);

    if ((action === 'edit') && item.candidate_id) {
      setSelectedCandidate(item.candidate_id.toString());
      await handleCandidateChange(item.candidate_id.toString());
    }

    switch (action) {
      case 'view':
        router.get(route('hr.recruitment.interviews.show', item.id));
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'update-status':
        setCurrentItem(item);
        setSelectedStatus(item.status);
        setIsStatusModalOpen(true);
        break;
    }
  };

  const handleCandidateChange = async (candidateId: string, clearRounds = true) => {
    if (clearRounds) {
      setAvailableRounds([]);
    }

    if (candidateId && candidateId !== '_empty_') {
      try {
        const response = await fetch(route('hr.recruitment.interviews.rounds-by-candidate', candidateId), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        setAvailableRounds(data || []);
      } catch (error) {
        setAvailableRounds([]);
      }
    } else {
      setAvailableRounds([]);
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setAvailableRounds([]);
    setSelectedCandidate('');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    // Ensure candidate_id is included from selectedCandidate state
    if (selectedCandidate) {
      formData.candidate_id = selectedCandidate;
    }

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Scheduling interview...'));

      router.post(route('hr.recruitment.interviews.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedCandidate('');
          setAvailableRounds([]);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to schedule interview: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating interview...'));

      router.put(route('hr.recruitment.interviews.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          setSelectedCandidate('');
          setAvailableRounds([]);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update interview: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting interview...'));

    router.delete(route('hr.recruitment.interviews.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete interview: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleUpdateStatus = (formData: any) => {
    if (!formData.status) return;

    if (!globalSettings?.is_demo) toast.loading(t('Updating status...'));

    router.put(route('hr.recruitment.interviews.update-status', currentItem.id), { status: formData.status }, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.recruitment.interviews.index'));
  };

  const pageActions: any[] = [];

  if (hasPermission(permissions, 'create-interviews')) {
    pageActions.push({
      label: t('Schedule Interview'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  pageActions.push(
    {
      icon: <Kanban className="h-4 w-4" />,
      variant: 'outline',
      tooltip: t('Kanban View'),
      onClick: () => router.get(route('hr.recruitment.interviews.kanban'))
    });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Interviews') }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Completed': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Cancelled': return 'bg-red-50 text-red-700 ring-red-600/10';
      case 'No-show': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (interviews?.total || 0) },
    { value: 'Scheduled', label: t('Scheduled'), icon: <CalendarClock className="h-4 w-4" />, count: statusCounts.Scheduled ?? 0 },
    { value: 'Completed', label: t('Completed'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.Completed ?? 0 },
    { value: 'Cancelled', label: t('Cancelled'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.Cancelled ?? 0 },
    { value: 'No-show', label: t('No-show'), icon: <UserMinus className="h-4 w-4" />, count: statusCounts['No-show'] ?? 0 },
  ];

  const statusOptions = [
    { value: '_empty_', label: t('All Statuses') },
    { value: 'Scheduled', label: t('Scheduled') },
    { value: 'Completed', label: t('Completed') },
    { value: 'Cancelled', label: t('Cancelled') },
    { value: 'No-show', label: t('No-show') }
  ];

  const candidateOptions = [
    { value: '_empty_', label: t('All Candidates'), disable: true },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, statusFilter, candidateFilter]);

  const candidateSelectOptions = [
    { value: '_empty_', label: t('Select Candidate') },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const interviewTypeOptions = [
    { value: '_empty_', label: t('Select Interview Type') },
    ...(interviewTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const employeeOptions = (employees || []).map((emp: any) => ({
    value: emp.id.toString(),
    label: emp.name || `${emp.first_name} ${emp.last_name}` || emp.employee_id
  }));

  return (
    <PageTemplate
      title={t("Interviews")}
      description={t("Schedule and manage candidate interviews.")}
      url="/hr/recruitment/interviews"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <style>{`
        main {
          overflow-x: clip !important;
        }
        body {
          overflow-x: clip !important;
        }
      `}</style>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Interviews */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Interviews')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiStats?.total ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All time')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <Users className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Scheduled */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Scheduled')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiStats?.scheduled ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Upcoming interviews')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <CalendarClock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Completed')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiStats?.completed ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Successfully completed')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Pending Feedback */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Pending Feedback')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiStats?.pending_feedback ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('Awaiting feedback')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
              <MessageSquare className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'candidate_id',
              label: t('Candidate'),
              type: 'select',
              value: candidateFilter,
              onChange: setCandidateFilter,
              options: candidateOptions,
              searchable: true
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          statusTabs={statusTabs}
          activeStatusTab={statusFilter}
          onStatusTabChange={setStatusFilter}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="flex items-start gap-4">
        {/* Left: calendar + table */}
        <div className="flex-1 min-w-0">

          {/* Month Navigator */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-2">
            <div className="flex items-center justify-between px-5 py-3">
              <button
                onClick={() => handleMonthNav('prev')}
                className="inline-flex items-center cursor-pointer justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {weekRange?.month_label || ''}
              </span>
              <button
                onClick={() => handleMonthNav('next')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekly Calendar Strip */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
            <div className="flex items-center min-h-[88px]">

              {/* Prev week arrow */}
              <button
                onClick={() => handleWeekNav('prev')}
                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm ml-2"
              // className="flex-shrink-0 inline-flex items-center justify-center w-10 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors rounded-l-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Week label */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center px-4 border-gray-100 dark:border-gray-700 min-w-[152px]">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {weekRange?.label || ''}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {weekRange?.week_start
                    ? new Date(weekRange.week_start + 'T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
                    : ''}
                </span>
              </div>

              {/* Next week arrow */}
              <button
                onClick={() => handleWeekNav('next')}
                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm mr-2"
              // className="flex-shrink-0 inline-flex items-center justify-center border-r border-gray-200 w-10 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* 7 day columns */}
              <div className="border-l flex flex-1 divide-x divide-gray-200 dark:divide-gray-700">
                {(weeklyCalendar as any[]).map((day) => {
                  const isSelected = selectedDay === day.date;
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <button
                      key={day.date}
                      onClick={() => handleDaySelect(day.date)}
                      className={`relative flex flex-col items-center justify-center py-2 sm:py-3 cursor-pointer transition-all flex-1 ${isSelected
                          ? 'bg-primary text-white'
                          : isToday
                            ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide">
                        {day.day_name}
                      </span>
                      <span
                        className={`mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all ${isSelected
                            ? 'bg-white/20 text-white'
                            : isToday
                              ? 'bg-primary text-white'
                              : 'text-gray-700 dark:text-gray-200'
                          }`}
                      >
                        {day.day_number}
                      </span>
                      {isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border shadow overflow-hidden">
            {(() => {
              const data: any[] = interviews?.data || [];
              if (data.length === 0) {
                return (
                  <div className="py-16 text-center text-sm text-muted-foreground">{t('No interviews found.')}</div>
                );
              }

              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">{t('Time')}</TableHead>
                      <TableHead>{t('Candidate')}</TableHead>
                      <TableHead>{t('Round')}</TableHead>
                      <TableHead>{t('Type / Location')}</TableHead>
                      <TableHead className="w-[110px]">{t('Status')}</TableHead>
                      <TableHead className="w-[110px]">{t('Feedback')}</TableHead>
                      <TableHead className="text-center w-[120px]">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        {/* Colored dot */}

                        {/* Time */}
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {row.scheduled_time ? window.appSettings?.formatTime(row.scheduled_time) || row.scheduled_time : '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.duration} min
                          </div>
                        </TableCell>

                        {/* Candidate */}
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <UserInitials name={`${row.candidate?.first_name} ${row.candidate?.last_name}`} />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.candidate?.first_name} {row.candidate?.last_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{row.job?.title}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Round badge */}
                        <TableCell>
                          {row.round?.name
                            ? <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20 whitespace-nowrap">{row.round.name}</span>
                            : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>

                        {/* Type / Location */}
                        <TableCell>
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {row.interview_type?.name || '-'}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              {row.meeting_link
                                ? <><Video className="h-3 w-3 flex-shrink-0 text-primary" /><span className="text-primary">{t('Online')}</span></>
                                : <><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{row.location || '-'}</span></>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(row.status)}`}>
                            {t(row.status)}
                          </span>
                        </TableCell>

                        {/* Feedback */}
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${row.feedback_submitted
                              ? 'bg-green-50 text-green-700 ring-green-600/20'
                              : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                            }`}>
                            {row.feedback_submitted ? t('Submitted') : t('Pending')}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {hasPermission(permissions, 'view-interviews') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleAction('view', row)} className="h-8 w-8 text-gray-500">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('View')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-interviews') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleAction('edit', row)} className="h-8 w-8 text-gray-500">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Edit')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-interviews') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleAction('update-status', row)} className="h-8 w-8 text-gray-500">
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Update Status')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'delete-interviews') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleAction('delete', row)} className="h-8 w-8 text-gray-500">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Delete')}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}

            <Pagination
              from={interviews?.from || 0}
              to={interviews?.to || 0}
              total={interviews?.total || 0}
              links={interviews?.links}
              entityName={t("interviews")}
              onPageChange={handlePageChange}
              currentPerPage={pageFilters.per_page?.toString() || '10'}
              onPerPageChange={(value) => {
                router.get(route('hr.recruitment.interviews.index'), buildParams({ per_page: value, page: 1 }), { preserveState: true, preserveScroll: true });
              }}
            />
          </div>

        </div>{/* end left column */}

        {/* Right Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4 sticky top-20 z-10 self-start">

          {/* Upcoming Next Day */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t('Tomorrow')} – {monthlySummary?.next_date_label || ''}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 min-h-[140px] max-h-[320px] overflow-y-auto">
              {(upcomingNext as any[]).length === 0 ? (
                <div className="flex items-center justify-center min-h-[140px] px-4 py-6 text-center text-xs text-muted-foreground">{t('No interviews scheduled.')}</div>
              ) : (
                (upcomingNext as any[]).map((item: any) => (
                  <div key={item.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                        {window.appSettings?.formatTime(item.scheduled_time) || item.scheduled_time}
                      </span>
                      {item.duration && (
                        <span className="text-xs text-muted-foreground">({item.duration} min)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserInitials name={item.candidate_name} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.candidate_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.job_title}</div>
                      </div>
                    </div>
                    {item.round_name && (
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-primary/10 text-primary ring-primary/20">
                        {item.round_name}
                      </span>
                    )}
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.type_name && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{item.type_name}</span>
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-1.5">
                          <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>
                    {item.meeting_link && (
                      <a href={item.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="mt-1 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary text-xs font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        {t('Join Interview')}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{monthlySummary?.month_label || ''} {t('Summary')}</span>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                { label: t('Total Interviews'), value: monthlySummary?.total ?? 0, icon: <Users className="h-3.5 w-3.5 text-gray-400" /> },
                { label: t('Scheduled'), value: monthlySummary?.scheduled ?? 0, icon: <CalendarClock className="h-3.5 w-3.5 text-gray-400" /> },
                { label: t('Completed'), value: monthlySummary?.completed ?? 0, icon: <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" /> },
                { label: t('Pending Feedback'), value: monthlySummary?.pending_feedback ?? 0, icon: <MessageSquare className="h-3.5 w-3.5 text-gray-400" /> },
                { label: t('Cancelled'), value: monthlySummary?.cancelled ?? 0, icon: <XCircle className="h-3.5 w-3.5 text-gray-400" /> },
                { label: t('No-show'), value: monthlySummary?.no_show ?? 0, icon: <UserMinus className="h-3.5 w-3.5 text-gray-400" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>{/* end sidebar */}
      </div>{/* end flex wrapper */}

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'candidate_id',
              label: t('Candidate'),
              type: 'select',
              required: false,
              options: candidateSelectOptions.filter(opt => opt.value !== '_empty_'),
              render: (field: any, formData: any, handleChange: any) => {
                const currentValue = selectedCandidate || formData[field.name] || '';
                return (
                  <Select
                    value={currentValue}
                    onValueChange={(value) => {
                      setSelectedCandidate(value);
                      handleChange(field.name, value);
                      // Clear round selection when candidate changes
                      setAvailableRounds([]);
                      handleChange('round_id', '');
                      handleCandidateChange(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select Candidate')} />
                    </SelectTrigger>
                    <SelectContent className="z-[60000]" searchable={true}>
                      {candidateSelectOptions.filter(opt => opt.value !== '_empty_').map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
            },
            {
              name: 'round_id',
              label: t('Interview Round'),
              type: 'select',
              required: true,
              placeholder: t('Select Interview Round'),
              searchable: true,
              key: `round-${selectedCandidate}`,
              options: availableRounds.map((round: any) => ({
                value: round.id.toString(),
                label: round.name
              }))
            },
            {
              name: 'interview_type_id',
              label: t('Interview Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Interview Type'),
              options: interviewTypeOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'scheduled_date',
              label: t('Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Interview Date')
            },
            {
              name: 'scheduled_time',
              label: t('Time'),
              type: 'time',
              required: true,
              placeholder: t('Select Interview Time')
            },
            {
              name: 'duration',
              label: t('Duration (minutes)'),
              type: 'number',
              required: true,
              min: 15,
              max: 480,
              placeholder: t('e.g. 60')
            },
            {
              name: 'location',
              label: t('Location'),
              type: 'text',
              placeholder: t('e.g. Conference Room A, Floor 2')
            },
            {
              name: 'meeting_link',
              label: t('Meeting Link'),
              type: 'text',
              placeholder: t('https://meet.google.com/xxx-xxxx-xxx')
            },
            {
              name: 'interviewers',
              label: t('Interviewers'),
              type: 'multi-select',
              required: true,
              placeholder: t('Select Interviewers'),
              options: employeeOptions
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          candidate_id: currentItem.candidate_id?.toString(),
          scheduled_date: currentItem.scheduled_date ? window.appSettings.formatDateTimeSimple(currentItem.scheduled_date, false) : currentItem.scheduled_date
        } : null}
        title={
          formMode === 'create'
            ? t('Schedule New Interview')
            : t('Edit Interview')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem ? `${currentItem.candidate?.first_name} ${currentItem.candidate?.last_name} - ${currentItem.round?.name}` : ''}
        entityName="interview"
      />

      {/* Status Update Modal */}
      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleUpdateStatus}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: statusOptions.filter(opt => opt.value !== '_empty_')
            }
          ]
        }}
        initialData={{ status: selectedStatus }}
        title={t('Update Interview Status')}
        mode="edit"
        submitLabel={t('Update Status')}
      />
    </PageTemplate>
  );
}
