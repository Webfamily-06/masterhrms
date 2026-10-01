// pages/hr/training/sessions/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Plus, Calendar, LayoutGrid, CalendarClock, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';

export default function TrainingSessions() {
  const { t } = useTranslation();
  const { auth, trainingSessions, trainingPrograms, employees, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedProgram, setSelectedProgram] = useState(pageFilters.training_program_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedLocationType, setSelectedLocationType] = useState(pageFilters.location_type || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedProgram, selectedStatus, selectedLocationType, dateFrom, dateTo]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedProgram !== '_empty_' ||
           selectedStatus !== '_empty_' ||
           selectedLocationType !== '_empty_' ||
           dateFrom !== undefined ||
           dateTo !== undefined ||
           searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedProgram !== '_empty_' ? 1 : 0) +
           (selectedStatus !== '_empty_' ? 1 : 0) +
           (selectedLocationType !== '_empty_' ? 1 : 0) +
           (dateFrom !== undefined ? 1 : 0) +
           (dateTo !== undefined ? 1 : 0) +
           (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleViewCalendar = () => {
    router.get(route('hr.training-sessions.calendar'));
  };

  const applyFilters = () => {
    router.get(route('hr.training-sessions.index'), {
      page: 1,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      location_type: selectedLocationType !== '_empty_' ? selectedLocationType : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.training-sessions.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      location_type: selectedLocationType !== '_empty_' ? selectedLocationType : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.training-sessions.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      location_type: selectedLocationType !== '_empty_' ? selectedLocationType : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.training-sessions.show', item.id));
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
    // Use form data as is since we only have date fields now
    const submitData = {
      ...formData
    };

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating training session...'));

      router.post(route('hr.training-sessions.store'), submitData, {
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
            toast.error(t('Failed to create training session: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating training session...'));

      router.put(route('hr.training-sessions.update', currentItem.id), submitData, {
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
            toast.error(t('Failed to update training session: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting training session...'));

    router.delete(route('hr.training-sessions.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete training session: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.training-sessions.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Calendar View" button
  pageActions.push({
    label: t('Calendar View'),
    icon: <Calendar className="h-4 w-4 mr-2" />,
    variant: 'outline' as const,
    onClick: handleViewCalendar
  });

  // Add the "Add New Session" button if user has permission
  if (hasPermission(permissions, 'create-training-sessions')) {
    pageActions.push({
      label: t('Add Session'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default' as const,
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Training & Development') },
    { title: t('Training Sessions') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'program',
      label: t('Program'),
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.name || row.training_program?.name || '-'}</div>
          <div className="text-xs text-gray-500">{row.training_program?.name || '-'}</div>
        </div>
      )
    },
    {
      key: 'start_date',
      label: t('Start Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'end_date',
      label: t('End Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'location',
      label: t('Location'),
      render: (value, row) => (
        <div>
          <div>{value || '-'}</div>
          <Badge variant="outline" className={row.location_type === 'virtual' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
            {row.location_type === 'virtual' ? t('Virtual') : t('Physical')}
          </Badge>
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      sortable: true,
      render: (value) => {
        const statusClasses = {
          'scheduled': 'bg-blue-50 text-blue-700 ring-blue-600/20',
          'in_progress': 'bg-amber-50 text-amber-700 ring-amber-600/20',
          'completed': 'bg-green-50 text-green-700 ring-green-600/20',
          'cancelled': 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[value] || ''}`}>
            {value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}
          </span>
        );
      }
    },
    {
      key: 'trainers',
      label: t('Trainers'),
      render: (value) => {
        const trainers = value || [];
        if (!trainers.length) return <span className="text-muted-foreground">-</span>;
        const visible = trainers.slice(0, 4);
        const remaining = trainers.slice(4);
        return (
          <TooltipProvider>
            <div className="flex items-center">
              {visible.map((trainer: any, index: number) => (
                <Tooltip key={trainer.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 flex-shrink-0 cursor-pointer"
                      style={{ marginLeft: index === 0 ? 0 : '-8px', zIndex: trainers.length - index }}
                    >
                      {trainer.avatar ? (
                        <img
                          src={trainer.avatar}
                          alt={trainer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold${trainer.avatar ? ' hidden' : ''}`}>
                        {getInitials(trainer.name)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{trainer.name}</TooltipContent>
                </Tooltip>
              ))}
              {remaining.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0 cursor-pointer"
                      style={{ marginLeft: '-8px', zIndex: 0 }}
                    >
                      +{remaining.length}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-0.5">
                      {remaining.map((t: any) => <p key={t.id}>{t.name}</p>)}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      }
    },
    {
      key: 'attendance_count',
      label: t('Attendance'),
      render: (value) => value || '0'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-training-sessions'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-training-sessions'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-training-sessions'
    }
  ];

  // Prepare training program options for filter
  const trainingProgramOptions = [
    { value: '_empty_', label: t('All Programs') },
    ...(trainingPrograms || []).map((program: any) => ({
      value: program.id.toString(),
      label: program.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_',    label: t('All'),         icon: <LayoutGrid className="h-4 w-4" />,    count: statusCounts.all         ?? (trainingSessions?.total || 0) },
    { value: 'scheduled',  label: t('Scheduled'),   icon: <CalendarClock className="h-4 w-4" />, count: statusCounts.scheduled   ?? 0 },
    { value: 'in_progress',label: t('In Progress'), icon: <PlayCircle className="h-4 w-4" />,   count: statusCounts.in_progress ?? 0 },
    { value: 'completed',  label: t('Completed'),   icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.completed   ?? 0 },
    { value: 'cancelled',  label: t('Cancelled'),   icon: <XCircle className="h-4 w-4" />,      count: statusCounts.cancelled   ?? 0 },
  ];

  // Prepare location type options for filter
  const locationTypeOptions = [
    { value: '_empty_', label: t('All Locations') },
    { value: 'physical', label: t('Physical') },
    { value: 'virtual', label: t('Virtual') }
  ];

  return (
    <PageTemplate
      title={t("Training Sessions")}
      description={t("Manage scheduled training sessions for your employees.")}
      url="/hr/training/sessions"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'location_type',
              label: t('Location Type'),
              type: 'select',
              value: selectedLocationType,
              onChange: setSelectedLocationType,
              options: locationTypeOptions
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
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={trainingSessions?.data || []}
          from={trainingSessions?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-training-sessions',
            create: 'create-training-sessions',
            edit: 'edit-training-sessions',
            delete: 'delete-training-sessions'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={trainingSessions?.from || 0}
          to={trainingSessions?.to || 0}
          total={trainingSessions?.total || 0}
          links={trainingSessions?.links}
          entityName={t("training sessions")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.training-sessions.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              location_type: selectedLocationType !== '_empty_' ? selectedLocationType : undefined,
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
              name: 'training_program_id',
              label: t('Training Program'),
              type: 'select',
              required: true,
              placeholder: t('Select Training Program'),
              options: trainingProgramOptions.filter(opt => opt.value !== '_empty_')
            },
            {
              name: 'name',
              label: t('Session Name'),
              type: 'text',
              placeholder: t('e.g. Morning Batch - Week 1'),
              helpText: t('Leave blank to use program name')
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
              name: 'location_type',
              label: t('Location Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Location Type'),
              options: [
                { value: 'physical', label: t('Physical') },
                { value: 'virtual', label: t('Virtual') }
              ]
            },
            {
              name: 'location',
              label: t('Location'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Conference Room A, Head Office'),
              showWhen: (formData) => formData.location_type === 'physical'
            },
            {
              name: 'meeting_link',
              label: t('Meeting Link'),
              type: 'text',
              required: true,
              placeholder: t('e.g. https://meet.google.com/abc-xyz'),
              showWhen: (formData) => formData.location_type === 'virtual'
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'scheduled', label: t('Scheduled') },
                { value: 'in_progress', label: t('In Progress') },
                { value: 'completed', label: t('Completed') },
                { value: 'cancelled', label: t('Cancelled') }
              ]
            },
            {
              name: 'notes',
              label: t('Notes'),
              type: 'textarea',
              placeholder: t('e.g. Bring your laptop and training materials...')
            },
            {
              name: 'trainer_ids',
              label: t('Trainers'),
              type: 'multi-select',
              required: true,
              options: (employees || []).map((employee: any) => ({
                value: employee.id.toString(),
                label: `${employee.name} (${employee.employee_id})`
              })),
              helpText: t('Select one or more trainers for this session')
            },
            {
              name: 'is_recurring',
              label: t('Recurring Session'),
              type: 'checkbox',
              showWhen: (formData) => formMode === 'create'
            },
            {
              name: 'recurrence_pattern',
              label: t('Recurrence Pattern'),
              type: 'select',
              required: true,
              placeholder: t('Select Recurrence Pattern'),
              conditional: (mode, formData) => !!formData.is_recurring,
              options: [
                { value: 'daily', label: t('Daily') },
                { value: 'weekly', label: t('Weekly') },
                { value: 'monthly', label: t('Monthly') }
              ],
              showWhen: (formData) => formData.is_recurring
            },
            {
              name: 'recurrence_count',
              label: t('Number of Occurrences'),
              type: 'number',
              required: true,
              min: 1,
              max: 52,
              placeholder: t('e.g. 4'),
              conditional: (mode, formData) => !!formData.is_recurring,
              showWhen: (formData) => formData.is_recurring
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          start_date: currentItem.start_date ? currentItem.start_date.split(' ')[0] : '',
          start_time: currentItem.start_date ? currentItem.start_date.split(' ')[1]?.substring(0, 5) : '',
          end_date: currentItem.end_date ? currentItem.end_date.split(' ')[0] : '',
          end_time: currentItem.end_date ? currentItem.end_date.split(' ')[1]?.substring(0, 5) : '',
          trainer_ids: currentItem.trainers?.map((trainer: any) => trainer.id.toString())
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Training Session')
            : formMode === 'edit'
              ? t('Edit Training Session')
              : t('View Training Session')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || currentItem?.training_program?.name || ''}
        entityName="training session"
      />
    </PageTemplate>
  );
}
