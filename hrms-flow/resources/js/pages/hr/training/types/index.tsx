// pages/hr/training/types/index.tsx
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
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrainingTypes() {
  const { t } = useTranslation();
  const { auth, trainingTypes, branches, departments, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedBranch, setSelectedBranch] = useState(pageFilters.branch_id || '_empty_');
  const [selectedDepartment, setSelectedDepartment] = useState(pageFilters.department_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);

  // State for department assignment
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [selectedTrainingType, setSelectedTrainingType] = useState<any>(null);
  const [filteredFilterDepartments, setFilteredFilterDepartments] = useState<any[]>([]);

  // Filter departments based on selected branch for filters
  useEffect(() => {
    if (selectedBranch === '_empty_') {
      setFilteredFilterDepartments(departments || []);
      setSelectedDepartment('_empty_');
    } else {
      const depts = departments.filter((dept: any) => dept.branch_id.toString() === selectedBranch);
      setFilteredFilterDepartments(depts);
      if (selectedDepartment !== '_empty_' && !depts.find(d => d.id.toString() === selectedDepartment)) {
        setSelectedDepartment('_empty_');
      }
    }
  }, [selectedBranch, departments]);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedBranch, selectedDepartment]);


  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedBranch !== '_empty_' || selectedDepartment !== '_empty_' || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedBranch !== '_empty_' ? 1 : 0) + (selectedDepartment !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.training-types.index'), {
      page: 1,
      search: searchTerm || undefined,
      branch_id: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      department_id: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.training-types.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      branch_id: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      department_id: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.training-types.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      branch_id: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      department_id: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
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
      case 'assign-departments':
        setSelectedTrainingType(item);
        setIsDepartmentModalOpen(true);
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
    const submitData = {
      ...formData
    };

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating training type...'));

      router.post(route('hr.training-types.store'), submitData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Training type created successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(t(`Failed to create training type: ${Object.values(errors).join(', ')}`));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating training type...'));

      router.put(route('hr.training-types.update', currentItem.id), submitData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Training type updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(t(`Failed to update training type: ${Object.values(errors).join(', ')}`));
          }
        }
      });
    }
  };

  const handleDepartmentAssignment = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Assigning departments...'));

    router.put(route('hr.training-types.assign-departments', selectedTrainingType.id), {
      department_ids: formData.department_ids
    }, {
      onSuccess: (page) => {
        setIsDepartmentModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else {
          toast.success(t('Departments assigned successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(t(`Failed to assign departments: ${Object.values(errors).join(', ')}`));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting training type...'));

    router.delete(route('hr.training-types.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Training type deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(t(`Failed to delete training type: ${Object.values(errors).join(', ')}`));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.training-types.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Training Type" button if user has permission
  if (hasPermission(permissions, 'create-training-types')) {
    pageActions.push({
      label: t('Add Training Type'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Training & Development') },
    { title: t('Training Types') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'departments',
      label: t('Departments'),
      render: (value) => {
        if (!value || value.length === 0) {
          return <span className="text-gray-500">{t('Departments Not Assigned')}</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {value.map((dept: any) => (
              <Badge key={dept.id} variant="outline" className="flex flex-col items-start">
                <div className="font-medium">{dept.name}</div>
                <div className="text-xs text-gray-500">{dept.branch?.name || '-'}</div>
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      key: 'training_programs_count',
      label: t('Programs'),
      render: (_, row) => row.training_programs_count || '0'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-training-types'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-training-types'
    },
    {
      label: t('Assign Departments'),
      icon: 'Users',
      action: 'assign-departments',
      className: 'text-green-500',
      requiredPermission: 'edit-training-types'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-training-types'
    }
  ];

  // Prepare branch options for filter
  const branchOptions = [
    { value: '_empty_', label: t('All Branches') },
    ...(branches || []).map((branch: any) => ({
      value: branch.id.toString(),
      label: branch.name
    }))
  ];

  // Prepare department options for filter (filtered by selected branch)
  const departmentOptions = [
    { value: '_empty_', label: t('All Departments') },
    ...filteredFilterDepartments.map((dept: any) => ({
      value: dept.id.toString(),
      label: dept.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Training Types")}
      description={t("Manage training types used to categorize training programs.")}
      url="/hr/training/types"
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
              name: 'branch_id',
              label: t('Branch'),
              type: 'select',
              value: selectedBranch,
              onChange: setSelectedBranch,
              options: branchOptions,
              searchable:true,
            },
            {
              name: 'department_id',
              label: t('Department'),
              type: 'select',
              value: selectedDepartment,
              onChange: setSelectedDepartment,
              options: departmentOptions,
              searchable:true,
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
          data={trainingTypes?.data || []}
          from={trainingTypes?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-training-types',
            create: 'create-training-types',
            edit: 'edit-training-types',
            delete: 'delete-training-types'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={trainingTypes?.from || 0}
          to={trainingTypes?.to || 0}
          total={trainingTypes?.total || 0}
          links={trainingTypes?.links}
          entityName={t("training types")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.training-types.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              branch_id: selectedBranch !== '_empty_' ? selectedBranch : undefined,
              department_id: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
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
              placeholder: t('e.g. Technical Skills Training')
            },
            {
              name: 'description',
              label: t('Description'),
              type: 'textarea',
              placeholder: t('e.g. Training focused on improving technical skills...')
            },
            {
              name: 'branch_id',
              label: t('Branch'),
              type: 'select',
              required: true,
              placeholder: t('Select Branch'),
              searchable: true,
              options: branchOptions.filter(opt => opt.value !== '_empty_')
            }
          ],
          modalSize: 'md'
        }}
        initialData={currentItem ? {
          ...currentItem,
          branch_id: currentItem.branch_id?.toString() ?? ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Training Type')
            : t('Edit Training Type')
        }
        mode={formMode}
      />

      {/* Department Assignment Modal */}
      <CrudFormModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        onSubmit={handleDepartmentAssignment}
        formConfig={{
          fields: [
            {
              name: 'department_ids',
              label: t('Departments'),
              type: 'multi-select',
              required: true,
              options: departments
                .filter((dept: any) => dept.branch_id === selectedTrainingType?.branch_id)
                .map((dept: any) => ({
                  value: dept.id.toString(),
                  label: dept.name
                })),
              helpText: t('Select departments for this training type')
            }
          ],
          modalSize: '2xl'
        }}
        initialData={{
          department_ids: selectedTrainingType?.departments?.map((dept: any) => dept.id.toString()) || []
        }}
        title={t('Assign Departments')}
        mode="edit"
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="training type"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View trainingType={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
