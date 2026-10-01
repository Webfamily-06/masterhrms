import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
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
import { Plus, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function JobLocations() {
  const { t } = useTranslation();
  const { auth, jobLocations, filters: pageFilters = {}, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [remoteFilter, setRemoteFilter] = useState(pageFilters.is_remote || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return statusFilter !== '_empty_' || remoteFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (statusFilter !== '_empty_' ? 1 : 0) + (remoteFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.recruitment.job-locations.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_remote: remoteFilter !== '_empty_' ? remoteFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.recruitment.job-locations.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_remote: remoteFilter !== '_empty_' ? remoteFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.recruitment.job-locations.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_remote: remoteFilter !== '_empty_' ? remoteFilter : undefined,
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
        router.put(route('hr.recruitment.job-locations.toggle-status', item.id), {}, {
          onSuccess: (page) => {
            if (page.props.flash.success) {
              toast.success(t(page.props.flash.success));
            } else if (page.props.flash.error) {
              toast.error(t(page.props.flash.error));
            }
          },
          onError: (errors) => {
            if (typeof errors === 'string') {
              toast.error(t(errors));
            } else {
              toast.error(t('Failed to update status: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
          }
        });
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
      router.post(route('hr.recruitment.job-locations.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (typeof errors === 'string') {
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to create job location: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      router.put(route('hr.recruitment.job-locations.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (typeof errors === 'string') {
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to update job location: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    router.delete(route('hr.recruitment.job-locations.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete job location: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.recruitment.job-locations.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-job-locations')) {
    pageActions.push({
      label: t('Add Job Location'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Job Locations') }
  ];

  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value) => <div className="font-medium">{value}</div>
    },
    {
      key: 'address',
      label: t('Address'),
      render: (value, row) => {
        if (row.is_remote) {
          return <span className="text-blue-600 font-medium">{t('Remote Work')}</span>;
        }
        const parts = [value, row.city, row.state, row.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : '-';
      }
    },
    {
      key: 'is_remote',
      label: t('Type'),
      render: (value) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${value
          ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
          : 'bg-gray-50 text-gray-600 ring-gray-500/10'
          }`}>
          {value ? t('Remote') : t('On-site')}
        </span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium  ${value === 'active'
          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}>
          {value === 'active' ? t('Active') : t('Inactive')}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('Created At'),
      sortable: true,
      type: 'date'
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-job-locations'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-job-locations'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-job-locations'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-job-locations'
    }
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
  ];

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, statusFilter, remoteFilter]);

  const statusOptions = [
    { value: '_empty_', label: t('All Statuses') },
    { value: 'active', label: t('Active') },
    { value: 'inactive', label: t('Inactive') }
  ];

  const remoteOptions = [
    { value: '_empty_', label: t('All Types') },
    { value: 'true', label: t('Remote') },
    { value: 'false', label: t('On-site') }
  ];

  return (
    <PageTemplate
      title={t("Job Locations")}
      description={t("Manage job locations where positions are available.")}
      url="/hr/recruitment/job-locations"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'is_remote',
              label: t('Type'),
              type: 'select',
              value: remoteFilter,
              onChange: setRemoteFilter,
              options: remoteOptions
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

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={jobLocations?.data || []}
          from={jobLocations?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-job-locations',
            create: 'create-job-locations',
            edit: 'edit-job-locations',
            delete: 'delete-job-locations'
          }}
        />

        <Pagination
          from={jobLocations?.from || 0}
          to={jobLocations?.to || 0}
          total={jobLocations?.total || 0}
          links={jobLocations?.links}
          entityName={t("job locations")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.recruitment.job-locations.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: statusFilter !== '_empty_' ? statusFilter : undefined,
              is_remote: remoteFilter !== '_empty_' ? remoteFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'name',
              label: t('Name'),
              type: 'text',
              required: true,
              placeholder: t('e.g. New York Office')
            },
            {
              name: 'is_remote',
              label: t('Remote Work'),
              type: 'checkbox'
            },
            {
              name: 'address',
              label: t('Address'),
              type: 'textarea',
              placeholder: t('e.g. 123 Main Street, Suite 100')
            },
            {
              name: 'city',
              label: t('City'),
              type: 'text',
              placeholder: t('e.g. New York')
            },
            {
              name: 'state',
              label: t('State'),
              type: 'text',
              placeholder: t('e.g. California')
            },
            {
              name: 'country',
              label: t('Country'),
              type: 'text',
              required: true,
              placeholder: t('e.g. United States')
            },
            {
              name: 'postal_code',
              label: t('Postal Code'),
              type: 'text',
              placeholder: t('e.g. 10001')
            },
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
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Job Location')
            : t('Edit Job Location')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="job location"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View jobLocation={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
