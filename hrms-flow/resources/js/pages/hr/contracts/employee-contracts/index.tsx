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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import View from './view';
import {
  Plus,
  FileText,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Pencil,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  FileCheck,
  LayoutGrid,
  FileEdit,
  BadgeCheck,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { useInitials } from '@/hooks/use-initials';

export default function EmployeeContracts() {
  const { t } = useTranslation();
  const { auth, employeeContracts, statusCounts = {}, contractTypes, employees, stats, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [typeFilter, setTypeFilter] = useState(pageFilters.contract_type_id || '_empty_');
  const [employeeFilter, setEmployeeFilter] = useState(pageFilters.employee_id || '_empty_');
  const [pageInitialState, setPageInitialState] = useState(true);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [statusFilter, typeFilter, employeeFilter]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return statusFilter !== '_empty_' || typeFilter !== '_empty_' || employeeFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (statusFilter !== '_empty_' ? 1 : 0) + (typeFilter !== '_empty_' ? 1 : 0) + (employeeFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.contracts.employee-contracts.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      contract_type_id: typeFilter !== '_empty_' ? typeFilter : undefined,
      employee_id: employeeFilter !== '_empty_' ? employeeFilter : undefined,
      per_page: pageFilters.per_page || 10,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.contracts.employee-contracts.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      contract_type_id: typeFilter !== '_empty_' ? typeFilter : undefined,
      employee_id: employeeFilter !== '_empty_' ? employeeFilter : undefined,
      per_page: pageFilters.per_page || 10,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.contracts.employee-contracts.index'), {
      page: 1,
      sort_field: field,
      sort_direction: direction,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      contract_type_id: typeFilter !== '_empty_' ? typeFilter : undefined,
      employee_id: employeeFilter !== '_empty_' ? employeeFilter : undefined,
      per_page: pageFilters.per_page || 10,
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
      case 'update-status':
        setIsStatusModalOpen(true);
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
      if (!globalSettings?.is_demo) { toast.loading(t('Creating employee contract...')); }

      router.post(route('hr.contracts.employee-contracts.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create employee contract: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) { toast.loading(t('Updating employee contract...')); }

      router.put(route('hr.contracts.employee-contracts.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) { toast.dismiss(); }
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update employee contract: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) { toast.loading(t('Deleting employee contract...')); }

    router.delete(route('hr.contracts.employee-contracts.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete employee contract: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleStatusUpdate = (formData: any) => {
    if (!globalSettings?.is_demo) { toast.loading(t('Updating contract status...')); }

    router.put(route('hr.contracts.employee-contracts.update-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) { toast.dismiss(); }
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update contract status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.contracts.employee-contracts.index'));
  };

  const pageActions: any[] = [];

  if (hasPermission(permissions, 'create-employee-contracts')) {
    pageActions.push({
      label: t('Add Contract'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Documents & Contracts') },
    { title: t('Employee Contracts') }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-50 text-gray-600 ring-gray-500/10';
      case 'Pending Approval': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
      case 'Active': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Expired': return 'bg-red-50 text-red-700 ring-red-600/10';
      case 'Terminated': return 'bg-red-50 text-red-700 ring-red-600/10';
      case 'Renewed': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Near Expire': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const getDaysUntilExpiry = (endDate: string, status: string) => {
    if (!endDate || status !== 'Active') return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getContractProgress = (startDate: string, endDate: string | null) => {
    if (!startDate || !endDate) return { percentage: 0, color: 'bg-gray-300' };

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;

    if (total <= 0) return { percentage: 100, color: 'bg-gray-400' };

    let percentage = (elapsed / total) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    let color = 'bg-green-500';
    if (percentage >= 90) color = 'bg-red-500';
    else if (percentage >= 75) color = 'bg-orange-500';
    else if (percentage >= 50) color = 'bg-yellow-500';

    return { percentage, color };
  };

  const getDurationLabel = (startDate: string, endDate: string | null) => {
    if (!startDate || !endDate) return t('Permanent');
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0 && months > 0) return `${years} ${t('Years')} ${months} ${t('Months')}`;
    if (years > 0) return `${years} ${years === 1 ? t('Year') : t('Years')}`;
    if (months > 0) return `${months} ${months === 1 ? t('Month') : t('Months')}`;
    return `${diffDays} ${diffDays === 1 ? t('Day') : t('Days')}`;
  };

  const formatDateShort = (date: string) => {
    return window.appSettings?.formatDateTimeSimple(date, false) || format(new Date(date), 'MMM dd, yyyy');
  };

  const columns = [
    {
      key: 'contract_number',
      label: t('Contract Number'),
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{value}</span>
      )
    },
    {
      key: 'contract_type.name',
      label: t('Contract Name'),
      render: (_: any, row: any) => (
        <div>
          <div className="font-medium text-sm text-gray-900">{row.contract_type?.name || '-'}</div>
          {/* <div className="text-xs text-gray-500">{row.contract_number}</div> */}
        </div>
      )
    },
    {
      key: 'employee.name',
      label: t('Assigned to'),
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0 text-xs font-bold">
            {row.employee?.avatar ? (
              <img src={row.employee.avatar} alt={row.employee?.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(row.employee?.name || '')
            )}
          </div>
          <div>
            <div className="font-medium">{row.employee?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.employee?.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string, row: any) => {
        const daysUntilExpiry = getDaysUntilExpiry(row.end_date, row.status);
        const isNearExpire = row.status === 'Active' && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        const displayStatus = isNearExpire ? 'Near Expire' : value;

        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(displayStatus)}`}>
            {t(displayStatus)}
          </span>
        );
      }
    },
    {
      key: 'contract_period',
      label: t('Contract Duration'),
      sortable: true,
      render: (_: any, row: any) => {
        const progress = getContractProgress(row.start_date, row.end_date);
        return (
          <div className="min-w-[180px]">
            <div className="text-xs text-gray-900 font-semibold mb-0.5">{getDurationLabel(row.start_date, row.end_date)}</div>
            <div className="text-[11px] text-gray-500 mb-1.5">
              {formatDateShort(row.start_date)} — {row.end_date ? formatDateShort(row.end_date) : t('Permanent')}
            </div>
            {row.end_date && (
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progress.color}`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'basic_salary',
      label: t('Contract Amount'),
      render: (value: number) => (
        <span className="text-sm font-semibold text-gray-900 font-mono">
          {window.appSettings?.formatCurrency(value) || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      className: 'w-16 text-right',
      render: (_: any, row: any) => {
        const canView = hasPermission(permissions, 'view-employee-contracts');
        const canEdit = hasPermission(permissions, 'edit-employee-contracts');
        const canDelete = hasPermission(permissions, 'delete-employee-contracts');
        const canUpdateStatus = hasPermission(permissions, 'approve-employee-contracts') || hasPermission(permissions, 'reject-employee-contracts');

        if (!canView && !canEdit && !canDelete && !canUpdateStatus) return null;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canView && (
                  <DropdownMenuItem onClick={() => handleAction('view', row)}>
                    <Eye className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{t('View')}</span>
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={() => handleAction('edit', row)}>
                    <Edit className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{t('Edit')}</span>
                  </DropdownMenuItem>
                )}
                {canUpdateStatus && (
                  <DropdownMenuItem onClick={() => handleAction('update-status', row)}>
                    <RefreshCw className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{t('Update Status')}</span>
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={() => handleAction('delete', row)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{t('Delete')}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'Draft', label: t('Draft'), icon: <FileEdit className="h-4 w-4" />, count: statusCounts['Draft'] ?? 0 },
    { value: 'Pending Approval', label: t('Pending'), icon: <Clock className="h-4 w-4" />, count: statusCounts['Pending Approval'] ?? 0 },
    { value: 'Active', label: t('Active'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts['Active'] ?? 0 },
    { value: 'Expired', label: t('Expired'), icon: <XCircle className="h-4 w-4" />, count: statusCounts['Expired'] ?? 0 },
    { value: 'Terminated', label: t('Terminated'), icon: <XCircle className="h-4 w-4" />, count: statusCounts['Terminated'] ?? 0 },
    { value: 'Renewed', label: t('Renewed'), icon: <RotateCcw className="h-4 w-4" />, count: statusCounts['Renewed'] ?? 0 },
  ];

  const typeOptions = [
    { value: '_empty_', label: t('All Types') },
    ...(contractTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('All Employees') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const employeeSelectOptions = [
    { value: '_empty_', label: t('Select Employee') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const typeSelectOptions = [
    { value: '_empty_', label: t('Select Contract Type') },
    ...(contractTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Employee Contracts")}
      description={t("Manage employee contracts and monitor expiry dates.")}
      url="/hr/contracts/employee-contracts"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Active Contracts */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Active Contract')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.active ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Currently running')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Near Expiry */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Contract Near Expire')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.near_expiry ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('Expiring within 30 days')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
              <Clock className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* Draft Contracts */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Draft Contract')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.draft ?? 0}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('Pending approval')}</span>
              </div>
            </div>
            <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <FileText className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          statusTabs={statusTabs}
          activeStatusTab={statusFilter}
          onStatusTabChange={setStatusFilter}
          filters={[
            {
              name: 'contract_type_id',
              label: t('Contract Type'),
              type: 'select',
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions,
              searchable: true
            },
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: employeeFilter,
              onChange: setEmployeeFilter,
              options: employeeOptions,
              searchable: true
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CrudTable
          columns={columns}
          actions={[]}
          data={employeeContracts?.data || []}
          from={employeeContracts?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-employee-contracts',
            edit: 'edit-employee-contracts',
            delete: 'delete-employee-contracts'
          }}
          showActions={false}
        />

        <Pagination
          from={employeeContracts?.from || 0}
          to={employeeContracts?.to || 0}
          total={employeeContracts?.total || 0}
          links={employeeContracts?.links}
          entityName={t("employee contracts")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.contracts.employee-contracts.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: statusFilter !== '_empty_' ? statusFilter : undefined,
              contract_type_id: typeFilter !== '_empty_' ? typeFilter : undefined,
              employee_id: employeeFilter !== '_empty_' ? employeeFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Create/Edit Modal */}
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
              options: employeeSelectOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'contract_type_id',
              label: t('Contract Type'),
              type: 'select',
              required: true,
              placeholder: t('Select Contract Type'),
              options: typeSelectOptions.filter(opt => opt.value !== '_empty_'),
              searchable: true
            },
            {
              name: 'start_date',
              label: t('Start Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Start Date')
            },
            {
              name: 'end_date',
              label: t('End Date'),
              type: 'date',
              placeholder: t('Select End Date')
            },
            {
              name: 'basic_salary',
              label: t('Basic Salary'),
              type: 'number',
              required: true,
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 5000.00')
            } as any,
            {
              name: 'terms_conditions',
              label: t('Terms & Conditions'),
              type: 'textarea',
              rows: 6,
              placeholder: t('e.g. This contract is subject to the following terms and conditions...')
            } as any
          ],
          modalSize: 'xl'
        }}
        initialData={currentItem ? {
          ...currentItem,
          start_date: currentItem.start_date ? window.appSettings.formatDateTimeSimple(currentItem.start_date, false) : currentItem.start_date,
          end_date: currentItem.end_date ? window.appSettings.formatDateTimeSimple(currentItem.end_date, false) : currentItem.end_date
        } : null}
        title={
          formMode === 'create'
            ? t('Add Employee Contract')
            : t('Edit Employee Contract')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.contract_number || ''}
        entityName="employee contract"
      />

      {/* Status Update Modal */}
      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusUpdate}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'Draft', label: t('Draft') },
                { value: 'Pending Approval', label: t('Pending Approval') },
                { value: 'Active', label: t('Active') },
                { value: 'Expired', label: t('Expired') },
                { value: 'Terminated', label: t('Terminated') },
                { value: 'Renewed', label: t('Renewed') }
              ]
            }
          ]
        }}
        initialData={currentItem ? { status: currentItem.status } : {}}
        title={t('Update Contract Status')}
        mode="edit"
      />

      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View contract={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
