// pages/hr/terminations/index.tsx
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
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { Plus, FileText, LayoutGrid, CalendarClock, Loader2, BadgeCheck } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import MediaPicker from '@/components/MediaPicker';
import { getImagePath } from '@/utils/helpers';

export default function Terminations() {
  const { t } = useTranslation();
  const { auth, terminations, employees, terminationTypes, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedTerminationType, setSelectedTerminationType] = useState(pageFilters.termination_type || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedEmployee !== '_empty_' ||
      selectedTerminationType !== '_empty_' ||
      selectedStatus !== '_empty_' ||
      dateFrom !== undefined ||
      dateTo !== undefined ||
      searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedEmployee !== '_empty_' ? 1 : 0) +
      (selectedTerminationType !== '_empty_' ? 1 : 0) +
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
    router.get(route('hr.terminations.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      termination_type: selectedTerminationType !== '_empty_' ? selectedTerminationType : undefined,
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
    router.get(route('hr.terminations.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      termination_type: selectedTerminationType !== '_empty_' ? selectedTerminationType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.terminations.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      termination_type: selectedTerminationType !== '_empty_' ? selectedTerminationType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
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
      case 'change-status':
        setIsStatusModalOpen(true);
        break;
      case 'download-document':
        window.open(route('hr.terminations.download-document', item.id), '_blank');
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating termination...'));

      router.post(route('hr.terminations.store'), data, {
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
            toast.error(t('Failed to create termination: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating termination...'));

      router.put(route('hr.terminations.update', currentItem.id), data, {
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
            toast.error(t('Failed to update termination: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleStatusChange = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating termination status...'));

    router.put(route('hr.terminations.change-status', currentItem.id), formData, {
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
          toast.error(t('Failed to update termination status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting termination...'));

    router.delete(route('hr.terminations.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete termination: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.terminations.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedTerminationType, selectedStatus, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Termination" button if user has permission
  if (hasPermission(permissions, 'create-terminations')) {
    pageActions.push({
      label: t('Add Termination'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employee Lifecycle') },
    { title: t('Terminations') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'employee.name',
      label: t('Employee'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
            {row.employee?.avatar ? (
              <img src={row.employee.avatar} alt={row.employee?.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(row.employee?.name || '')
            )}
          </div>
          <div>
            <div className="font-medium">{row.employee?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.employee?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'termination_type',
      label: t('Type'),
      render: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '-'
    },
    {
      key: 'termination_date',
      label: t('Termination Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'notice_date',
      label: t('Notice Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => {
        const statusClasses = {
          'planned': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          'in progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
          'completed': 'bg-green-50 text-green-700 ring-green-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[value] || ''}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'documents',
      label: t('Documents'),
      render: (value, row) => value && value.trim() !== '' ? (
        <a
          href={getImagePath(value)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition-colors"
          title={t('View Document')}
        >
          <FileText className="h-4 w-4" />
        </a>
      ) : '-'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-terminations'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-terminations'
    },
    {
      label: t('Change Status'),
      icon: 'RefreshCw',
      action: 'change-status',
      className: 'text-green-500',
      requiredPermission: ['approve-terminations', 'reject-terminations']
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-terminations'
    }
  ];

  // Prepare employee options for filter
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} (${emp.employee_id})`
    }))
  ];

  // Prepare termination type options for filter
  const terminationTypeOptions = [
    { value: '_empty_', label: t('All Types') },
    ...(terminationTypes || []).map((type: string) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  ];

  // Prepare status options for filter
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'planned', label: t('Planned'), icon: <CalendarClock className="h-4 w-4" />, count: statusCounts.planned ?? 0 },
    { value: 'in progress', label: t('In Progress'), icon: <Loader2 className="h-4 w-4" />, count: statusCounts['in progress'] ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
  ];

  // Prepare termination type options for form
  const terminationTypeFormOptions = [
    { value: 'Voluntary', label: t('Voluntary') },
    { value: 'Involuntary', label: t('Involuntary') },
    { value: 'Layoff', label: t('Layoff') },
    { value: 'Retirement', label: t('Retirement') },
    { value: 'Contract Completion', label: t('Contract Completion') },
    { value: 'Probation Failure', label: t('Probation Failure') },
    { value: 'Misconduct', label: t('Misconduct') },
    { value: 'Performance Issues', label: t('Performance Issues') }
  ];

  return (
    <PageTemplate
      title={t("Terminations")}
      description={t("Manage employee termination records and details.")}
      url="/hr/terminations"
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
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          filters={[
            // ...(hasPermission(permissions, 'manage-any-terminations') ? [{
            //   name: 'employee_id',
            //   label: t('Employee'),
            //   type: 'select',
            //   value: selectedEmployee,
            //   onChange: setSelectedEmployee,
            //   options: employeeOptions,
            //   searchable: true
            // }] : []),
            {
              name: 'termination_type',
              label: t('Type'),
              type: 'select',
              value: selectedTerminationType,
              onChange: setSelectedTerminationType,
              options: terminationTypeOptions
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
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={terminations?.data || []}
          from={terminations?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-terminations',
            create: 'create-terminations',
            edit: 'edit-terminations',
            delete: 'delete-terminations'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={terminations?.from || 0}
          to={terminations?.to || 0}
          total={terminations?.total || 0}
          links={terminations?.links}
          entityName={t("terminations")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.terminations.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
              termination_type: selectedTerminationType !== '_empty_' ? selectedTerminationType : undefined,
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
              name: 'termination_type',
              label: t('Termination Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Termination Type'),
              options: terminationTypeFormOptions,
              searchable: true
            },
            {
              name: 'notice_date',
              label: t('Notice Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Notice Date')
            },
            {
              name: 'termination_date',
              label: t('Termination Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Termination Date')
            },
            {
              name: 'notice_period',
              label: t('Notice Period'),
              type: 'text',
              placeholder: t('e.g. 1 month, 2 weeks')
            },
            {
              name: 'reason',
              label: t('Reason'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Performance issues, Misconduct')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. Additional details about the termination...')
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
            ...(formMode === 'edit' ? [
              {
                name: 'status',
                label: t('Status'),
                type: 'select',
                required: true,
                placeholder: t('Select Status'),
                options: [
                  { value: 'planned', label: t('Planned') },
                  { value: 'in progress', label: t('In Progress') },
                  { value: 'completed', label: t('Completed') }
                ]
              },
              {
                name: 'exit_interview_conducted',
                label: t('Exit Interview Conducted'),
                type: 'checkbox'
              },
              {
                name: 'exit_interview_date',
                label: t('Exit Interview Date'),
                type: 'date',
                placeholder: t('Select Exit Interview Date'),
                showWhen: (formData) => formData.exit_interview_conducted
              },
              {
                name: 'exit_feedback',
                label: t('Exit Feedback'),
                type: 'textarea',
                placeholder: t('e.g. Employee feedback during exit interview...'),
                showWhen: (formData) => formData.status === 'completed'
              }
            ] : [])
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          notice_date: currentItem.notice_date ? window.appSettings.formatDateTimeSimple(currentItem.notice_date, false) : currentItem.notice_date,
          termination_date: currentItem.termination_date ? window.appSettings.formatDateTimeSimple(currentItem.termination_date, false) : currentItem.termination_date
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Termination')
            : t('Edit Termination')
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
                { value: 'in progress', label: t('In Progress') },
                { value: 'completed', label: t('Completed') }
              ],
              defaultValue: currentItem?.status
            },
            {
              name: 'exit_interview_conducted',
              label: t('Exit Interview Conducted'),
              type: 'checkbox',
              showWhen: (formData) => formData.status === 'completed'
            },
            {
              name: 'exit_interview_date',
              label: t('Exit Interview Date'),
              type: 'date',
              placeholder: t('Select Exit Interview Date'),
              showWhen: (formData) => formData.status === 'completed' && formData.exit_interview_conducted
            },
            {
              name: 'exit_feedback',
              label: t('Exit Feedback'),
              type: 'textarea',
              placeholder: t('e.g. Employee feedback during exit interview...'),
              showWhen: (formData) => formData.status === 'completed'
            }
          ],
          modalSize: 'md'
        }}
        initialData={currentItem}
        title={t('Change Termination Status')}
        mode="edit"
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name || ''}`}
        entityName="termination"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View termination={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
