// pages/companies/index.tsx
import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { Plus, Edit, Trash2, KeyRound, Lock, Unlock, LayoutGrid, List, Info, ArrowUpRight, CreditCard, History, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useInitials } from '@/hooks/use-initials';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
import { getImagePath } from '@/utils/helpers';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';

export default function Companies() {
  const { t } = useTranslation();
  const { auth, companies, plans, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [activeView, setActiveView] = useState(pageFilters.view || 'list');
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [startDate, setStartDate] = useState<Date | undefined>(pageFilters.start_date ? new Date(pageFilters.start_date) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(pageFilters.end_date ? new Date(pageFilters.end_date) : undefined);
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [pageInitialState, setPageInitialState] = useState(true);

  // Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isUpgradePlanModalOpen, setIsUpgradePlanModalOpen] = useState(false);

  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);


  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedStatus !== '_empty_' || searchTerm !== '' || startDate !== undefined || endDate !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedStatus !== '_empty_' ? 1 : 0) +
      (searchTerm ? 1 : 0) +
      (startDate ? 1 : 0) +
      (endDate ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = (page = 1) => {
    const params: any = { page };

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (selectedStatus !== '_empty_') {
      params.status = selectedStatus;
    }

    if (startDate) {
      params.start_date = startDate.toISOString().split('T')[0];
    }

    if (endDate) {
      params.end_date = endDate.toISOString().split('T')[0];
    }

    if (pageFilters.sort_direction) {
      params.sort_direction = pageFilters.sort_direction;
    }

    if (pageFilters.sort_field) {
      params.sort_field = pageFilters.sort_field;
    }

    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }

    params.view = activeView;
    router.get(route('companies.index'), params, { preserveState: true, preserveScroll: true });
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedStatus, startDate, endDate]);

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    const params: any = {
      sort_field: field,
      sort_direction: direction,
      page: 1
    };

    // Add search and filters
    if (searchTerm) {
      params.search = searchTerm;
    }

    if (selectedStatus !== '_empty_') {
      params.status = selectedStatus;
    }

    if (startDate) {
      params.start_date = startDate.toISOString().split('T')[0];
    }

    if (endDate) {
      params.end_date = endDate.toISOString().split('T')[0];
    }

    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }

    params.view = activeView;
    router.get(route('companies.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, company: any) => {
    setCurrentCompany(company);

    switch (action) {
      case 'login-as':
        router.get(route("impersonate.start", company.id));
        break;
      case 'company-info':
        setIsViewModalOpen(true);
        break;
      case 'upgrade-plan':
        handleUpgradePlan(company);
        break;

      case 'reset-password':
        setIsResetPasswordModalOpen(true);
        break;
      case 'toggle-status':
        handleToggleStatus(company);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentCompany(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Creating company...'));
      }

      router.post(route('companies.store'), formData, {
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
            toast.error(t('Failed to create company: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Updating company...'));
      }

      router.put(route('companies.update', currentCompany.id), formData, {
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
            toast.error(t('Failed to update company: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting company...'));
    }

    router.delete(route("companies.destroy", currentCompany.id), {
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
          toast.error(t('Failed to delete company: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetPasswordConfirm = (data: { password: string }) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Resetting password...'));
    }

    router.put(route('companies.reset-password', currentCompany.id), data, {
      onSuccess: (page) => {
        setIsResetPasswordModalOpen(false);
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
          toast.error(t('Failed to reset password: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleToggleStatus = (company: any) => {
    const newStatus = company.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) {
      toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} company...`);
    }

    router.put(route('companies.toggle-status', company.id), {}, {
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
          toast.error(t('Failed to update company status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    const params: any = { page: pageNum, view: activeView };
    if (searchTerm) params.search = searchTerm;
    if (selectedStatus !== '_empty_') params.status = selectedStatus;
    if (startDate) params.start_date = startDate.toISOString().split('T')[0];
    if (endDate) params.end_date = endDate.toISOString().split('T')[0];
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    router.get(route('companies.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('companies.index'), {view: activeView});
  };

  const handleUpgradePlan = (company: any) => {
    setCurrentCompany(company);

    // Fetch available plans
    if (!globalSettings?.is_demo) {
      toast.loading(t('Loading plans...'));
    }
    fetch(route('companies.plans', company.id))
      .then(res => res.json())
      .then(data => {
        setAvailablePlans(data.plans);
        setIsUpgradePlanModalOpen(true);
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
      })
      .catch(err => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        toast.error(t('Failed to load plans'));
      });
  };

  const handleUpgradePlanConfirm = (planId: number, duration: string) => {
    if (!globalSettings?.is_demo) {
      // toast.loading(t('Upgrading plan...'));
    }

    // Use Inertia router to handle the request
    router.put(route('companies.upgrade-plan', currentCompany.id), {
      plan_id: planId,
      duration: duration

    }, {
      onSuccess: () => {
        setIsUpgradePlanModalOpen(false);
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        toast.success(t('Plan upgraded successfully'));
        router.reload();
      },
      onError: () => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        toast.error(t('Failed to upgrade plan'));
      }
    });
  };





  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
  ];

  // Define page actions
  const pageActions = [
    ...(permissions.includes('manage-login-history') ? [{
      icon: <History className="h-4 w-4 mx-auto" />,
      variant: 'outline',
      onClick: () => router.get(route('login-history.index')),
      tooltip: t('Login History')
    }] : []),
    {
      label: t('Add Company'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew(),
    }
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Companies') }
  ];

  // Define table columns for list view
  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value: any, row: any) => {
        return (
          <div className="flex items-center gap-3">
            <img
              src={row.avatar}
              alt={row.name}
              className="h-10 w-10 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getImagePath('avatars/avatar.png');
              }}
            />
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-sm text-muted-foreground">{row.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'plan_name',
      label: t('Plan'),
      render: (value: string) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 capitalize">
          {value}
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

  // Define table actions
  const actions = [
    {
      label: t('Login as Company'),
      icon: 'ArrowUpRight',
      action: 'login-as',
      className: 'text-gray-500'
    },
    {
      label: t('Company Info'),
      icon: 'Info',
      action: 'company-info',
      className: 'text-gray-500'
    },
    {
      label: t('Upgrade Plan'),
      icon: 'CreditCard',
      action: 'upgrade-plan',
      className: 'text-gray-500'
    },
    {
      label: t('Reset Password'),
      icon: 'KeyRound',
      action: 'reset-password',
      className: 'text-gray-500'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-gray-500'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-gray-500'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-gray-500'
    }
  ];

  return (
    <PageTemplate
      title={t("Companies")}
      url="/companies"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      description={t("Manage your companies.")}
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
              name: 'start_date',
              label: t('Start Date'),
              type: 'date',
              value: startDate,
              onChange: (date) => setStartDate(date)
            },
            {
              name: 'end_date',
              label: t('End Date'),
              type: 'date',
              value: endDate,
              onChange: (date) => setEndDate(date)
            }
          ]}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          showViewToggle={true}
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            const params: any = { page: 1, view };
            if (searchTerm) params.search = searchTerm;
            if (selectedStatus !== '_empty_') params.status = selectedStatus;
            if (startDate) params.start_date = startDate.toISOString().split('T')[0];
            if (endDate) params.end_date = endDate.toISOString().split('T')[0];
            if (pageFilters.per_page) params.per_page = pageFilters.per_page;
            router.get(route('companies.index'), params, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Content section */}
      {activeView === 'list' ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <CrudTable
            columns={columns}
            actions={actions}
            data={companies?.data || []}
            from={companies?.from || 1}
            onAction={handleAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleSort}
            permissions={permissions}
          />

          {/* Pagination section */}
          <Pagination
            from={companies?.from || 0}
            to={companies?.to || 0}
            total={companies?.total || 0}
            links={companies?.links}
            entityName={t("companies")}
            onPageChange={handlePageChange}
            currentPerPage={pageFilters.per_page?.toString() || "10"}
            onPerPageChange={(value) => {
              const params: any = { page: 1, per_page: value, view: activeView };
              if (searchTerm) params.search = searchTerm;
              if (selectedStatus !== '_empty_') params.status = selectedStatus;
              if (startDate) params.start_date = startDate.toISOString().split('T')[0];
              if (endDate) params.end_date = endDate.toISOString().split('T')[0];
              if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
              if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
              router.get(route('companies.index'), params, { preserveState: true, preserveScroll: true });
            }}
          />
        </div>
      ) : (
        <div>
          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {companies?.data?.map((company: any) => (
              <Card key={company.id} className="group relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    company.status === 'active'
                      ? 'bg-green-50 text-green-700 ring-green-600/20'
                      : 'bg-red-50 text-red-700 ring-red-600/20'
                  }`}>
                    {company.status === 'active' ? t('Active') : t('Inactive')}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* Company Header */}
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="relative">
                      <img
                        src={company.avatar}
                        alt={company.name}
                        className="h-14 w-14 rounded-full object-cover shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getImagePath('avatars/avatar.png');
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {company.email}
                      </p>
                    </div>
                  </div>

                  {/* Plan Information */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {company.plan_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction('upgrade-plan', company)}
                        className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      >
                        {t("Upgrade")}
                      </Button>
                    </div>
                    {company.plan_expiry_date && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {t("Expires")}: {window.appSettings?.formatDateTimeSimple(company.plan_expiry_date, false) || new Date(company.plan_expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('login-as', company)}
                            className="h-8 w-8 p-0 text-gray-500"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("Login as Company")}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('company-info', company)}
                            className="h-8 w-8 p-0 text-gray-500"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("Company Info")}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction('edit', company)}
                            className="h-8 w-8 p-0 text-gray-500"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("Edit")}</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* More Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
                        <DropdownMenuItem onClick={() => handleAction('reset-password', company)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          <span>{t("Reset Password")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('toggle-status', company)}>
                          {company.status === 'active' ?
                            <Lock className="h-4 w-4 mr-2" /> :
                            <Unlock className="h-4 w-4 mr-2" />
                          }
                          <span>{company.status === 'active' ? t("Disable Login") : t("Enable Login")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction('delete', company)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span>{t("Delete")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Hover Effect Overlay - REMOVED */}
              </Card>
            ))}

            {(!companies?.data || companies.data.length === 0) && (
              <div className="col-span-full">
                <div className="text-center py-12">
                  <div className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600 mb-4">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t("No companies found")}</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">{t("Get started by creating your first company")}</p>
                  <Button onClick={handleAddNew} className="inline-flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("Add Company")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination for grid view */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Pagination
                from={companies?.from || 0}
                to={companies?.to || 0}
                total={companies?.total || 0}
                links={companies?.links}
                entityName={t("companies")}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentCompany && <ViewPopup record={currentCompany} />}
      </Dialog>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={(data) => {
          // If login_enabled is false, remove password field
          if (data.login_enabled === false) {
            delete data.password;
          }
          // Set status based on login_enabled
          data.status = data.login_enabled ? 'active' : 'inactive';

          // Remove login_enabled field as it's not needed in the backend
          delete data.login_enabled;
          handleFormSubmit(data);
        }}
        formConfig={{
          fields: [
            { name: 'name', label: t('Company Name'), type: 'text', required: true, placeholder: t('e.g. Acme Corporation') },
            { name: 'email', label: t('Email'), type: 'email', required: true, placeholder: t('e.g. admin@acmecorp.com') },
            {
              name: 'login_enabled',
              label: t('Enable Login'),
              placeholder: '',
              type: 'switch',
              defaultValue: true,
              conditional: (mode) => mode === 'create'
            },
            {
              name: 'password',
              label: t('Password'),
              type: 'password',
              required: (mode) => mode === 'create',
              placeholder: t('Enter password'),
              conditional: (mode, data) => {
                return mode === 'create' && data?.login_enabled === true;
              }
            }
          ],
          modalSize: 'lg'
        }}
        initialData={{
          ...currentCompany,
          login_enabled: currentCompany?.status === 'active'
        }}
        title={
          formMode === 'create'
            ? t('Add New Company')
            : formMode === 'edit'
              ? t('Edit Company')
              : t('View Company')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentCompany?.name || ''}
        entityName="company"
      />

      {/* Reset Password Modal */}
      <CrudFormModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        onSubmit={handleResetPasswordConfirm}
        formConfig={{
          fields: [
            { name: 'password', label: t('New Password'), type: 'password', required: true, placeholder: t('Enter new password') }
          ],
          modalSize: 'sm'
        }}
        initialData={{}}
        title={`Reset Password for ${currentCompany?.name || 'Company'}`}
        mode="edit"
      />

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={isUpgradePlanModalOpen}
        onClose={() => setIsUpgradePlanModalOpen(false)}
        onConfirm={handleUpgradePlanConfirm}
        plans={availablePlans}
        currentPlanId={currentCompany?.plan_id}
        companyName={currentCompany?.name || ''}
      />


    </PageTemplate>
  );
}
