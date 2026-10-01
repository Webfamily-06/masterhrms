// pages/hr/employees/index.tsx
import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash2, Lock, Unlock, Key, FileDown, FileUp, Calendar, LayoutGrid, CheckCircle2, XCircle, Clock, UserX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useInitials } from '@/hooks/use-initials';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { CrudFormModal } from '@/components/CrudFormModal';
import { getImagePath } from '@/utils/helpers';
import { ImportModal } from '@/components/ImportModal';

export default function Employees() {
  const { t } = useTranslation();
  const { auth, employees, branches, planLimits, departments, designations, hasSampleFile, globalSettings, filters: pageFilters = {}, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [activeView, setActiveView] = useState(pageFilters.view || 'list');
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedDepartment, setSelectedDepartment] = useState(pageFilters.department || '_empty_');
  const [selectedBranch, setSelectedBranch] = useState(pageFilters.branch || '_empty_');
  const [selectedDesignation, setSelectedDesignation] = useState(pageFilters.designation || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedDepartment !== '_empty_' || selectedBranch !== '_empty_' || selectedDesignation !== '_empty_' || selectedStatus !== '_empty_' || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedDepartment !== '_empty_' ? 1 : 0) +
      (selectedBranch !== '_empty_' ? 1 : 0) +
      (selectedDesignation !== '_empty_' ? 1 : 0) +
      (selectedStatus !== '_empty_' ? 1 : 0) +
      (searchTerm ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.employees.index'), {
      page: 1,
      search: searchTerm || undefined,
      department: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
      branch: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      designation: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      per_page: pageFilters.per_page,
      view: activeView
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.employees.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      department: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
      branch: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      designation: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      view: activeView
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.employees.show', item.employee?.id || item.id));
        break;
      case 'edit':
        router.get(route('hr.employees.edit', item.employee?.id || item.id));
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'toggle-status':
        handleToggleStatus(item);
        break;
      case 'change-password':
        setIsPasswordModalOpen(true);
        break;
    }
  };

  const handleAddNew = () => {
    router.get(route('hr.employees.create'));
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting employee...'));
    }

    router.delete(route('hr.employees.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete employee: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleToggleStatus = (employee: any) => {
    const currentStatus = employee.status || 'inactive';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) {
      toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} employee...`);
    }

    router.put(route('hr.employees.toggle-status', employee.employee?.id || employee.id), {}, {
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
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update employee status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handlePasswordChange = (formData: any) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Changing password...'));
    }

    router.put(route('hr.employees.change-password', currentItem.employee?.id || currentItem.id), formData, {
      onSuccess: (page) => {
        setIsPasswordModalOpen(false);
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
          toast.error(t('Failed to change password: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.employees.index'), {
      page: pageNum,
      view: activeView,
      search: searchTerm || undefined,
      department: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
      branch: selectedBranch !== '_empty_' ? selectedBranch : undefined,
      designation: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('hr.employees.index'));
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.employees.export'), {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(t(data.message || 'Failed to export employees'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error(t('Failed to export employees'));
    }
  };

  // Define page actions
  const pageActions = [];

  // Add Export button
  if (hasPermission(permissions, 'export-employee')) {
    pageActions.push({
      label: t('Export'),
      icon: <FileDown className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: handleExport
    });
  }

  // Add Import button
  if (hasPermission(permissions, 'import-employee')) {
    pageActions.push({
      label: t('Import'),
      icon: <FileUp className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: () => setIsImportModalOpen(true)
    });
  }

  // Add the "Add New Employee" button if user has permission
  if (hasPermission(permissions, 'create-employees')) {
    const canCreate = !planLimits || planLimits.can_create;
    pageActions.push({
      label: planLimits && !canCreate ? t('Employee Create Limit Reached ({{current}}/{{max}})', { current: planLimits.current_users, max: planLimits.max_users }) : t('Add Employee'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: canCreate ? 'default' : 'outline',
      onClick: canCreate ? () => handleAddNew() : () => toast.error(t('Employee limit exceeded. Your plan allows maximum {{max}} users. Please upgrade your plan.', { max: planLimits.max_users })),
      disabled: !canCreate
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employees') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value: any, row: any) => {
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden">
              {row.avatar ? (
                <img src={row.avatar} alt={row.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(row.name)
              )}
            </div>
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-sm text-muted-foreground">{row.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'employee_id',
      label: t('Employee ID'),
      sortable: false,
      render: (value: any, row: any) => {
        const empId = row.employee?.employee_id;
        if (!empId) return '-';
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20">
            {empId}
          </span>
        );
      }
    },
    {
      key: 'department',
      label: t('Department'),
      render: (value: any, row: any) => {
        return row.employee?.department?.name || '-';
      }
    },
    {
      key: 'designation',
      label: t('Designation'),
      render: (value: any, row: any) => {
        return row.employee?.designation?.name || '-';
      }
    },
    {
      key: 'employee_status',
      label: t('Employee Status'),
      render: (value: any, row: any) => {
        const status = row.employee?.employee_status || 'active';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${status === 'active'
            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
            : status === 'inactive'
              ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
              : status === 'probation'
                ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                : status === 'terminated'
                  ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                  : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
            }`}>
            {status === 'active' && t('Active')}
            {status === 'inactive' && t('Inactive')}
            {status === 'probation' && t('Probation')}
            {status === 'terminated' && t('Terminated')}
          </span>
        );
      }
    },
    {
      key: 'employee.date_of_joining',
      label: t('Joined'),
      sortable: false,
      type: 'date'
    },
    {
      key: 'status',
      label: t('Login Status'),
      render: (value: string) => {
        const isActive = value === 'active';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isActive
              ? 'bg-green-50 text-green-700 ring-green-600/20'
              : 'bg-red-50 text-red-700 ring-red-600/20'
            }`}>
            {isActive ? t('Active') : t('Inactive')}
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
      requiredPermission: 'view-employees'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-employees'
    },
    {
      label: t('Change Password'),
      icon: 'Key',
      action: 'change-password',
      className: 'text-green-500',
      requiredPermission: 'edit-employees'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-employees'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-employees'
    }
  ];

  // Prepare filter options
  const branchOptions = [
    { value: '_empty_', label: t('All Branches') },
    ...(branches || []).map((branch: any) => ({
      value: branch.id.toString(),
      label: branch.name
    }))
  ];

  const departmentOptions = [
    { value: '_empty_', label: t('All Departments') },
    ...(departments || []).map((department: any) => ({
      value: department.id.toString(),
      label: `${department.name} (${department.branch?.name || t('No Branch')})`
    }))
  ];

  const designationOptions = [
    { value: '_empty_', label: t('All Designations') },
    ...(designations || []).map((designation: any) => ({
      value: designation.id.toString(),
      label: `${designation.name} (${designation.department?.name || t('No Department')})`
    }))
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (employees?.total || 0) },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
    { value: 'probation', label: t('Probation'), icon: <Clock className="h-4 w-4" />, count: statusCounts.probation ?? 0 },
    { value: 'terminated', label: t('Terminated'), icon: <UserX className="h-4 w-4" />, count: statusCounts.terminated ?? 0 },
  ];

  const [pageInitialState, setPageInitialState] = useState(true);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedStatus, selectedBranch, selectedDepartment, selectedDesignation]);


  return (
    <PageTemplate
      title={t("Employees")}
      description={t("Manage employees and their information.")}
      url="/hr/employees"
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
              name: 'branch',
              label: t('Branch'),
              type: 'select',
              value: selectedBranch,
              onChange: setSelectedBranch,
              options: branchOptions,
              searchable: true,
            },
            {
              name: 'department',
              label: t('Department'),
              type: 'select',
              value: selectedDepartment,
              onChange: setSelectedDepartment,
              options: departmentOptions,
              searchable: true,
            },
            {
              name: 'designation',
              label: t('Designation'),
              type: 'select',
              value: selectedDesignation,
              onChange: setSelectedDesignation,
              options: designationOptions,
              searchable: true,
            },
          ]}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          showViewToggle={true}
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            router.get(route('hr.employees.index'), {
              page: 1,
              view,
              search: searchTerm || undefined,
              department: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
              branch: selectedBranch !== '_empty_' ? selectedBranch : undefined,
              designation: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              per_page: pageFilters.per_page
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Content section */}
      {activeView === 'list' ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <CrudTable
            columns={columns}
            actions={actions}
            data={employees?.data || []}
            from={employees?.from || 1}
            onAction={handleAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleSort}
            permissions={permissions}
            entityPermissions={{
              view: 'view-employees',
              create: 'create-employees',
              edit: 'edit-employees',
              delete: 'delete-employees'
            }}
          />

          {/* Pagination section */}
          <Pagination
            from={employees?.from || 0}
            to={employees?.to || 0}
            total={employees?.total || 0}
            links={employees?.links}
            entityName={t("employees")}
            currentPerPage={pageFilters.per_page?.toString() || "10"}
            onPerPageChange={(value) => {
              router.get(route('hr.employees.index'), {
                page: 1,
                per_page: parseInt(value),
                search: searchTerm || undefined,
                department: selectedDepartment !== '_empty_' ? selectedDepartment : undefined,
                branch: selectedBranch !== '_empty_' ? selectedBranch : undefined,
                designation: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
                view: activeView
              }, { preserveState: true, preserveScroll: true });
            }}
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <div>
          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees?.data?.map((employee: any) => {
              const empStatus = employee.employee?.employee_status || 'active';
              const statusClass =
                empStatus === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                  : empStatus === 'inactive' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    : empStatus === 'probation' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                      : empStatus === 'terminated' ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                        : 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
              const statusLabel = empStatus.charAt(0).toUpperCase() + empStatus.slice(1);
              return (
                <Card key={employee.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="py-4">
                    {/* Top: Avatar + Name + Email */}
                    <div className="px-4 flex items-center gap-3 justify-between">
                      <div className="flex-shrink-0">
                        {employee.avatar ? (
                          <img
                            src={employee.avatar}
                            alt={employee.name}
                            className="h-12 w-12 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              (target.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold ${employee.avatar ? 'hidden' : ''}`}>
                          {getInitials(employee.name)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{employee.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{employee.email}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shrink-0 ${statusClass}`}>
                        {t(statusLabel)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

                    {/* Middle: Employee Id / Branch / Dept / Designation */}
                    <div className="space-y-1 mb-3 px-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-medium text-gray-600 dark:text-gray-300">{t('Employee Id')}: </span>
                        {employee.employee.employee_id}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-medium text-gray-600 dark:text-gray-300">{t('Branch')}: </span>
                        {employee.employee?.branch?.name || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-medium text-gray-600 dark:text-gray-300">{t('Department')}: </span>
                        {employee.employee?.department?.name || '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <span className="font-medium text-gray-600 dark:text-gray-300">{t('Designation')}: </span>
                        {employee.employee?.designation?.name || '-'}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

                    {/* Bottom: Actions + Status badge */}
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500 text-sm">
                        {employee.created_at && <Calendar className="h-4 w-4" />}
                        <span>{window.appSettings?.formatDateTimeSimple(employee.created_at, false) || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPermission(permissions, 'view-employees') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAction('view', employee)}
                                className="h-8 w-8 p-0 text-gray-500">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('View')}</TooltipContent>
                          </Tooltip>
                        )}
                        {hasPermission(permissions, 'edit-employees') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAction('edit', employee)}
                                className="h-8 w-8 p-0 text-gray-500">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Edit')}</TooltipContent>
                          </Tooltip>
                        )}
                        {hasPermission(permissions, 'edit-employees') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAction('change-password', employee)}
                                className="h-8 w-8 p-0 text-gray-500">
                                <Key className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Change Password')}</TooltipContent>
                          </Tooltip>
                        )}
                        {hasPermission(permissions, 'edit-employees') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', employee)}
                                className="h-8 w-8 p-0 text-gray-500">
                                {employee.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{employee.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent>
                          </Tooltip>
                        )}
                        {hasPermission(permissions, 'delete-employees') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAction('delete', employee)}
                                className="h-8 w-8 p-0 text-gray-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Delete')}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination for grid view */}
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
            <Pagination
              from={employees?.from || 0}
              to={employees?.to || 0}
              total={employees?.total || 0}
              links={employees?.links}
              entityName={t("employees")}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="employee"
      />

      {/* Change Password Modal */}
      <CrudFormModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordChange}
        formConfig={{
          fields: [
            {
              name: 'password',
              label: t('New Password'),
              type: 'password',
              placeholder: t('Enter new password'),
              required: true
            },
            {
              name: 'password_confirmation',
              label: t('Confirm Password'),
              type: 'password',
              placeholder: t('Confirm new password'),
              required: true
            }
          ],
          modalSize: 'md'
        }}
        initialData={{}}
        title={t('Change Employee Password')}
        mode='edit'
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('Import Employees from CSV/Excel')}
        importRoute="hr.employees.import"
        parseRoute="hr.employees.parse"
        sampleRoute={hasSampleFile ? 'hr.employees.download.template' : undefined}
        importNotes={t('Ensure that the values entered for Department, Designation, Branch , Shift , Attedance Policy , Employement Type , Employement Status match the existing records in your system.')}
        modalSize="xl"
        databaseFields={[
          { key: 'name', required: true },
          { key: 'email', required: true },
          { key: 'password', required: true },
          { key: 'biometric_emp_id', required: true },
          { key: 'phone', required: true },
          { key: 'department', required: true },
          { key: 'designation', required: true },
          { key: 'branch', required: true },
          { key: 'base_salary', required: true },
          { key: 'date_of_joining', required: true },
          { key: 'date_of_birth', required: true },
          { key: 'gender', required: true },
          { key: 'shift' },
          { key: 'attendance_policy' },
          { key: 'employment_type' },
          { key: 'employee_status' },
          { key: 'city', required: true },
          { key: 'state', required: true },
          { key: 'country', required: true },
          { key: 'postal_code', required: true },
          { key: 'address', required: true },
          { key: 'bank_name', required: true },
          { key: 'account_number', required: true },
          { key: 'bank_identifier_code', required: true },
          { key: 'bank_branch', required: true }
        ]}
      />
    </PageTemplate>
  );
}
