// pages/hr/performance/indicators/index.tsx
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
import { Plus, Tag, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';

export default function PerformanceIndicators() {
  const { t } = useTranslation();
  const { auth, indicators, categories, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [selectedCategory, setSelectedCategory] = useState(pageFilters.category_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedStatus !== '_empty_' || searchTerm !== '' || selectedCategory !== '_empty_';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedStatus !== '_empty_' ? 1 : 0) + (searchTerm ? 1 : 0) + (selectedCategory !== '_empty_' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.performance.indicators.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.performance.indicators.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.performance.indicators.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating performance indicator...'));

      router.post(route('hr.performance.indicators.store'), formData, {
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
            toast.error(t('Failed to create indicator: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating performance indicator...'));

      router.put(route('hr.performance.indicators.update', currentItem.id), formData, {
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
            toast.error(t('Failed to update indicator: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting performance indicator...'));

    router.delete(route('hr.performance.indicators.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete indicator: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleToggleStatus = (indicator: any) => {
    const newStatus = indicator.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} indicator...`);

    router.put(route('hr.performance.indicators.toggle-status', indicator.id), {}, {
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update indicator status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.performance.indicators.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedStatus, selectedCategory]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Indicator" button if user has permission
  if (hasPermission(permissions, 'create-performance-indicators')) {
    pageActions.push({
      label: t('Add Indicator'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },

    { title: t('Performance Management') },
    { title: t('Indicators') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value: any, row: any) => {
        return (
            <div>
                <div className="font-medium">{value}</div>
                {row.category?.name ?
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                    <Tag className="h-3 w-3 mr-1" />
                    {t(row.category?.name)}
                </span> : <span>-</span>}
            </div>);
      }
    },
    {
      key: 'measurement_unit',
      label: t('Measurement Unit'),
      render: (value: string) => {
        return (
          <span className='inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'>
            {value}
          </span>
        );
      }
    },
    {
      key: 'target_value',
      label: t('Target Value'),
      render: (value: string) => value || '-'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            value === 'active'
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
      requiredPermission: 'view-performance-indicators'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-performance-indicators'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-performance-indicators'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-performance-indicators'
    }
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (indicators?.total || 0) },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
  ];

  // Prepare category options
  const categoryOptions = [
    { value: '_empty_', label: t('All Categories') },
    ...(categories || []).map((category: any) => ({
      value: category.id.toString(),
      label: category.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Indicators")}
      description={t("Manage performance indicators used in employee evaluations.")}
      url="/hr/performance/indicators"
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
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              value: selectedCategory,
              onChange: setSelectedCategory,
              options: categoryOptions,
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
          data={indicators?.data || []}
          from={indicators?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-performance-indicators',
            create: 'create-performance-indicators',
            edit: 'edit-performance-indicators',
            delete: 'delete-performance-indicators'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={indicators?.from || 0}
          to={indicators?.to || 0}
          total={indicators?.total || 0}
          links={indicators?.links}
          entityName={t("performance indicators")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.performance.indicators.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              category_id: selectedCategory !== '_empty_' ? selectedCategory : undefined,
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
            { name: 'name', label: t('Indicator Name'), type: 'text', required: true, placeholder: t('e.g. Communication Skills') },
            {
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              required: true,
              searchable: true,
              placeholder: t('Select Category'),
              options: categories.map((category: any) => ({
                value: category.id.toString(),
                label: category.name
              }))
            },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Measures the ability to communicate effectively...') },
            { name: 'measurement_unit', label: t('Measurement Unit'), type: 'text', required: true, placeholder: t('e.g. Rating 1-5, Percentage, etc.') },
            { name: 'target_value', label: t('Target Value'), type: 'text', required: true, placeholder: t('e.g. 4, 95%, etc.') },
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
          modalSize: 'md'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Performance Indicator')
            : t('Edit Performance Indicator')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="performance indicator"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View indicator={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
