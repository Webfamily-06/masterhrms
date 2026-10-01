// pages/hr/attendance-records/index.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Clock, LogIn, LogOut, FileDown, FileUp, Calendar, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye, Edit, Trash2, LayoutGrid } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { ImportModal } from '@/components/ImportModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import View from './view';

export default function AttendanceRecords() {
  const { t } = useTranslation();
  const { auth, attendanceRecords, employees, filters: pageFilters = {}, hasSampleFile, globalSettings, todayStats } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [dateFrom, setDateFrom] = useState(pageFilters.date_from || '');
  const [dateTo, setDateTo] = useState(pageFilters.date_to || '');
  const [showFilters, setShowFilters] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedEmployee !== 'all' || selectedStatus !== 'all' || dateFrom !== '' || dateTo !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedEmployee !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.attendance-records.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      per_page: pageFilters.per_page || 9
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.attendance-records.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
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
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating attendance record...'));

      router.post(route('hr.attendance-records.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create attendance record: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating attendance record...'));

      router.put(route('hr.attendance-records.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update attendance record: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting attendance record...'));

    router.delete(route('hr.attendance-records.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete attendance record: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedEmployee('all');
    setSelectedStatus('all');
    setDateFrom('');
    setDateTo('');
    setShowFilters(false);

    router.get(route('hr.attendance-records.index'), {
      page: 1,
      per_page: pageFilters.per_page || 9
    }, { preserveState: true, preserveScroll: true });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.attendance-records.export'), {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(t(data.message || 'Failed to export attendance records'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error(t('Failed to export attendance records'));
    }
  };

  // Define page actions
  const pageActions: any[] = [];

  // Add Export button
  if (hasPermission(permissions, 'export-attendance-record')) {
    pageActions.push({
      label: t('Export'),
      icon: <FileDown className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: handleExport
    });
  }

  // Add Import button
  if (hasPermission(permissions, 'import-attendance-record')) {
    pageActions.push({
      label: t('Import'),
      icon: <FileUp className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: () => setIsImportModalOpen(true)
    });
  }

  // Add the "Add New Record" button if user has permission
  if (hasPermission(permissions, 'create-attendance-records')) {
    pageActions.push({
      label: t('Add Record'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Attendance') },
    { title: t('Attendance Records') }
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
      key: 'shift',
      label: t('Shift'),
      render: (value: any, row: any) => row.shift?.name || '-'
    },
    {
      key: 'clock_in',
      label: t('Clock In'),
      render: (value: string) => (

        <span className="font-mono text-green-600">{window.appSettings.formatTime(value) || '-'}</span>
      )
    },
    {
      key: 'clock_out',
      label: t('Clock Out'),
      render: (value: string) => (
        <span className="font-mono text-red-600">{window.appSettings.formatTime(value) || '-'}</span>
      )
    },
    {
      key: 'total_hours',
      label: t('Total Hours'),
      render: (value: number) => (
        <span className="font-mono">{Number(value).toFixed(2)}h</span>
      )
    },
    {
      key: 'overtime_hours',
      label: t('Overtime'),
      render: (value: number, row: any) => (
        <div className="text-sm">
          <span className={`font-mono ${value > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
            {Number(value).toFixed(2)}h
          </span>
          {value > 0 && row.overtime_amount && (
            <div className="text-xs text-green-600">
              {window.appSettings?.formatCurrency(row.overtime_amount)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string, row: any) => {
        const statusConfig = {
          present: {
            label: t('Present'),
            className: 'bg-green-50 text-green-700 ring-green-600/20'
          },
          absent: {
            label: t('Absent'),
            className: 'bg-red-50 text-red-700 ring-red-600/20'
          },
          half_day: {
            label: t('Half Day'),
            className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
          },
          on_leave: {
            label: row.leave_type ? `${t('On Leave')} (${row.leave_type.name})` : t('On Leave'),
            className: 'bg-blue-50 text-blue-700 ring-blue-600/20'
          },
          holiday: {
            label: t('Holiday'),
            className: 'bg-purple-50 text-purple-700 ring-purple-600/20'
          }
        };

        const config = statusConfig[value as keyof typeof statusConfig] || {
          label: value || '-',
          className: 'bg-gray-50 text-gray-700 ring-gray-600/20'
        };

        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}>
              {value === 'on_leave' ? t('On Leave') : config.label}
            </span>
            {value === 'on_leave' && row.leave_type && (
              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {row.leave_type.name}
              </span>
            )}
            {row.is_late && (
              <span className="inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                {t('Late')}
              </span>
            )}
            {row.is_early_departure && (
              <span className="inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
                {t('Early')}
              </span>
            )}
          </div>
        );
      }
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-attendance-records'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-attendance-records'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-attendance-records'
    }
  ];

  // Prepare options for filters and forms
  const employeeOptions = [
    { value: 'all', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses'), disabled: true },
    { value: 'present', label: t('Present') },
    { value: 'absent', label: t('Absent') },
    { value: 'half_day', label: t('Half Day') },
    { value: 'on_leave', label: t('On Leave') },
    { value: 'holiday', label: t('Holiday') }
  ];

  const totalRecords = attendanceRecords?.total || 0;

  // Get status configuration
  const getStatusConfig = (status: string, record: any) => {
    const configs = {
      present: { label: t('Present'), color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
      absent: { label: t('Absent'), color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      half_day: { label: t('Half Day'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      on_leave: { label: t('On Leave'), color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
      holiday: { label: t('Holiday'), color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Calendar }
    };
    return configs[status as keyof typeof configs] || configs.absent;
  };

  // Render attendance record card with compact, efficient design
  const renderAttendanceCard = (record: any) => {
    
    const statusConfig = getStatusConfig(record.status, record);
    const hasClockTimes = record.clock_in || record.clock_out;
    const workingHours = Number(record.total_hours || 0);
    
    return (
      <div key={record.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {record.employee?.avatar ? (
                <img
                  src={record.employee.avatar}
                  alt={record.employee?.name || ''}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`avatar-fallback w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold text-sm${record.employee?.avatar ? ' hidden' : ''}`}
              >
                {record.employee?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                record.status === 'present' ? 'bg-green-500' :
                record.status === 'absent' ? 'bg-red-500' :
                record.status === 'half_day' ? 'bg-yellow-500' :
                record.status === 'on_leave' ? 'bg-blue-500' :
                'bg-purple-500'
              }`}></div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {record.employee?.name || t('Unknown Employee')}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {window.appSettings?.formatDateTimeSimple(record.date, false) || new Date(record.date).toLocaleDateString()}
                </span>
                {record.shift?.name && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 ring-1 ring-inset ring-gray-500/20">
                    {record.shift.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Status and Actions */}
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              record.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              record.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              record.status === 'half_day' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              record.status === 'on_leave' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              {statusConfig.label}
            </span>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {hasPermission(permissions, 'view-attendance-records') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAction('view', record)}
                  className="h-8 w-8 p-0 text-blue-500"
                  title={t('View Record')}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              {hasPermission(permissions, 'edit-attendance-records') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAction('edit', record)}
                  className="h-8 w-8 p-0 text-amber-500"
                  title={t('Edit Record')}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
              {hasPermission(permissions, 'delete-attendance-records') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAction('delete', record)}
                  className="h-8 w-8 p-0 text-red-500"
                  title={t('Delete Record')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Timeline */}
        {hasClockTimes ? (
          <div className="space-y-3">
            {/* Time Display */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <LogIn className="h-4 w-4 text-green-600" />
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {window.appSettings.formatTime(record.clock_in)}
                </span>
              </div>
              
              <div className="text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('Duration')}</span>
                <div className="font-semibold text-gray-900 dark:text-white">{workingHours.toFixed(1)}h</div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {window.appSettings.formatTime(record.clock_out)}
                </span>
                <LogOut className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    workingHours >= 8 ? 'bg-green-500' :
                    workingHours >= 6 ? 'bg-blue-500' :
                    workingHours >= 4 ? 'bg-yellow-500' :
                    workingHours > 0 ? 'bg-orange-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min((workingHours / 8) * 100, 100)}%` }}
                ></div>
              </div>
              {/* Progress indicators */}
              <div className="absolute top-0 left-0 right-0 flex justify-between">
                <div className="w-0.5 h-2 bg-white dark:bg-gray-800 opacity-50" style={{ marginLeft: '25%' }}></div>
                <div className="w-0.5 h-2 bg-white dark:bg-gray-800 opacity-50" style={{ marginLeft: '25%' }}></div>
                <div className="w-0.5 h-2 bg-white dark:bg-gray-800 opacity-50" style={{ marginLeft: '25%' }}></div>
              </div>
            </div>
            
            {/* Flags and Summary */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {record.is_late && (
                  <span className="inline-flex items-center text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t('Late')}
                  </span>
                )}
                {record.is_early_departure && (
                  <span className="inline-flex items-center text-orange-600 dark:text-orange-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('Early')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {record.overtime_hours > 0 && (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    +{Number(record.overtime_hours).toFixed(1)}h OT
                  </span>
                )}
                {record.overtime_amount > 0 && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {window.appSettings?.formatCurrency(record.overtime_amount)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded">
            <Clock className="h-5 w-5 mx-auto mb-1" />
            <p className="text-xs">{t('No attendance recorded')}</p>
          </div>
        )}

        {/* Compact Notes */}
        {record.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
              {record.notes}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageTemplate
      title={t("Attendance Records")}
      url="/hr/attendance-records"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-6 p-4">
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
              searchable: true
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: statusOptions
            },
            {
              name: 'date_from',
              label: t('Date From'),
              type: 'date',
              value: dateFrom,
              onChange: setDateFrom
            },
            {
              name: 'date_to',
              label: t('Date To'),
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
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "9"}
          onPerPageChange={(value) => {
            router.get(route('hr.attendance-records.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
          perPageOptions={[9, 27, 45, 90]}  
        />
      </div>

      {/* Content section */}
      <div className="space-y-6">
        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('Total Records')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRecords}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('All time')}</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('Present Today')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.present ?? 0}</p>
                  <p className="text-xs text-green-600 font-medium">{t('Today')}</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('On Leave Today')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.on_leave ?? 0}</p>
                  <p className="text-xs text-blue-600 font-medium">{t('Today')}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('Late Arrivals Today')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.late_arrivals ?? 0}</p>
                  <p className="text-xs text-orange-600 font-medium">{t('Today')}</p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{t('Overtime Today')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.overtime ?? 0}</p>
                  <p className="text-xs text-blue-600 font-medium">{t('Today')}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records Efficient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {attendanceRecords?.data?.map((record: any) => renderAttendanceCard(record))}
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Pagination
            from={attendanceRecords?.from || 0}
            to={attendanceRecords?.to || 0}
            total={attendanceRecords?.total || 0}
            links={attendanceRecords?.links}
            entityName={t("attendance records")}
            onPageChange={(url) => {
              const page = new URL(url).searchParams.get('page');
              router.get(route('hr.attendance-records.index'), {
                page,
                per_page: pageFilters.per_page || 9,
                search: searchTerm || undefined,
                employee_id: selectedEmployee !== 'all' ? selectedEmployee : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
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
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              required: true,
              searchable: true,
              placeholder: t('Select Employee'),
              options: employees ? employees.map((emp: any) => ({
                value: emp.id.toString(),
                label: emp.name
              })) : []
            },
            { name: 'date', label: t('Date'), type: 'date', required: true, placeholder: t('Select Date') },
            { name: 'clock_in', label: t('Clock In Time'), type: 'time', required: true, placeholder: t('Select Clock In Time') },
            { name: 'clock_out', label: t('Clock Out Time'), type: 'time', required: true, placeholder: t('Select Clock Out Time') },
            { name: 'is_holiday', label: t('Holiday'), type: 'checkbox', defaultValue: false },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: t('e.g. Working from home, field visit...') }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          date: currentItem.date ? window.appSettings.formatDateTimeSimple(currentItem.date, false) : currentItem.date
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Attendance Record')
            : t('Edit Attendance Record')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.employee?.name || ''}
        entityName="attendance record"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('Import Attendance Records from CSV/Excel')}
        importRoute="hr.attendance-records.import"
        parseRoute="hr.attendance-records.parse"
        sampleRoute={hasSampleFile ? 'hr.attendance-records.download.template' : undefined}
        importNotes={t('Ensure that the employee names , shift & attedance policy must be match exactly with existing employees in your system.')}
        modalSize="xl"
        databaseFields={[
          { key: 'employee', required: true },
          { key: 'date', required: true },
          { key: 'clock_in' , required: true},
          { key: 'clock_out' , required: true},
        ]}
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View record={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}