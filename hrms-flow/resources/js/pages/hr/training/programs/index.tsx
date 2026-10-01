// pages/hr/training/programs/index.tsx
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
import { Plus, Download, LayoutGrid, FileEdit, CheckCircle2, BadgeCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MediaPicker from '@/components/MediaPicker';

export default function TrainingPrograms() {
  const { t } = useTranslation();
  const { auth, trainingPrograms, statusCounts = {}, trainingTypes, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedType, setSelectedType] = useState(pageFilters.training_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [isMandatory, setIsMandatory] = useState(pageFilters.is_mandatory === 'true');
  const [isSelfEnrollment, setIsSelfEnrollment] = useState(pageFilters.is_self_enrollment === 'true');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedType, selectedStatus, isMandatory, isSelfEnrollment]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedType !== '_empty_' ||
           selectedStatus !== '_empty_' ||
           isMandatory ||
           isSelfEnrollment ||
           searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedType !== '_empty_' ? 1 : 0) +
           (selectedStatus !== '_empty_' ? 1 : 0) +
           (isMandatory ? 1 : 0) +
           (isSelfEnrollment ? 1 : 0) +
           (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.training-programs.index'), {
      page: 1,
      search: searchTerm || undefined,
      training_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      is_mandatory: isMandatory ? 'true' : undefined,
      is_self_enrollment: isSelfEnrollment ? 'true' : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.training-programs.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      training_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      is_mandatory: isMandatory ? 'true' : undefined,
      is_self_enrollment: isSelfEnrollment ? 'true' : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.training-programs.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      training_type_id: selectedType !== '_empty_' ? selectedType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      is_mandatory: isMandatory ? 'true' : undefined,
      is_self_enrollment: isSelfEnrollment ? 'true' : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.training-programs.show', item.id));
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'download-materials':
        window.open(route('hr.training-programs.download-materials', item.id), '_blank');
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating training program...'));

      router.post(route('hr.training-programs.store'), data, {
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
            toast.error(t('Failed to create training program: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating training program...'));

      router.put(route('hr.training-programs.update', currentItem.id), data, {
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
            toast.error(t('Failed to update training program: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting training program...'));

    router.delete(route('hr.training-programs.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete training program: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.training-programs.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Training Program" button if user has permission
  if (hasPermission(permissions, 'create-training-programs')) {
    pageActions.push({
      label: t('Add Training Program'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Training & Development') },
    { title: t('Training Programs') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.training_type?.name || '-'}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      sortable: true,
      render: (value) => {
        const statusClasses = {
          'draft': 'bg-gray-50 text-gray-700 ring-gray-600/20',
          'active': 'bg-green-50 text-green-700 ring-green-600/20',
          'completed': 'bg-blue-50 text-blue-700 ring-blue-600/20',
          'cancelled': 'bg-red-50 text-red-700 ring-red-600/20'
        };

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[value] || ''}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'duration',
      label: t('Duration'),
      sortable: true,
      render: (value) => value ? `${value} ${t('hours')}` : '-'
    },
    {
      key: 'cost',
      label: t('Cost'),
      sortable: true,
      render: (value) => value ? <span className="font-mono">{window.appSettings?.formatCurrency(parseFloat(value))}</span> : '-'
    },
    {
      key: 'capacity',
      label: t('Capacity'),
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'flags',
      label: t('Flags'),
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.is_mandatory && (
            <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
              {t('Mandatory')}
            </Badge>
          )}
          {row.is_self_enrollment && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              {t('Self-Enrollment')}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'sessions_count',
      label: t('Sessions'),
      render: (value) => value || '0'
    },
    {
      key: 'employee_trainings_count',
      label: t('Employees'),
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
      requiredPermission: 'view-training-programs'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-training-programs'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-training-programs'
    }
  ];


  // Prepare training type options for filter
  const trainingTypeOptions = [
    { value: '_empty_', label: t('All Types') },
    ...(trainingTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: `${type.name} (${type.branch?.name || 'No Branch'} - ${type.departments?.map((d: any) => d.name).join(', ') || 'No Departments'})`
    }))
  ];

  // Prepare status options for filter
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'draft', label: t('Draft'), icon: <FileEdit className="h-4 w-4" />, count: statusCounts.draft ?? 0 },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
    { value: 'cancelled', label: t('Cancelled'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.cancelled ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Training Programs")}
      description={t("Manage training programs available for your employees.")}
      url="/hr/training/programs"
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
              name: 'training_type_id',
              label: t('Training Type'),
              type: 'select',
              value: selectedType,
              onChange: setSelectedType,
              options: trainingTypeOptions,
              searchable : true,
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
          data={trainingPrograms?.data || []}
          from={trainingPrograms?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-training-programs',
            create: 'create-training-programs',
            edit: 'edit-training-programs',
            delete: 'delete-training-programs'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={trainingPrograms?.from || 0}
          to={trainingPrograms?.to || 0}
          total={trainingPrograms?.total || 0}
          links={trainingPrograms?.links}
          entityName={t("training programs")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.training-programs.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              training_type_id: selectedType !== '_empty_' ? selectedType : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              is_mandatory: isMandatory ? 'true' : undefined,
              is_self_enrollment: isSelfEnrollment ? 'true' : undefined,
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
              name: 'name',
              label: t('Name'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Advanced Leadership Program')
            },
            {
              name: 'training_type_id',
              label: t('Training Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Training Type'),
              searchable: true,
              options: (trainingTypes || []).map((type: any) => ({
                value: type.id.toString(),
                label: `${type.name} (${type.branch?.name || 'No Branch'} - ${type.departments?.map((d: any) => d.name).join(', ') || 'No Departments'})`
              }))
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. A comprehensive program designed to develop leadership skills...')
            },
            {
              name: 'duration',
              label: t('Duration (hours)'),
              type: 'number',
              required: true,
              min: 1,
              placeholder: t('e.g. 8')
            },
            {
              name: 'cost',
              label: t('Cost'),
              type: 'number',
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 500.00')
            },
            {
              name: 'capacity',
              label: t('Capacity'),
              type: 'number',
              required: true,
              min: 1,
              placeholder: t('e.g. 20')
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'draft', label: t('Draft') },
                { value: 'active', label: t('Active') },
                { value: 'completed', label: t('Completed') },
                { value: 'cancelled', label: t('Cancelled') }
              ]
            },
            {
              name: 'materials',
              label: t('Materials'),
              type: 'custom',
              render: (field, formData, handleChange) => (
                <MediaPicker
                  value={String(formData[field.name] || '')}
                  onChange={(url) => handleChange(field.name, url)}
                  placeholder={t('Select materials file...')}
                />
              ),
              helpText: t('Upload PDF, Word or ZIP file (max 10MB)')
            },
            {
              name: 'prerequisites',
              label: t('Prerequisites'),
              type: 'textarea',
              placeholder: t('e.g. Basic computer skills, completion of onboarding training...')
            },
            {
              name: 'is_mandatory',
              label: t('Mandatory Training'),
              type: 'checkbox',
              helpText: t('Mark this training as mandatory for employees')
            },
            {
              name: 'is_self_enrollment',
              label: t('Allow Self-Enrollment'),
              type: 'checkbox',
              helpText: t('Allow employees to enroll themselves in this training')
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Training Program')
            : formMode === 'edit'
              ? t('Edit Training Program')
              : t('View Training Program')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="training program"
      />
    </PageTemplate>
  );
}
