// pages/hr/resignations/index.tsx
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
import { useInitials } from '@/hooks/use-initials';
import { getImagePath } from '@/utils/helpers';
import { Plus, FileText, LayoutGrid, Clock, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

export default function Resignations() {
  const { t } = useTranslation();
  const { auth, resignations, employees, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
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
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedEmployee !== '_empty_' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined || searchTerm !== '';
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
    router.get(route('hr.resignations.index'), {
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
    router.get(route('hr.resignations.index'), {
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

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.resignations.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
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
        window.open(route('hr.resignations.download-document', item.id), '_blank');
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating resignation...'));

      router.post(route('hr.resignations.store'), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Resignation created successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(t(errors));
          } else {
            toast.error(t(`Failed to create resignation: ${Object.values(errors).join(', ')}`));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating resignation...'));

      router.put(route('hr.resignations.update', currentItem.id), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Resignation updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(t(`Failed to update resignation: ${Object.values(errors).join(', ')}`));
          }
        }
      });
    }
  };

  const handleStatusChange = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating resignation status...'));

    router.put(route('hr.resignations.change-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Resignation status updated successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(t(`Failed to update resignation status: ${Object.values(errors).join(', ')}`));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting resignation...'));

    router.delete(route('hr.resignations.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Resignation deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(t(`Failed to delete resignation: ${Object.values(errors).join(', ')}`));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.resignations.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedStatus, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Resignation" button if user has permission
  if (hasPermission(permissions, 'create-resignations')) {
    pageActions.push({
      label: t('Add Resignation'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employee Lifecycle') },
    { title: t('Resignations') }
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
      key: 'resignation_date',
      label: t('Resignation Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'last_working_day',
      label: t('Last Working Day'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'notice_period',
      label: t('Notice Period'),
      render: (value) => value || '-'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => {
        const statusClasses = {
          pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          approved: 'bg-green-50 text-green-700 ring-green-600/20',
          rejected: 'bg-red-50 text-red-700 ring-red-600/20',
          completed: 'bg-blue-50 text-blue-700 ring-blue-600/20'
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
      requiredPermission: 'view-resignations'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-resignations'
    },
    {
      label: t('Change Status'),
      icon: 'RefreshCw',
      action: 'change-status',
      className: 'text-green-500',
      requiredPermission: ['approve-resignations','reject-resignations']
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-resignations'
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

  // Prepare status options for filter
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'pending', label: t('Pending'), icon: <Clock className="h-4 w-4" />, count: statusCounts.pending ?? 0 },
    { value: 'approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.approved ?? 0 },
    { value: 'rejected', label: t('Rejected'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.rejected ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Resignations")}
      description={t("View and manage employee resignation requests.")}
      url="/hr/resignations"
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
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable : true,
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
          data={resignations?.data || []}
          from={resignations?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-resignations',
            create: 'create-resignations',
            edit: 'edit-resignations',
            delete: 'delete-resignations'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={resignations?.from || 0}
          to={resignations?.to || 0}
          total={resignations?.total || 0}
          links={resignations?.links}
          entityName={t("resignations")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.resignations.index'), {
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
              searchable: true,
            },
            {
              name: 'resignation_date',
              label: t('Resignation Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Resignation Date')
            },
            {
              name: 'reason',
              label: t('Reason'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Personal reasons, Better opportunity')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. Additional details about the resignation...')
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
                name: 'last_working_day',
                label: t('Last Working Day'),
                type: 'date',
                required: true,
                placeholder: t('Select Last Working Day')
              },
              {
                name: 'notice_period',
                label: t('Notice Period'),
                type: 'text',
                required: true,
                placeholder: t('e.g. 1 month, 2 weeks')
              },
              {
                name: 'status',
                label: t('Status'),
                type: 'select',
                required: true,
                placeholder: t('Select Status'),
                options: [
                  { value: 'pending', label: t('Pending') },
                  { value: 'approved', label: t('Approved') },
                  { value: 'rejected', label: t('Rejected') },
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
          employee_id: currentItem.employee_id?.toString() || currentItem.employee?.id?.toString() || '',
          resignation_date: currentItem.resignation_date ? currentItem.resignation_date.split('T')[0] : '',
          last_working_day: currentItem.last_working_day ? currentItem.last_working_day.split('T')[0] : '',
          exit_interview_date: currentItem.exit_interview_date ? currentItem.exit_interview_date.split('T')[0] : ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Resignation')
            : t('Edit Resignation')
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
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'rejected', label: t('Rejected') },
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
        title={t('Change Resignation Status')}
        mode="edit"
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name || ''}`}
        entityName="resignation"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View resignation={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
