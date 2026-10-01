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
import { Plus, Gift } from 'lucide-react';
import { format } from 'date-fns';
import MediaPicker from '@/components/MediaPicker';

export default function Awards() {
  const { t } = useTranslation();
  const { auth, awards, awardTypes, employees, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedAwardType, setSelectedAwardType] = useState(pageFilters.award_type_id || '_empty_');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedAwardType !== '_empty_' || selectedEmployee !== '_empty_' || dateFrom !== undefined || dateTo !== undefined || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedAwardType !== '_empty_' ? 1 : 0) +
           (selectedEmployee !== '_empty_' ? 1 : 0) +
           (dateFrom ? 1 : 0) +
           (dateTo ? 1 : 0) +
           (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.awards.index'), {
      page: 1,
      search: searchTerm || undefined,
      award_type_id: selectedAwardType !== '_empty_' ? selectedAwardType : undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.awards.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      award_type_id: selectedAwardType !== '_empty_' ? selectedAwardType : undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.awards.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      award_type_id: selectedAwardType !== '_empty_' ? selectedAwardType : undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
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
      case 'download-certificate':
        window.open(route('hr.awards.download-certificate', item.id), '_blank');
        break;
      case 'download-photo':
        window.open(route('hr.awards.download-photo', item.id), '_blank');
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
      if (!globalSettings?.is_demo) {
        toast.loading(t('Creating award...'));
      }

      router.post(route('hr.awards.store'), data, {
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
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to create award: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Updating award...'));
      }

      router.put(route('hr.awards.update', currentItem.id), data, {
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
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to update award: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting award...'));
    }

    router.delete(route('hr.awards.destroy', currentItem.id), {
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete award: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.awards.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedAwardType, selectedEmployee, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Award" button if user has permission
  if (hasPermission(permissions, 'create-awards')) {
    pageActions.push({
      label: t('Add Award'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employee Lifecycle') },
    { title: t('Awards') }
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
      key: 'award_type.name',
      label: t('Award Type'),
      render: (_,row) => (
        row.award_type?.name ?
        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
          {t(row.award_type?.name)}
        </span> : <span>-</span>
      )
    },
    {
      key: 'award_date',
      label: t('Award Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'gift',
      label: t('Gift'),
      render: (value) => value ? (
        <span className="inline-flex gap-1.5 items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-pink-50 text-pink-700 ring-pink-600/20">
          <Gift className="h-3 w-3 shrink-0" />
          {value}
        </span>
      ) : <span className="text-gray-400">—</span>
    },
    // {
    //   key: 'files',
    //   label: t('Files'),
    //   render: (_, row) => (
    //     <div className="flex space-x-2">
    //       {row.certificate && row.certificate.trim() !== '' && (
    //         <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 cursor-pointer"
    //               onClick={() => handleAction('download-certificate', row)}>
    //           {t('Certificate')}
    //         </span>
    //       )}
    //       {row.photo && row.photo.trim() !== '' && (
    //         <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 cursor-pointer"
    //               onClick={() => handleAction('download-photo', row)}>
    //           {t('Photo')}
    //         </span>
    //       )}
    //     </div>
    //   )
    // }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-awards'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-awards'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-awards'
    }
  ];

  // Prepare award type options for filter
  const awardTypeOptions = [
    { value: '_empty_', label: t('All Award Types'), disabled: true },
    ...(awardTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  // Prepare employee options for filter
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} (${emp.employee_id})`
    }))
  ];

  return (
    <PageTemplate
      title={t("Awards")}
      description={t("Manage awards and recognitions given to employees.")}
      url="/hr/awards"
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
              name: 'award_type_id',
              label: t('Award Type'),
              type: 'select',
              value: selectedAwardType,
              onChange: setSelectedAwardType,
              options: awardTypeOptions,
               searchable: true
            },
            ...(hasPermission(permissions, 'manage-any-awards') ? [{
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable: true
            }] : []),
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
          data={awards?.data || []}
          from={awards?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-awards',
            create: 'create-awards',
            edit: 'edit-awards',
            delete: 'delete-awards'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={awards?.from || 0}
          to={awards?.to || 0}
          total={awards?.total || 0}
          links={awards?.links}
          entityName={t("awards")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.awards.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              award_type_id: selectedAwardType !== '_empty_' ? selectedAwardType : undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
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
              searchable: true,
              placeholder: t('Select Employee'),
              options: employeeOptions.filter(opt => opt.value !== '_empty_')
            },
            {
              name: 'award_type_id',
              label: t('Award Type'),
              type: 'select',
              required: true,
              searchable: true,
              placeholder: t('Select Award Type'),
              options: awardTypeOptions.filter(opt => opt.value !== ''),
            },
            {
              name: 'award_date',
              label: t('Award Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Award Date')
            },
            {
              name: 'gift',
              label: t('Gift'),
              type: 'text',
              placeholder: t('e.g. Laptop, Gift Card, Trophy')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              required: true,
              placeholder: t('e.g. Awarded for outstanding performance...')
            },
            {
              name: 'certificate',
              label: t('Certificate'),
              type: 'custom',
              render: (field, formData, handleChange) => (
                <MediaPicker
                  value={String(formData[field.name] || '')}
                  onChange={(url) => handleChange(field.name, url)}
                  placeholder={t('Select certificate file...')}
                />
              )
            },
            {
              name: 'photo',
              label: t('Photo'),
              type: 'custom',
              render: (field, formData, handleChange) => (
                <MediaPicker
                  value={String(formData[field.name] || '')}
                  onChange={(url) => handleChange(field.name, url)}
                  placeholder={t('Select photo file...')}
                />
              )
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Award')
            : t('Edit Award')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name || ''} - ${currentItem?.award_type?.name || ''}`}
        entityName="award"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View award={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
