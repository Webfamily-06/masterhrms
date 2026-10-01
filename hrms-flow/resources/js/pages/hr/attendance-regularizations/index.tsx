// pages/hr/attendance-regularizations/index.tsx
import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, CheckCircle, XCircle, Clock, User, Calendar, MessageSquare, Eye, Edit, Trash2, ArrowRight, AlertCircle, LayoutGrid, CheckCircle2, ClipboardX } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';

export default function AttendanceRegularizations() {
  const { t } = useTranslation();
  const { auth, regularizations, employees, attendanceRecords, filters: pageFilters = {}, summaryStats, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedEmployee !== '_empty_' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedEmployee !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.attendance-regularizations.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page || 9,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.attendance-regularizations.index'), {
      page,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page || 9,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.attendance-regularizations.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page || 9
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
      case 'approve':
        handleStatusUpdate(item, 'approved');
        break;
      case 'reject':
        handleStatusUpdate(item, 'rejected');
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating regularization request...'));

      router.post(route('hr.attendance-regularizations.store'), formData, {
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
            toast.error(errors);
          } else {
            toast.error(`Failed to create regularization request: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating regularization request...'));

      router.put(route('hr.attendance-regularizations.update', currentItem.id), formData, {
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
            toast.error(errors);
          } else {
            toast.error(`Failed to update regularization request: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting regularization request...'));

    router.delete(route('hr.attendance-regularizations.destroy', currentItem.id), {
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
          toast.error(`Failed to delete regularization request: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleStatusUpdate = (regularization: any, status: string) => {
    const statusText = status === 'approved' ? t('Approving') : t('Rejecting');
    if (!globalSettings?.is_demo) toast.loading(`${statusText} regularization request...`);

    router.put(route('hr.attendance-regularizations.update-status', regularization.id), {
      status,
      manager_comments: status === 'approved' ? 'Approved' : 'Rejected'
    }, {
      onSuccess: (page) => {
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
          toast.error(`Failed to update regularization request status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.attendance-regularizations.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Request" button if user has permission
  if (hasPermission(permissions, 'create-attendance-regularizations')) {
    pageActions.push({
      label: t('Add Request'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Attendance') },
    { title: t('Attendance Regularizations') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'employee',
      label: t('Employee'),
      render: (value: any, row: any) => row.employee?.name || '-'
    },
    {
      key: 'date',
      label: t('Date'),
      sortable: true,
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
    },
    {
      key: 'original_times',
      label: t('Original Times'),
      render: (value: any, row: any) => (
        <div className="text-sm">
          <div className="text-red-600">In: {window.appSettings.formatTime(row.original_clock_in )|| '-'}</div>
          <div className="text-red-600">Out: {window.appSettings.formatTime(row.original_clock_out) || '-'}</div>
        </div>
      )
    },
    {
      key: 'requested_times',
      label: t('Requested Times'),
      render: (value: any, row: any) => (
        <div className="text-sm">
          <div className="text-green-600">In: {window.appSettings.formatTime(row.requested_clock_in) || '-'}</div>
          <div className="text-green-600">Out: {window.appSettings.formatTime(row.requested_clock_out) || '-'}</div>
        </div>
      )
    },
    {
      key: 'reason',
      label: t('Reason'),
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          approved: 'bg-green-50 text-green-700 ring-green-600/20',
          rejected: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors]}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Requested On'),
      sortable: true,
      render: (value: string) => window.appSettings?.formatDateTimeSimple(value, false) || new Date(value).toLocaleDateString()
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-attendance-regularizations'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-attendance-regularizations',
      condition: (item: any) => item.status === 'pending'
    },
    {
      label: t('Approve'),
      icon: 'CheckCircle',
      action: 'approve',
      className: 'text-green-500',
      requiredPermission: 'approve-attendance-regularizations',
      condition: (item: any) => item.status === 'pending'
    },
    {
      label: t('Reject'),
      icon: 'XCircle',
      action: 'reject',
      className: 'text-red-500',
      requiredPermission: 'reject-attendance-regularizations',
      condition: (item: any) => item.status === 'pending'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-attendance-regularizations',
      condition: (item: any) => item.status === 'pending'
    }
  ];

  // Prepare options for filters and forms
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_',  label: t('All'),      icon: <LayoutGrid className="h-4 w-4" />,   count: statusCounts.all      ?? (regularizations?.total || 0) },
    { value: 'pending',  label: t('Pending'),  icon: <Clock className="h-4 w-4" />,        count: statusCounts.pending  ?? 0 },
    { value: 'approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.approved ?? 0 },
    { value: 'rejected', label: t('Rejected'), icon: <XCircle className="h-4 w-4" />,      count: statusCounts.rejected ?? 0 },
  ];

  const attendanceRecordOptions = (attendanceRecords || []).map((record: any) => ({
    value: record.id.toString(),
    label: `${record.employee?.name} - ${new Date(record.date).toLocaleDateString()}`
  }));

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedEmployee, selectedStatus, dateFrom, dateTo]);

  // Get status configuration
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        label: t('Pending'),
        className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        dotColor: 'bg-yellow-500'
      },
      approved: {
        label: t('Approved'),
        className: 'bg-green-50 text-green-700 ring-green-600/20',
        dotColor: 'bg-green-500'
      },
      rejected: {
        label: t('Rejected'),
        className: 'bg-red-50 text-red-700 ring-red-600/20',
        dotColor: 'bg-red-500'
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  // Render regularization request card
  const renderRegularizationCard = (request: any) => {
    const statusConfig = getStatusConfig(request.status);
    const isPending = request.status === 'pending';

    return (
      <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {request.employee?.avatar ? (
                <img
                  src={request.employee.avatar}
                  alt={request.employee?.name || ''}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`avatar-fallback w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm${request.employee?.avatar ? ' hidden' : ''}`}
              >
                {request.employee?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${statusConfig.dotColor}`}></div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-gray-900 dark:text-white text-sm truncate">
                <p className='font-semibold '>{request.employee?.name || t('Unknown Employee')}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400">{request.employee?.employee?.employee_id}</div>
              </h3>
                {/* Date and Status */}
                <div className="flex items-center space-x-2 mt-1 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {window.appSettings?.formatDateTimeSimple(request.date, false) || new Date(request.date).toLocaleDateString()}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusConfig.className}`}>
                        {statusConfig.label}
                    </span>
                </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            {isPending && hasPermission(permissions, 'approve-attendance-regularizations') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('approve', request)}
                  className="h-7 w-7 p-0 text-gray-500"
                  title={t('Approve Request')}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('reject', request)}
                  className="h-7 w-7 p-0 text-gray-500"
                  title={t('Reject Request')}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {hasPermission(permissions, 'view-attendance-regularizations') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction('view', request)}
                className="h-7 w-7 p-0 text-gray-500"
                title={t('View Request')}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {isPending && hasPermission(permissions, 'edit-attendance-regularizations') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction('edit', request)}
                className="h-7 w-7 p-0 text-gray-500"
                title={t('Edit Request')}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {isPending && hasPermission(permissions, 'delete-attendance-regularizations') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction('delete', request)}
                className="h-7 w-7 p-0 text-gray-500"
                title={t('Delete Request')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {/* Time Comparison */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between text-sm">
            {/* Original Times */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Original')}</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {request.original_clock_in ? window.appSettings.formatTime(request.original_clock_in) : '--:--'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {request.original_clock_out ? window.appSettings.formatTime(request.original_clock_out) : '--:--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>

            {/* Requested Times */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Requested')}</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {request.requested_clock_in ? window.appSettings.formatTime(request.requested_clock_in) : '--:--'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono text-xs">
                    {request.requested_clock_out ? window.appSettings.formatTime(request.requested_clock_out) : '--:--'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-3">
          <div className="flex items-start space-x-2">
            <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Reason')}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {request.reason || t('No reason provided')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3" />
            <span>{t('Requested on : ')} {window.appSettings?.formatDateTimeSimple(request.created_at, false) || new Date(request.created_at).toLocaleDateString()}</span>
          </div>

          {request.status !== 'pending' && request.approved_at && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <User className="h-3 w-3" />
              <span>{request.status === 'approved' ? t('Approved : ') : t('Rejected : ')} {window.appSettings?.formatDateTimeSimple(request.approved_at, false)}</span>
            </div>
          )}
        </div>

        {/* Manager Comments */}
        {request.manager_comments && request.status !== 'pending' && request.manager_comments !== 'Approved' && request.manager_comments !== 'Rejected' && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Manager Comments')}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              "{request.manager_comments}"
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageTemplate
      title={t("Attendance Regularizations")}
      description={t("Review and manage attendance regularization requests.")}
      url="/hr/attendance-regularizations"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Requests */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Requests')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.total ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All time')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <Calendar className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Pending')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.pending ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{t('Needs Review')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
              <AlertCircle className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Approved')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.approved ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {summaryStats?.total > 0 ? (((summaryStats?.approved ?? 0) / summaryStats.total) * 100).toFixed(1) : '0'}% {t('rate')}
                </span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Rejected')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats?.rejected ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t('Declined')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
              <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
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
          filters={[
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable : true
            },
            {
              name: 'date_from',
              label: t('Date From'),
              type: 'date',
              value: dateFrom,
              onChange: (date) => setDateFrom(date)
            },
            {
              name: 'date_to',
              label: t('Date To'),
              type: 'date',
              value: dateTo,
              onChange: (date) => setDateTo(date)
            }
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

      {/* Content section */}
      <div className="space-y-6">

        {/* Regularization Requests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {regularizations?.data?.map((request: any) => renderRegularizationCard(request))}
        </div>
        {regularizations?.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <ClipboardX className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('No regularization requests found')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('Try adjusting your filters or search term')}</p>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Pagination
            from={regularizations?.from || 0}
            to={regularizations?.to || 0}
            total={regularizations?.total || 0}
            links={regularizations?.links}
            entityName={t("regularization requests")}
            onPageChange={handlePageChange}
            perPageOptions={[9, 27, 45, 90]}
            currentPerPage={pageFilters.per_page?.toString() || '9'}
            onPerPageChange={(value) => {
              router.get(route('hr.attendance-regularizations.index'), {
                page: 1,
                per_page: value,
                search: searchTerm || undefined,
                employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
                date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
              }, { preserveState: true, preserveScroll: true });
            }}
          />
        </div>
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            // {
            //   name: 'employee_id',
            //   label: t('Employee'),
            //   type: 'select',
            //   required: true,
            //   options: employees ? employees.map((emp: any) => ({
            //     value: emp.id.toString(),
            //     label: emp.name
            //   })) : []
            // },
            // {
            //   name: 'attendance_record_id',
            //   label: t('Attendance Record'),
            //   type: 'select',
            //   required: true,
            //   options: attendanceRecordOptions
            // },
            {
              name: 'employee_id',
              type: 'dependent-dropdown',
              dependentConfig: [
                {
                  name: 'employee_id',
                  label: t('Employee'),
                  required: true,
                  searchable: true,
                  placeholder: t('Select Employee'),
                  options: employees ? employees.map((emp: any) => ({
                    value: emp.id.toString(),
                    label: emp.name
                  })) : []
                },
                {
                  name: 'attendance_record_id',
                  label: t('Attendance Record'),
                  required: true,
                  placeholder: t('Select Attendance Record'),
                  apiEndpoint: '/hr/attendance-regularizations/get-employee-attendance/{employee_id}',
                  showCurrentValue: true,
                  searchable: true
                }
              ]
            },
            { name: 'requested_clock_in', label: t('Requested Clock In'), type: 'time', required: true, placeholder: t('Select Requested Clock In') },
            { name: 'requested_clock_out', label: t('Requested Clock Out'), type: 'time', required: true, placeholder: t('Select Requested Clock Out') },
            { name: 'reason', label: t('Reason'), type: 'textarea', required: true, placeholder: t('e.g. Forgot to clock in due to urgent meeting...') }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={formMode === 'create' ? t('Add New Regularization Request') : t('Edit Regularization Request')}
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
        itemName={`${currentItem?.employee?.name} ` || ''}
        entityName="regularization request"
      />
    </PageTemplate>
  );
}
