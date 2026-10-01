// pages/hr/attendance-policies/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Clock, DollarSign, Shield, Users, Eye, Edit, Trash2, Lock, CheckCircle, LayoutGrid, CheckCircle2, XCircle, ShieldX } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import View from './view';

export default function AttendancePolicies() {
  const { t } = useTranslation();
  const { auth, attendancePolicies, stats, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedStatus !== '_empty_';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.attendance-policies.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.attendance-policies.index'), {
      page,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.attendance-policies.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
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
      if (!globalSettings?.is_demo) toast.loading(t('Creating attendance policy...'));

      router.post(route('hr.attendance-policies.store'), formData, {
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
            toast.error(errors);
          } else {
            toast.error(`Failed to create attendance policy: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating attendance policy...'));

      router.put(route('hr.attendance-policies.update', currentItem.id), formData, {
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
            toast.error(errors);
          } else {
            toast.error(`Failed to update attendance policy: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting attendance policy...'));

    router.delete(route('hr.attendance-policies.destroy', currentItem.id), {
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
          toast.error(errors);
        } else {
          toast.error(`Failed to delete attendance policy: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleToggleStatus = (policy: any) => {
    const newStatus = policy.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} attendance policy...`);

    router.put(route('hr.attendance-policies.toggle-status', policy.id), {}, {
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
          toast.error(errors);
        } else {
          toast.error(`Failed to update attendance policy status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.attendance-policies.index'));
  };

  // Define page actions
  const pageActions = [];

  // Add the "Add New Attendance Policy" button if user has permission
  if (hasPermission(permissions, 'create-attendance-policies')) {
    pageActions.push({
      label: t('Add Attendance Policy'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Attendance') },
    { title: t('Attendance Policies') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('Policy Name'),
      sortable: true
    },
    {
      key: 'late_arrival_grace',
      label: t('Late Grace (mins)'),
      render: (value: number) => (
        <span className="font-mono text-orange-600">{value}</span>
      )
    },
    {
      key: 'early_departure_grace',
      label: t('Early Grace (mins)'),
      render: (value: number) => (
        <span className="font-mono text-blue-600">{value}</span>
      )
    },
    {
      key: 'overtime_rate_per_hour',
      label: t('Overtime Rate'),
      render: (value: number) => (
        <span className="font-mono text-green-600">{window.appSettings?.formatCurrency(value)}/hr</span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
            ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
            : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
            }`}>
            {value === 'active' ? t('Active') : t('Inactive')}
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
      requiredPermission: 'view-attendance-policies'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-attendance-policies'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-attendance-policies'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-attendance-policies'
    }
  ];

  const statusTabs = [
    { value: '_empty_',  label: t('All'),      icon: <LayoutGrid className="h-4 w-4" />,   count: statusCounts.all      ?? (attendancePolicies?.total || 0) },
    { value: 'active',   label: t('Active'),   icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active   ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />,      count: statusCounts.inactive ?? 0 },
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedStatus]);

  // Render policy card
  const renderPolicyCard = (policy: any) => {
    return (
      <Card key={policy.id} className="group hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {policy.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${policy.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                    {policy.status === 'active' ? t('Active') : t('Inactive')}
                  </span>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {hasPermission(permissions, 'view-attendance-policies') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('view', policy)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('View Policy')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'edit-attendance-policies') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('edit', policy)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('Edit Policy')}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'edit-attendance-policies') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('toggle-status', policy)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={policy.status === 'active' ? t('Deactivate Policy') : t('Activate Policy')}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              )}
              {hasPermission(permissions, 'delete-attendance-policies') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('delete', policy)}
                  className="h-8 w-8 p-0 text-gray-500"
                  title={t('Delete Policy')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {policy.late_arrival_grace} {t('minutes')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Late Arrival Grace')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {policy.early_departure_grace} {t('minutes')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Early Departure Grace')}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                    {window.appSettings?.formatCurrency(policy.overtime_rate_per_hour)}/hr
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('Overtime Rate')}</p>
                </div>
              </div>
            </div>
          </div>
          {policy.description && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{policy.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTemplate
      title={t("Attendance Policies")}
      description={t("Manage attendance rules and policies for your organization.")}
      url="/hr/attendance-policies"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >

    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 dark:bg-gray-700/40 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Policies')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('All policies')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <Shield className="h-7 w-7 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      </div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Active Policies')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.active || 0}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Currently active')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Avg Late Grace')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.avg_late_grace || 0} <span className="text-sm font-medium text-gray-500">{t('min')}</span></p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('Late arrival grace')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
            <Clock className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Avg Overtime Rate')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{window.appSettings?.formatCurrency(stats?.avg_overtime_rate || 0)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('Per hour')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
            <DollarSign className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    </div>
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Content section */}
      <div className="space-y-6">

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {attendancePolicies?.data?.map((policy: any) => renderPolicyCard(policy))}
        </div>
        {attendancePolicies?.data?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <ShieldX className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('No attendance policies found')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('Try adjusting your filters or search term')}</p>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700  overflow-hidden">
          <Pagination
            from={attendancePolicies?.from || 0}
            to={attendancePolicies?.to || 0}
            total={attendancePolicies?.total || 0}
            links={attendancePolicies?.links}
            entityName={t("attendance policies")}
            onPageChange={handlePageChange}
            perPageOptions={[9, 27, 45, 90]}
            currentPerPage={pageFilters.per_page?.toString() || '9'}
            onPerPageChange={(value) => {
              router.get(route('hr.attendance-policies.index'), {
                page: 1,
                per_page: value,
                search: searchTerm || undefined,
                status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
              }, { preserveState: true, preserveScroll: true });
            }}
          />
        </div>
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            { name: 'name', label: t('Policy Name'), type: 'text', required: true, placeholder: t('e.g. Standard Attendance Policy') },
            { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('e.g. Default attendance policy for all employees...') },
            { name: 'late_arrival_grace', label: t('Late Arrival Grace (minutes)'), type: 'number', required: true, min: 0, placeholder: t('e.g. 15'), defaultValue: 15 },
            { name: 'early_departure_grace', label: t('Early Departure Grace (minutes)'), type: 'number', required: true, min: 0, placeholder: t('e.g. 15'), defaultValue: 15 },
            { name: 'overtime_rate_per_hour', label: t('Overtime Rate Per Hour'), type: 'number', required: true, min: 0, step: 0.01, placeholder: t('e.g. 150.00'), defaultValue: 150 },
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
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Attendance Policy')
            : t('Edit Attendance Policy')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="attendance policy"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View policy={viewingItem} />}
      </Dialog>
    </PageTemplate>
  );
}
