// pages/hr/trips/index.tsx
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
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { Plus, LayoutGrid, CalendarClock, Loader2, BadgeCheck, XCircle, Briefcase, Plane, Clock, CheckCircle2, ChevronUp, ChevronDown, Eye, Edit, DollarSign, FileText, CreditCard, RefreshCw, Trash2, MapPin, Calendar } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import MediaPicker from '@/components/MediaPicker';
import { useInitials } from '@/hooks/use-initials';

export default function Trips() {
  const { t } = useTranslation();
  const { auth, trips, employees, filters: pageFilters = {}, globalSettings, statusCounts = {}, summaryStats = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAdvanceStatusModalOpen, setIsAdvanceStatusModalOpen] = useState(false);
  const [isReimbursementStatusModalOpen, setIsReimbursementStatusModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedEmployee !== '_empty_' ||
      selectedStatus !== '_empty_' ||
      dateFrom !== undefined ||
      dateTo !== undefined ||
      searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedEmployee !== '_empty_' ? 1 : 0) +
      (selectedStatus !== '_empty_' ? 1 : 0) +
      (dateFrom ? 1 : 0) +
      (dateTo ? 1 : 0) +
      (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.trips.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.trips.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        setViewingItem(item);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'change-status':
        setIsStatusModalOpen(true);
        break;
      case 'advance-status':
        setIsAdvanceStatusModalOpen(true);
        break;
      case 'reimbursement-status':
        setIsReimbursementStatusModalOpen(true);
        break;
      case 'download-document':
        window.open(route('hr.trips.download-document', item.id), '_blank');
        break;
      case 'view-expenses':
        router.get(route('hr.trips.expenses', item.id));
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    const data = formData;

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating trip...'));

      router.post(route('hr.trips.store'), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to create trip: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating trip...'));

      router.put(route('hr.trips.update', currentItem.id), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to update trip: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleStatusChange = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating trip status...'));

    router.put(route('hr.trips.change-status', currentItem.id), formData, {
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update trip status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleAdvanceStatusChange = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating advance status...'));

    router.put(route('hr.trips.update-advance-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsAdvanceStatusModalOpen(false);
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update advance status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleReimbursementStatusChange = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating reimbursement status...'));

    router.put(route('hr.trips.update-reimbursement-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsReimbursementStatusModalOpen(false);
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update reimbursement status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting trip...'));

    router.delete(route('hr.trips.destroy', currentItem.id), {
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete trip: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.trips.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedStatus, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Trip" button if user has permission
  if (hasPermission(permissions, 'create-trips')) {
    pageActions.push({
      label: t('Add Trip'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employee Lifecycle') },
    { title: t('Trips') }
  ];

  // Prepare employee options for filter
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} (${emp.employee_id})`
    }))
  ];

  // Prepare status options for filter
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'planned', label: t('Planned'), icon: <CalendarClock className="h-4 w-4" />, count: statusCounts.planned ?? 0 },
    { value: 'ongoing', label: t('Ongoing'), icon: <Loader2 className="h-4 w-4" />, count: statusCounts.ongoing ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
    { value: 'cancelled', label: t('Cancelled'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.cancelled ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Trips")}
      description={t("Manage business trips and travel requests for employees.")}
      url="/hr/trips"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">

        {/* Total Trips */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Trips')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.all ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All business trips')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <Briefcase className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Planned */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Planned')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.planned ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Upcoming trips')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Plane className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Ongoing */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Ongoing')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.ongoing ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{t('Currently in progress')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
              <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Completed')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.completed ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Successfully completed')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Cancelled')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.cancelled ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-red-500 dark:text-red-400 font-medium">{t('Trips not completed')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
              <XCircle className="h-7 w-7 text-red-500 dark:text-red-400" />
            </div>
          </div>
        </div>

      </div>

      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          filters={[
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable: true,
            },
            {
              name: 'date_from',
              label: t('Start Date From'),
              type: 'date',
              value: dateFrom,
              onChange: setDateFrom
            },
            {
              name: 'date_to',
              label: t('End Date To'),
              type: 'date',
              value: dateTo,
              onChange: setDateTo
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        {/* Custom table with expandable rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800 text-muted-foreground">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">{t('Employee')}</th>
                <th className="px-4 py-3 text-left">{t('Destination')}</th>
                <th className="px-4 py-3 text-left">{t('Trip Period')}</th>
                <th className="px-4 py-3 text-left">{t('Status')}</th>
                <th className="px-4 py-3 text-left">{t('Advance')}</th>
                <th className="px-4 py-3 text-left">{t('Expenses')}</th>
                {/* <th className="px-4 py-3 text-left">{t('Settlement')}</th> */}
                <th className="px-4 py-3 text-center">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(trips?.data || []).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{t('No trips found.')}</td></tr>
              ) : (
                (trips?.data || []).map((trip: any, idx: number) => {
                  const isExpanded = expandedRow === trip.id;
                  const rowNum = (trips?.from || 1) + idx;

                  const statusClasses: any = {
                    planned: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    ongoing: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    completed: 'bg-green-50 text-green-700 ring-green-600/20',
                    cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
                  };
                  const advanceStatusClasses: any = {
                    requested: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    approved: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    paid: 'bg-green-50 text-green-700 ring-green-600/20',
                    reconciled: 'bg-purple-50 text-purple-700 ring-purple-600/20',
                  };
                  const expenseStatusClasses: any = {
                    pending: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    approved: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    paid: 'bg-green-50 text-green-700 ring-green-600/20',
                  };

                  const startDate = trip.start_date ? new Date(trip.start_date) : null;
                  const endDate = trip.end_date ? new Date(trip.end_date) : null;
                  const days = startDate && endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1 : null;
                  const fmtDate = (d: string | null) => d ? (window.appSettings?.formatDateTimeSimple(d, false) || '-') : '-';

                  const advance = parseFloat(trip.advance_amount || 0);
                  const expenses = parseFloat(trip.total_expenses || 0);
                  const settlement = advance > 0 ? advance - expenses : 0;
                  const netBalance = settlement;
                  const pct = advance > 0 ? Math.min(100, Math.round((expenses / advance) * 100)) : 0;

                  // Timeline events — context-aware per status
                  const timeline: { label: string; date: string; color: string; muted?: boolean }[] =
                    trip.status === 'planned' ? [
                      { label: t('Created'),          date: fmtDate(trip.created_at),  color: 'bg-blue-500' },
                      { label: t('Scheduled Start'),  date: fmtDate(trip.start_date),  color: 'bg-blue-300', muted: true },
                      { label: t('Scheduled End'),    date: fmtDate(trip.end_date),    color: 'bg-blue-300', muted: true },
                    ]
                    : trip.status === 'ongoing' ? [
                      { label: t('Created'),        date: fmtDate(trip.created_at),                                         color: 'bg-green-500' },
                      { label: t('Approved'),       date: trip.approved_at ? fmtDate(trip.approved_at) : '-',               color: 'bg-green-500' },
                      { label: t('Trip Started'),   date: fmtDate(trip.start_date),                                         color: 'bg-green-500' },
                      { label: t('Expected End'),   date: fmtDate(trip.end_date),                                           color: 'bg-yellow-400', muted: true },
                    ]
                    : trip.status === 'completed' ? [
                      { label: t('Created'),    date: fmtDate(trip.created_at),                                        color: 'bg-green-500' },
                      { label: t('Approved'),   date: trip.approved_at ? fmtDate(trip.approved_at) : '-',              color: 'bg-green-500' },
                      { label: t('Trip Started'), date: fmtDate(trip.start_date),                                      color: 'bg-green-500' },
                      { label: t('Completed'),  date: fmtDate(trip.end_date),                                          color: 'bg-green-500' },
                    ]
                    : /* cancelled */ [
                      { label: t('Created'),   date: fmtDate(trip.created_at),                                         color: 'bg-green-500' },
                      ...(trip.approved_at ? [{ label: t('Approved'), date: fmtDate(trip.approved_at), color: 'bg-orange-400' }] : []),
                      { label: t('Cancelled'), date: '-',                                                               color: 'bg-red-500' },
                    ];

                  return (
                    <>
                      <tr
                        key={trip.id}
                        className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">{rowNum}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0 text-xs font-semibold">
                              {trip.employee?.avatar
                                ? <img src={trip.employee.avatar} alt={trip.employee?.name} className="h-full w-full object-cover" />
                                : getInitials(trip.employee?.name || '')}
                            </div>
                            <div>
                              <div className="font-medium">{trip.employee?.name || '-'}</div>
                              <div className="text-xs text-muted-foreground">{trip.employee?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span>{trip.destination || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {startDate && endDate ? (
                            <div className="flex items-start gap-1.5">
                              <Calendar className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium text-ellipsis text-gray-500">{window.appSettings?.formatDateTimeSimple(trip.start_date, false)} – {window.appSettings?.formatDateTimeSimple(trip.end_date, false)}</div>
                                <div className="text-xs text-muted-foreground">{days} {t('Days')}</div>
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[trip.status] || ''}`}>
                            {trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {advance > 0 ? (
                            <div>
                              <div className="font-mono">{window.appSettings.formatCurrency(advance)}</div>
                              {trip.advance_status && (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${advanceStatusClasses[trip.advance_status] || ''}`}>
                                  {trip.advance_status.charAt(0).toUpperCase() + trip.advance_status.slice(1)}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {expenses > 0 ? (
                            <div>
                              <div className="font-mono">{window.appSettings.formatCurrency(expenses)}</div>
                              {trip.reimbursement_status && (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${expenseStatusClasses[trip.reimbursement_status] || ''}`}>
                                  {trip.reimbursement_status.charAt(0).toUpperCase() + trip.reimbursement_status.slice(1)}
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        {/* <td className="px-4 py-3 font-mono">
                          {advance > 0 ? window.appSettings.formatCurrency(settlement) : '-'}
                        </td> */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {hasPermission(permissions, 'view-trips') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('view', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><Eye className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('View')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-trips') && trip.status !== 'cancelled' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('edit', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><Edit className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Edit')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-trips') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('change-status', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><RefreshCw className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Change Status')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-trips') && trip.status !== 'cancelled' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('advance-status', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><DollarSign className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Advance Status')}</TooltipContent>
                              </Tooltip>
                            )}
                            {trip.status !== 'cancelled' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('view-expenses', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><FileText className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Expenses')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'edit-trips') && trip.status !== 'cancelled' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('reimbursement-status', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><CreditCard className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Reimbursement Status')}</TooltipContent>
                              </Tooltip>
                            )}
                            {hasPermission(permissions, 'delete-trips') && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => handleAction('delete', trip)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Delete')}</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setExpandedRow(isExpanded ? null : trip.id)}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 cursor-pointer border"
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{isExpanded ? t('Collapse') : t('Expand')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {isExpanded && (
                        <tr key={`${trip.id}-expanded`} className="bg-gray-50 dark:bg-gray-800/20">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">

                              {/* Trip Details */}
                              <div className="py-4 md:py-0 md:px-4 first:pt-0 first:pl-0">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-emerald-600" />{t('Trip Details')}
                                </h4>
                                <dl className="space-y-1.5 text-sm">
                                  {[
                                    [t('Employee'), trip.employee?.name],
                                    [t('Email'), trip.employee?.email],
                                    [t('Destination'), trip.destination],
                                    [t('Start Date'), startDate ? <span>{fmtDate(trip.start_date)}</span> : '-'],
                                    [t('End Date'), endDate ? <span>{fmtDate(trip.end_date)}</span> : '-'],
                                    [t('Trip Status'), <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses[trip.status] || ''}`}>{trip.status ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : '-'}</span>],
                                  ].map(([label, value], i) => (
                                    <div key={i} className="flex gap-2">
                                      <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
                                      <dd className="font-medium">{value || '-'}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>

                              {/* Financial Summary */}
                              <div className="py-4 md:py-0 md:px-4">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-emerald-600" />{t('Financial Summary')}
                                </h4>
                                <div className="flex items-center gap-4">
                                  {/* Donut chart */}
                                  <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                                      <circle
                                        cx="18" cy="18" r="15.9" fill="none"
                                        stroke="var(--theme-color)" strokeWidth="3.5"
                                        strokeDasharray={`${pct} ${100 - pct}`}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{pct}%</span>
                                  </div>
                                  <dl className="space-y-1.5 text-sm flex-1">
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">{t('Advance')}</dt>
                                      <dd>
                                        <div className="font-mono text-right">{window.appSettings.formatCurrency(advance)}</div>
                                        {trip.advance_status && <div className={`text-xs text-right ${advanceStatusClasses[trip.advance_status]?.includes('blue') ? 'text-blue-600' : advanceStatusClasses[trip.advance_status]?.includes('yellow') ? 'text-yellow-600' : advanceStatusClasses[trip.advance_status]?.includes('green') ? 'text-green-600' : advanceStatusClasses[trip.advance_status]?.includes('purple') ? 'text-purple-600' : 'text-gray-600'}`}>{trip.advance_status.charAt(0).toUpperCase() + trip.advance_status.slice(1)}</div>}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">{t('Expenses')}</dt>
                                      <dd>
                                        <div className="font-mono text-right">{window.appSettings.formatCurrency(expenses)}</div>
                                        {trip.reimbursement_status && <div className={`text-xs text-right ${expenseStatusClasses[trip.reimbursement_status]?.includes('blue') ? 'text-blue-600' : expenseStatusClasses[trip.reimbursement_status]?.includes('yellow') ? 'text-yellow-600' : expenseStatusClasses[trip.reimbursement_status]?.includes('green') ? 'text-green-600' : 'text-gray-600'}`}>{trip.reimbursement_status.charAt(0).toUpperCase() + trip.reimbursement_status.slice(1)}</div>}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between border-t pt-1">
                                      <dt className="text-muted-foreground">{t('Settlement')}</dt>
                                      <dd className="font-mono">{window.appSettings.formatCurrency(settlement)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                      <dt className="font-semibold">{t('Net Balance')}</dt>
                                      <dd className={`font-mono font-semibold ${netBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>{window.appSettings.formatCurrency(netBalance)}</dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>

                              {/* Trip Timeline */}
                              <div className="py-4 md:py-0 md:px-4 last:pb-0 last:pr-0">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-emerald-600" />{t('Trip Timeline')}
                                </h4>
                                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-3">
                                  {timeline.map((event, i) => (
                                    <li key={i} className="ml-4">
                                      <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white ${event.color}`} />
                                      <div className="flex justify-between text-sm">
                                        <span className={`font-medium ${event.muted ? 'text-muted-foreground' : ''}`}>{event.label}</span>
                                        <span className={`text-xs ${event.muted ? 'text-muted-foreground/60 italic' : 'text-muted-foreground'}`}>{event.date}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>

                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination section */}
        <Pagination
          from={trips?.from || 0}
          to={trips?.to || 0}
          total={trips?.total || 0}
          links={trips?.links}
          entityName={t("trips")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.trips.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
              date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

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
              options: employeeOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'purpose',
              label: t('Purpose'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Client Meeting, Conference, Site Visit')
            },
            {
              name: 'destination',
              label: t('Destination'),
              type: 'text',
              required: true,
              placeholder: t('e.g. New York, USA')
            },
            {
              name: 'start_date',
              label: t('Start Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Start Date')
            },
            {
              name: 'end_date',
              label: t('End Date'),
              type: 'date',
              required: true,
              placeholder: t('Select End Date')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. Additional details about the trip...')
            },
            {
              name: 'expected_outcomes',
              label: t('Expected Outcomes'),
              type: 'textarea',
              placeholder: t('e.g. Sign contract, Attend training sessions...')
            },
            {
              name: 'documents',
              label: t('Documents'),
              type: 'custom',
              render: (field, formData, handleChange) => (
                <MediaPicker
                  value={String(formData[field.name] || '')}
                  onChange={(url) => handleChange(field.name, url)}
                  placeholder={t('Select document file...')}
                />
              )
            },
            {
              name: 'advance_amount',
              label: t('Advance Amount'),
              type: 'number',
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 500.00')
            },
            ...(formMode === 'edit' ? [
              {
                name: 'status',
                label: t('Status'),
                type: 'select',
                required: true,
                placeholder: t('Select Status'),
                options: [
                  { value: 'planned', label: t('Planned') },
                  { value: 'ongoing', label: t('Ongoing') },
                  { value: 'completed', label: t('Completed') },
                  { value: 'cancelled', label: t('Cancelled') }
                ]
              },
              {
                name: 'advance_status',
                label: t('Advance Status'),
                type: 'select',
                placeholder: t('Select Advance Status'),
                options: [
                  { value: 'requested', label: t('Requested') },
                  { value: 'approved', label: t('Approved') },
                  { value: 'paid', label: t('Paid') },
                  { value: 'reconciled', label: t('Reconciled') }
                ],
                showWhen: (formData) => formData.advance_amount > 0
              },
              {
                name: 'reimbursement_status',
                label: t('Reimbursement Status'),
                type: 'select',
                placeholder: t('Select Reimbursement Status'),
                options: [
                  { value: 'pending', label: t('Pending') },
                  { value: 'approved', label: t('Approved') },
                  { value: 'paid', label: t('Paid') }
                ],
                showWhen: (formData) => formData.total_expenses > 0
              },
              {
                name: 'trip_report',
                label: t('Trip Report'),
                type: 'textarea',
                placeholder: t('e.g. Summary of the trip, outcomes achieved...'),
                showWhen: (formData) => formData.status === 'completed'
              }
            ] : [])
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          start_date: currentItem.start_date ? currentItem.start_date.split('T')[0] : '',
          end_date: currentItem.end_date ? currentItem.end_date.split('T')[0] : ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Trip')
            : t('Edit Trip')
        }
        mode={formMode}
      />

      {/* Status Change Modal */}
      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusChange}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'planned', label: t('Planned') },
                { value: 'ongoing', label: t('Ongoing') },
                { value: 'completed', label: t('Completed') },
                { value: 'cancelled', label: t('Cancelled') }
              ],
              defaultValue: currentItem?.status
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Change Trip Status')}
        mode="edit"
      />

      {/* Advance Status Modal */}
      <CrudFormModal
        isOpen={isAdvanceStatusModalOpen}
        onClose={() => setIsAdvanceStatusModalOpen(false)}
        onSubmit={handleAdvanceStatusChange}
        formConfig={{
          fields: [
            {
              name: 'advance_status',
              label: t('Advance Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Advance Status'),
              options: [
                { value: 'requested', label: t('Requested') },
                { value: 'approved', label: t('Approved') },
                { value: 'paid', label: t('Paid') },
                { value: 'reconciled', label: t('Reconciled') }
              ],
              defaultValue: currentItem?.advance_status
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Change Advance Status')}
        mode="edit"
      />

      {/* Reimbursement Status Modal */}
      <CrudFormModal
        isOpen={isReimbursementStatusModalOpen}
        onClose={() => setIsReimbursementStatusModalOpen(false)}
        onSubmit={handleReimbursementStatusChange}
        formConfig={{
          fields: [
            {
              name: 'reimbursement_status',
              label: t('Reimbursement Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Reimbursement Status'),
              options: [
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'paid', label: t('Paid') }
              ],
              defaultValue: currentItem?.reimbursement_status
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem}
        title={t('Change Reimbursement Status')}
        mode="edit"
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name || ''} - ${currentItem?.purpose || ''}`}
        entityName="trip"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View trip={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
