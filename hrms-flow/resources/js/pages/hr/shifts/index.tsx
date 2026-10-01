// pages/hr/shifts/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Clock, Users, Moon, Sun, MoreVertical, Eye, Edit, Trash2, Lock, Calendar, LayoutGrid, CheckCircle2, XCircle, CalendarX } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import View from './view';

export default function Shifts() {
  const { t } = useTranslation();
  const { auth, shifts, stats, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedShiftType, setSelectedShiftType] = useState(pageFilters.shift_type || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedStatus !== '_empty_' || selectedShiftType !== '_empty_';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedShiftType !== '_empty_' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.shifts.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      shift_type: selectedShiftType !== '_empty_' ? selectedShiftType : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.shifts.index'), {
      page,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      shift_type: selectedShiftType !== '_empty_' ? selectedShiftType : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.shifts.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      shift_type: selectedShiftType !== '_empty_' ? selectedShiftType : undefined,
      per_page: pageFilters.per_page
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
      case 'toggle-status':
        handleToggleStatus(item);
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating shift...'));

      router.post(route('hr.shifts.store'), formData, {
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
            toast.error(`Failed to create shift: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating shift...'));

      router.put(route('hr.shifts.update', currentItem.id), formData, {
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
            toast.error(`Failed to update shift: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting shift...'));

    router.delete(route('hr.shifts.destroy', currentItem.id), {
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
          toast.error(`Failed to delete shift: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleToggleStatus = (shift: any) => {
    const newStatus = shift.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} shift...`);

    router.put(route('hr.shifts.toggle-status', shift.id), {}, {
      onSuccess: (page) => {
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
          toast.error(`Failed to update shift status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.shifts.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Shift" button if user has permission
  if (hasPermission(permissions, 'create-shifts')) {
    pageActions.push({
      label: t('Add Shift'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Attendance') },
    { title: t('Shifts') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Shift Name'),
      sortable: true
    },
    {
      key: 'start_time',
      label: t('Start Time'),
      render: (value: string) => (
        <span className="font-mono">{window.appSettings.formatTime(value) || '-'}</span>
      )
    },
    {
      key: 'end_time',
      label: t('End Time'),
      render: (value: string) => (
        <span className="font-mono">{window.appSettings.formatTime(value) || '-'}</span>
      )
    },
    {
      key: 'break_duration',
      label: t('Break (mins)'),
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      )
    },
    {
      key: 'working_hours',
      label: t('Working Hours'),
      render: (value: any, row: any) => {
        // Calculate working hours from start_time and end_time
        if (row.start_time && row.end_time) {
          const start = new Date(`2000-01-01 ${row.start_time}`);
          let end = new Date(`2000-01-01 ${row.end_time}`);

          // Handle next day for night shifts
          if (end <= start) {
            end.setDate(end.getDate() + 1);
          }

          const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
          const workingMinutes = totalMinutes - (row.break_duration || 0);
          const workingHours = Math.max(0, workingMinutes / 60);

          return (
            <span className="font-mono text-green-600">{workingHours.toFixed(1)}h</span>
          );
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      key: 'grace_period',
      label: t('Grace (mins)'),
      render: (value: number) => (
        <span className="font-mono text-blue-600">{value}</span>
      )
    },
    {
      key: 'is_night_shift',
      label: t('Type'),
      render: (value: boolean) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
          ? 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20'
          : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
          }`}>
          {value ? t('Night') : t('Day')}
        </span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
            }`}>
            {value === 'active' ? t('Active') : t('Inactive')}
          </span>
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
      requiredPermission: 'view-shifts'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-shifts'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-shifts'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-shifts'
    }
  ];

  const statusTabs = [
    { value: '_empty_',  label: t('All'),      icon: <LayoutGrid className="h-4 w-4" />,   count: statusCounts.all      ?? (shifts?.total || 0) },
    { value: 'active',   label: t('Active'),   icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active   ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />,      count: statusCounts.inactive ?? 0 },
  ];

  const shiftTypeOptions = [
    { value: '_empty_', label: t('All Types'), disabled: true },
    { value: 'day', label: t('Day Shift') },
    { value: 'night', label: t('Night Shift') }
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedStatus, selectedShiftType]);

  const workingDayOptions = [
    { value: 'monday', label: t('Monday') },
    { value: 'tuesday', label: t('Tuesday') },
    { value: 'wednesday', label: t('Wednesday') },
    { value: 'thursday', label: t('Thursday') },
    { value: 'friday', label: t('Friday') },
    { value: 'saturday', label: t('Saturday') },
    { value: 'sunday', label: t('Sunday') }
  ];

  // Calculate working hours helper
  const calculateWorkingHours = (startTime: string, endTime: string, breakDuration: number) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01 ${startTime}`);
    let end = new Date(`2000-01-01 ${endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max(0, (totalMinutes - (breakDuration || 0)) / 60);
  };

  // Render shift card
  const renderShiftCard = (shift: any) => {
    const workingHours = calculateWorkingHours(shift.start_time, shift.end_time, shift.break_duration);
    const isNightShift = shift.is_night_shift;

    return (
      <Card key={shift.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-lg ${isNightShift ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {isNightShift ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {shift.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isNightShift ? 'bg-slate-100 text-slate-700 ring-slate-600/20' : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'}`}>
                    {isNightShift ? t('Night Shift') : t('Day Shift')}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${shift.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                    {shift.status === 'active' ? t('Active') : t('Inactive')}
                  </span>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {hasPermission(permissions, 'view-shifts') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('view', shift)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('View Shift')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'edit-shifts') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('edit', shift)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('Edit Shift')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'edit-shifts') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('toggle-status', shift)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={shift.status === 'active' ? t('Deactivate Shift') : t('Activate Shift')}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'delete-shifts') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('delete', shift)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('Delete Shift')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {window.appSettings.formatTime(shift.start_time)} - {window.appSettings.formatTime(shift.end_time)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Shift Hours')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {workingHours.toFixed(1)} {t('hours')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Working Time')}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {shift.break_duration} {t('minutes')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Break Duration')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {shift.grace_period} {t('minutes')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Grace Period')}</p>
              </div>
            </div>
          </div>
          {shift.description && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{shift.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTemplate
      title={t("Shifts")}
      description={t("Manage work shifts and schedules.")}
      url="/hr/shifts"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Shifts')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All shifts')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <Users className="h-7 w-7 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Active Shifts')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.active || 0}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Currently active')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
                <Sun className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-slate-700/40 rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Night Shifts')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.night || 0}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('Night schedule')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Moon className="h-7 w-7 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Day Shifts')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.day || 0}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Day schedule')}</span>
                </div>
              </div>
              <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                <Sun className="h-7 w-7 text-blue-600 dark:text-blue-400" />
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
              name: 'shift_type',
              label: t('Shift Type'),
              type: 'select',
              value: selectedShiftType,
              onChange: setSelectedShiftType,
              options: shiftTypeOptions
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

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shifts?.data?.map((shift: any) => renderShiftCard(shift))}
        </div>
        {shifts?.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <CalendarX className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('No shifts found')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('Try adjusting your filters or search term')}</p>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Pagination
            from={shifts?.from || 0}
            to={shifts?.to || 0}
            total={shifts?.total || 0}
            links={shifts?.links}
            entityName={t("shifts")}
            onPageChange={handlePageChange}
            perPageOptions={[9, 27, 45, 90]}
            currentPerPage={pageFilters.per_page?.toString() || '9'}
            onPerPageChange={(value) => {
              router.get(route('hr.shifts.index'), {
                page: 1,
                per_page: value,
                search: searchTerm || undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                shift_type: selectedShiftType !== '_empty_' ? selectedShiftType : undefined,
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
            { name: 'name', label: t('Shift Name'), type: 'text', required: true, placeholder: t('e.g. Morning Shift') },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Standard morning shift for office staff...') },
            { name: 'start_time', label: t('Start Time'), type: 'time', required: true, placeholder: t('Select Start Time') },
            { name: 'end_time', label: t('End Time'), type: 'time', required: true, placeholder: t('Select End Time') },
            { name: 'break_duration', label: t('Break Duration (minutes)'), type: 'number', required: true, min: 0, placeholder: t('e.g. 60'), defaultValue: 60 },
            { name: 'break_start_time', label: t('Break Start Time'), type: 'time', placeholder: t('Select Break Start Time') },
            { name: 'break_end_time', label: t('Break End Time'), type: 'time', placeholder: t('Select Break End Time') },
            { name: 'grace_period', label: t('Grace Period (minutes)'), type: 'number', required: true, min: 0, placeholder: t('e.g. 15'), defaultValue: 15 },
            { name: 'is_night_shift', label: t('Night Shift'), type: 'checkbox', defaultValue: false },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'active', label: t('Active') },
                { value: 'inactive', label: t('Inactive') }
              ],
              defaultValue: 'active'
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Shift')
            : t('Edit Shift')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="shift"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View shift={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
