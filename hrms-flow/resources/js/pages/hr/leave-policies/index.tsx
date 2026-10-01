// pages/hr/leave-policies/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
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

export default function LeavePolicies() {
  const { t } = useTranslation();
  const { auth, leavePolicies, leaveTypes, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedLeaveType, setSelectedLeaveType] = useState(pageFilters.leave_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedLeaveType !== '_empty_' || selectedStatus !== '_empty_';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedLeaveType !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.leave-policies.index'), {
      page: 1,
      search: searchTerm || undefined,
      leave_type_id: selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.leave-policies.index'), {
      page,
      search: searchTerm || undefined,
      leave_type_id: selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.leave-policies.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      leave_type_id: selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
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
      if (!globalSettings?.is_demo) {
        toast.loading(t('Creating leave policy...'));
      }

      router.post(route('hr.leave-policies.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) {
            toast.dismiss();
          }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) {
            toast.dismiss();
          }
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create leave policy: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Updating leave policy...'));
      }

      router.put(route('hr.leave-policies.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) {
            toast.dismiss();
          }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) {
            toast.dismiss();
          }
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update leave policy: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting leave policy...'));
    }

    router.delete(route('hr.leave-policies.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete leave policy: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleToggleStatus = (leavePolicy: any) => {
    const newStatus = leavePolicy.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) {
      toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} leave policy...`);
    }

    router.put(route('hr.leave-policies.toggle-status', leavePolicy.id), {}, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update leave policy status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.leave-policies.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Leave Policy" button if user has permission
  if (hasPermission(permissions, 'create-leave-policies')) {
    pageActions.push({
      label: t('Add Leave Policy'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Leave Management') },
    { title: t('Leave Policies') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Policy Name'),
      sortable: true
    },
    {
      key: 'leave_type',
      label: t('Leave Type'),
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: row.leave_type?.color }}
          />
          <span>{row.leave_type?.name || '-'}</span>
        </div>
      )
    },
    // {
    //   key: 'accrual_rate',
    //   label: t('Accrual'),
    //   render: (value: number, row: any) => (
    //     <span className="font-mono">{value} days/{row.accrual_type}</span>
    //   )
    // },
    {
      key: 'carry_forward_limit',
      label: t('Carry Forward'),
      render: (value: number) => (
        <span className="font-mono">{value} days</span>
      )
    },
    {
      key: 'requires_approval',
      label: t('Approval'),
      render: (value: boolean) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value
          ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
          : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          }`}>
          {value ? t('Required') : t('Not Required')}
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
    },
    {
      key: 'created_at',
      label: t('Created At'),
      sortable: true,
      type: 'date'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-leave-policies'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-leave-policies'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-leave-policies'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-leave-policies'
    }
  ];

  // Prepare leave type options for filter and form
  const leaveTypeOptions = [
    { value: '_empty_', label: t('All Leave Types'), disabled: true },
    ...(leaveTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_',  label: t('All'),      icon: <LayoutGrid className="h-4 w-4" />,   count: statusCounts.all      ?? (leavePolicies?.total || 0) },
    { value: 'active',   label: t('Active'),   icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active   ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />,      count: statusCounts.inactive ?? 0 },
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedLeaveType, selectedStatus]);

  return (
    <PageTemplate
      title={t("Leave Policies")}
      description={t("Manage leave policies for your organization.")}
      url="/hr/leave-policies"
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
              name: 'leave_type_id',
              label: t('Leave Type'),
              type: 'select',
              value: selectedLeaveType,
              onChange: setSelectedLeaveType,
              options: leaveTypeOptions,
              searchable: true
            },
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
          data={leavePolicies?.data || []}
          from={leavePolicies?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-leave-policies',
            create: 'create-leave-policies',
            edit: 'edit-leave-policies',
            delete: 'delete-leave-policies'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={leavePolicies?.from || 0}
          to={leavePolicies?.to || 0}
          total={leavePolicies?.total || 0}
          links={leavePolicies?.links}
          entityName={t("leave policies")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.leave-policies.index'), {
              page: 1,
              per_page: value,
              search: searchTerm || undefined,
              leave_type_id: selectedLeaveType !== '_empty_' ? selectedLeaveType : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
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
            { name: 'name', label: t('Policy Name'), type: 'text', required: true, placeholder: t('e.g. Annual Leave Policy') },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Standard annual leave policy for all employees...') },
            {
              name: 'leave_type_id',
              label: t('Leave Type'),
              type: 'select',
              required: true,
              searchable: true,
              placeholder: t('Select Leave Type'),
              options: leaveTypes ? leaveTypes.map((type: any) => ({
                value: type.id.toString(),
                label: type.name
              })) : []
            },
            { name: 'carry_forward_limit', label: t('Carry Forward Limit (Days)'), type: 'number', required: true, min: 0, placeholder: t('e.g. 10') },
            { name: 'min_days_per_application', label: t('Min Days Per Application'), type: 'number', required: true, min: 1, placeholder: t('e.g. 1') },
            { name: 'max_days_per_application', label: t('Max Days Per Application'), type: 'number', required: true, min: 1, placeholder: t('e.g. 14') },
            { name: 'requires_approval', label: t('Requires Approval'), type: 'checkbox', defaultValue: true },
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
            ? t('Add New Leave Policy')
            : t('Edit Leave Policy')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="leave policy"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View leavePolicy={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
