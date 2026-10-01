// pages/hr/performance/employee-goals/index.tsx
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
import { Calendar, Plus, Tag, LayoutGrid, Circle, Clock, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getImagePath } from '@/utils/helpers';

export default function EmployeeGoals() {
  const { t } = useTranslation();
  const { auth, goals, employees, goalTypes, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedGoalType, setSelectedGoalType] = useState(pageFilters.goal_type_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [progressValue, setProgressValue] = useState(0);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedStatus !== '_empty_' || searchTerm !== '' || selectedEmployee !== '_empty_' || selectedGoalType !== '_empty_';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedStatus !== '_empty_' ? 1 : 0) +
      (searchTerm ? 1 : 0) +
      (selectedEmployee !== '_empty_' ? 1 : 0) +
      (selectedGoalType !== '_empty_' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.performance.employee-goals.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      goal_type_id: selectedGoalType !== '_empty_' ? selectedGoalType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.performance.employee-goals.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      goal_type_id: selectedGoalType !== '_empty_' ? selectedGoalType : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.performance.employee-goals.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      goal_type_id: selectedGoalType !== '_empty_' ? selectedGoalType : undefined,
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
      case 'update-progress':
        setProgressValue(item.progress || 0);
        setIsProgressModalOpen(true);
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating employee goal...'));

      router.post(route('hr.performance.employee-goals.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Employee goal created successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create goal: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating employee goal...'));

      router.put(route('hr.performance.employee-goals.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Employee goal updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update goal: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleProgressSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating goal progress...'));

    router.put(route('hr.performance.employee-goals.update-progress', currentItem.id), { progress: formData.progress }, {
      onSuccess: (page) => {
        setIsProgressModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Goal progress updated successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update progress: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting employee goal...'));

    router.delete(route('hr.performance.employee-goals.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Employee goal deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete goal: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.performance.employee-goals.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedGoalType, selectedStatus]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Goal" button if user has permission
  if (hasPermission(permissions, 'create-employee-goals')) {
    pageActions.push({
      label: t('Add Goal'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },

    { title: t('Performance Management') },
    { title: t('Employee Goals') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'title',
      label: t('Title'),
      sortable: true,
      render: (value: any, row: any) => {
        return (
            <div>
                <div className="font-medium">{value}</div>
                {row.goal_type?.name ?
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">
                    <Tag className="h-3 w-3 mr-1" />
                    {t(row.goal_type?.name)}
                </span> : <span>-</span>}
            </div>);
      }
    },
    {
      key: 'employee',
      label: t('Employee'),
      render: (value: any, row: any) => {
        return (
        <div className="flex items-center gap-3">
            <img
            src={row.employee?.avatar}
            alt={row.employee?.name}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getImagePath('avatars/avatar.png');
            }}
            />
            <div>
            <div className="font-medium">{row.employee?.name}</div>
            <div className="text-sm text-muted-foreground">{row.employee?.email}</div>
            </div>
        </div>
        );
    }
    },
    {
      key: 'start_date',
      label: t('Duration'),
      sortable: true,
      render: (_: any, row: any) => (
        <div className='flex flex-col gap-2'>
            <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                {row.start_date && <Calendar className="h-4 w-4" />}
                <span>{window.appSettings?.formatDateTimeSimple(row.start_date, false) || '-'}</span>
            </div>
            <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                {row.end_date && <Calendar className="h-4 w-4" />}
                <span>{window.appSettings?.formatDateTimeSimple(row.end_date, false) || '-'}</span>
            </div>
        </div>
      )
    },
    {
      key: 'end_date',
      label: t('Days'),
      render: (_: any, row: any) => {
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);

        let diffInDays;
        if(end && start){
            diffInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }else{
            diffInDays = '-';
        }

        if (diffInDays === '-') return <span className="text-gray-400">-</span>;
        return (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/20">
            {diffInDays}d
          </span>
        );
      }
    },
    {
      key: 'progress',
      label: t('Progress'),
      render: (value: number) => (
        <div className="flex items-center gap-2 w-full min-w-[120px]">
          <Progress value={value} className="h-2 flex-1" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">{value}%</span>
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        let statusClass = '';
        let statusText = '';

        switch (value) {
          case 'not_started':
            statusClass = 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
            statusText = t('Not Started');
            break;
          case 'in_progress':
            statusClass = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            statusText = t('In Progress');
            break;
          case 'completed':
            statusClass = 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            statusText = t('Completed');
            break;
          default:
            statusClass = 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
            statusText = value;
        }

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusClass}`}>
            {statusText}
          </span>
        );
      }
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-employee-goals'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-employee-goals'
    },
    {
      label: t('Update Progress'),
      icon: 'BarChart',
      action: 'update-progress',
      className: 'text-green-500',
      requiredPermission: 'edit-employee-goals'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-employee-goals'
    }
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (goals?.total || 0) },
    { value: 'not_started', label: t('Not Started'), icon: <Circle className="h-4 w-4" />, count: statusCounts.not_started ?? 0 },
    { value: 'in_progress', label: t('In Progress'), icon: <Clock className="h-4 w-4" />, count: statusCounts.in_progress ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
  ];

  // Prepare employee options
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees') },
    ...(employees || []).map((employee: any) => ({
      value: employee.id.toString(),
      label: `${employee.name} (${employee.employee_id})`
    }))
  ];

  // Prepare goal type options
  const goalTypeOptions = [
    { value: '_empty_', label: t('All Goal Types') },
    ...(goalTypes || []).map((goalType: any) => ({
      value: goalType.id.toString(),
      label: goalType.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Employee Goals")}
      description={t("Set and track performance goals for your employees.")}
      url="/hr/performance/employee-goals"
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
            ...(hasPermission(permissions, 'manage-any-employee-goals') ? [{
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable: true
            }] : []),

            {
              name: 'goal_type_id',
              label: t('Goal Type'),
              type: 'select',
              value: selectedGoalType,
              onChange: setSelectedGoalType,
              options: goalTypeOptions,
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
          data={goals?.data || []}
          from={goals?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-employee-goals',
            create: 'create-employee-goals',
            edit: 'edit-employee-goals',
            delete: 'delete-employee-goals'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={goals?.from || 0}
          to={goals?.to || 0}
          total={goals?.total || 0}
          links={goals?.links}
          entityName={t("employee goals")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.performance.employee-goals.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
              goal_type_id: selectedGoalType !== '_empty_' ? selectedGoalType : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
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
              options: employees.map((employee: any) => ({
                value: employee.id,
                label: `${employee.name} (${employee.employee_id})`
              }))
            },
            {
              name: 'goal_type_id',
              label: t('Goal Type'),
              type: 'select',
              searchable: true,
              required: true,
              placeholder: t('Select Goal Type'),
              options: goalTypes.map((goalType: any) => ({
                value: goalType.id.toString(),
                label: goalType.name
              }))
            },
            { name: 'title', label: t('Goal Title'), type: 'text', required: true, placeholder: t('e.g. Improve Customer Satisfaction') },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Achieve a customer satisfaction score of 90% or above...') },
            { name: 'start_date', label: t('Start Date'), type: 'date', required: true, placeholder: t('Select Start Date') },
            { name: 'end_date', label: t('End Date'), type: 'date', required: true, placeholder: t('Select End Date') },
            { name: 'target', label: t('Target'), type: 'text', placeholder: t('e.g. Complete 5 projects, Achieve 95% accuracy, etc.') },
            {
              name: 'progress',
              label: t('Progress (%)'),
              type: 'number',
              min: 0,
              max: 100,
              placeholder: t('e.g. 50'),
              defaultValue: 0
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'not_started', label: t('Not Started') },
                { value: 'in_progress', label: t('In Progress') },
                { value: 'completed', label: t('Completed') }
              ],
              defaultValue: 'not_started'
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem ? {
          ...currentItem,
          start_date: currentItem.start_date ? currentItem.start_date.substring(0, 10) : '',
          end_date: currentItem.end_date ? currentItem.end_date.substring(0, 10) : ''
        } : null}
        title={
          formMode === 'create'
            ? t('Add New Employee Goal')
            : t('Edit Employee Goal')
        }
        mode={formMode}
      />

      {/* Progress Update Modal */}
      <CrudFormModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        onSubmit={handleProgressSubmit}
        formConfig={{
          fields: [
            {
              name: 'progress',
              label: t('Progress (%)'),
              type: 'number',
              min: 0,
              max: 100,
              step: 5,
              required: true,
              placeholder: t('e.g. 50')
            }
          ],
          modalSize: 'sm'
        }}
        initialData={{ progress: progressValue }}
        title={t('Update Goal Progress')}
        mode="edit"
        customContent={
          <div className="mb-4 text-center">
            <div className="text-3xl font-bold">{progressValue}%</div>
            <Progress value={progressValue} className="h-2 mt-2" />
          </div>
        }
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="employee goal"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View goal={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
