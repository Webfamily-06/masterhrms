// pages/hr/training/assessments/index.tsx
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
import { Plus, LayoutGrid, HelpCircle, Wrench, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrainingAssessments() {
  const { t } = useTranslation();
  const { auth, trainingAssessments, typeCounts = {}, trainingPrograms, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedProgram, setSelectedProgram] = useState(pageFilters.training_program_id || '_empty_');
  const [selectedType, setSelectedType] = useState(pageFilters.type || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedProgram, selectedType]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedProgram !== '_empty_' || selectedType !== '_empty_' || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedProgram !== '_empty_' ? 1 : 0) + (selectedType !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.training-assessments.index'), {
      page: 1,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      type: selectedType !== '_empty_' ? selectedType : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.training-assessments.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      type: selectedType !== '_empty_' ? selectedType : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.training-assessments.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
      type: selectedType !== '_empty_' ? selectedType : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.training-assessments.show', item.id));
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating assessment...'));

      router.post(route('hr.training-assessments.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Assessment created successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create assessment: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating assessment...'));

      router.put(route('hr.training-assessments.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Assessment updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update assessment: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting assessment...'));

    router.delete(route('hr.training-assessments.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Assessment deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete assessment: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.training-assessments.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Assessment" button if user has permission
  if (hasPermission(permissions, 'create-training-assessments')) {
    pageActions.push({
      label: t('Add Assessment'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Training & Development') },
    { title: t('Training Assessments') }
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
          <div className="text-xs text-gray-500">{row.training_program?.name || '-'}</div>
        </div>
      )
    },
    {
      key: 'type',
      label: t('Type'),
      sortable: true,
      render: (value) => {
        const typeClasses = {
          'quiz':         'bg-blue-100 text-blue-800 border-blue-200',
          'practical':    'bg-green-100 text-green-800 border-green-200',
          'presentation': 'bg-purple-100 text-purple-800 border-purple-200'
        };

        return (
          <Badge className={`${typeClasses[value] || 'bg-gray-100 text-gray-800 border-gray-200'} capitalize`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Badge>
        );
      }
    },
    {
      key: 'passing_score',
      label: t('Passing Score'),
      sortable: true,
      render: (value) => `${value}%`
    },
    {
      key: 'employee_results_count',
      label: t('Results'),
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
      requiredPermission: 'view-training-assessments'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-training-assessments'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-training-assessments'
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

  // Prepare assessment type options for filter
  const typeTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: typeCounts.all ?? 0 },
    { value: 'quiz', label: t('Quiz'), icon: <HelpCircle className="h-4 w-4" />, count: typeCounts.quiz ?? 0 },
    { value: 'practical', label: t('Practical'), icon: <Wrench className="h-4 w-4" />, count: typeCounts.practical ?? 0 },
    { value: 'presentation', label: t('Presentation'), icon: <Monitor className="h-4 w-4" />, count: typeCounts.presentation ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Training Assessments")}
      description={t("Manage assessments used to evaluate training outcomes.")}
      url="/hr/training/assessments"
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
          statusTabs={typeTabs}
          activeStatusTab={selectedType}
          onStatusTabChange={setSelectedType}
          filters={[
            {
              name: 'training_program_id',
              label: t('Training Program'),
              type: 'select',
              value: selectedProgram,
              onChange: setSelectedProgram,
              options: trainingProgramOptions
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
          data={trainingAssessments?.data || []}
          from={trainingAssessments?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-training-assessments',
            create: 'create-training-assessments',
            edit: 'edit-training-assessments',
            delete: 'delete-training-assessments'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={trainingAssessments?.from || 0}
          to={trainingAssessments?.to || 0}
          total={trainingAssessments?.total || 0}
          links={trainingAssessments?.links}
          entityName={t("assessments")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.training-assessments.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              training_program_id: selectedProgram !== '_empty_' ? selectedProgram : undefined,
              type: selectedType !== '_empty_' ? selectedType : undefined,
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
              searchable: true,
              options: trainingProgramOptions.filter(opt => opt.value !== '_empty_')
            },
            {
              name: 'name',
              label: t('Assessment Name'),
              type: 'text',
              required: true,
              placeholder: t('e.g. Coding Skills Assessment')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. This assessment evaluates the employee\'s coding skills...')
            },
            {
              name: 'type',
              label: t('Assessment Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Assessment Type'),
              options: [
                { value: 'quiz', label: t('Quiz') },
                { value: 'practical', label: t('Practical') },
                { value: 'presentation', label: t('Presentation') }
              ]
            },
            {
              name: 'passing_score',
              label: t('Passing Score (%)'),
              type: 'number',
              required: true,
              min: 0,
              max: 100,
              placeholder: t('e.g. 70'),
              defaultValue: 70
            },
            {
              name: 'criteria',
              label: t('Assessment Criteria'),
              type: 'textarea',
              placeholder: t('e.g. Employee must demonstrate proficiency in all core areas...'),
              helpText: t('Describe the criteria used to evaluate this assessment')
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Assessment')
            : formMode === 'edit'
              ? t('Edit Assessment')
              : t('View Assessment')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="assessment"
      />
    </PageTemplate>
  );
}
