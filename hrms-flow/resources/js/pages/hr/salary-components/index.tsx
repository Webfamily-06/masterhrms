// pages/hr/salary-components/index.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { DollarSign, Percent, Edit, Trash2, Lock, TrendingUp, TrendingDown, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SalaryComponents() {
  const { t } = useTranslation();
  const { auth, salaryComponents, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedType, setSelectedType] = useState(pageFilters.type || 'all');
  const [selectedCalculationType, setSelectedCalculationType] = useState(pageFilters.calculation_type || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'earning',
    calculation_type: 'fixed',
    default_amount: '',
    percentage_of_basic: '',
    is_taxable: true,
    is_mandatory: false,
    status: 'active'
  });

  const [formErrors, setFormErrors] = useState<any>({});

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'earning',
      calculation_type: 'fixed',
      default_amount: '',
      percentage_of_basic: '',
      is_taxable: true,
      is_mandatory: false,
      status: 'active'
    });
    setFormErrors({});
    setFormMode('create');
    setCurrentItem(null);
  };

  // Load item for editing
  const loadItemForEdit = (item: any) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      type: item.type || 'earning',
      calculation_type: item.calculation_type || 'fixed',
      default_amount: item.default_amount || '',
      percentage_of_basic: item.percentage_of_basic || '',
      is_taxable: item.is_taxable ?? true,
      is_mandatory: item.is_mandatory ?? false,
      status: item.status || 'active'
    });
    setFormMode('edit');
    setCurrentItem(item);
    setFormErrors({});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.salary-components.index'), {
      page: 1,
      search: searchTerm || undefined,
      type: selectedType !== 'all' ? selectedType : undefined,
      calculation_type: selectedCalculationType !== 'all' ? selectedCalculationType : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page || 10
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCalculationType('all');
    setSelectedStatus('all');

    router.get(route('hr.salary-components.index'), {
      page: 1,
      per_page: pageFilters.per_page || 10
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'edit':
        loadItemForEdit(item);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'toggle-status':
        handleToggleStatus(item);
        break;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating salary component...'));

      router.post(route('hr.salary-components.store'), formData, {
        onSuccess: (page) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
            resetForm();
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          setFormErrors(errors);
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(t('Please check the form for errors'));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating salary component...'));

      router.put(route('hr.salary-components.update', currentItem.id), formData, {
        onSuccess: (page) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
            resetForm();
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          setFormErrors(errors);
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(t('Please check the form for errors'));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting salary component...'));

    router.delete(route('hr.salary-components.destroy', currentItem.id), {
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
          toast.error(`Failed to delete salary component: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleToggleStatus = (component: any) => {
    const newStatus = component.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} salary component...`);

    router.put(route('hr.salary-components.toggle-status', component.id), {}, {
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
          toast.error(`Failed to update salary component status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const toggleDescription = (componentId: number) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId);
    } else {
      newExpanded.add(componentId);
    }
    setExpandedDescriptions(newExpanded);
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Payroll Management') },
    { title: t('Salary Components') }
  ];

  const canCreate = hasPermission(permissions, 'create-salary-components');
  const canEdit = hasPermission(permissions, 'edit-salary-components');
  const canDelete = hasPermission(permissions, 'delete-salary-components');

  return (
    <PageTemplate
      title={t("Salary Components")}
      description={t("Define earnings and deductions used in payroll calculations.")}
      url="/hr/salary-components"
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formMode === 'create' ? t('Add New Component') : t('Edit Component')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formMode === 'create'
                  ? t('Fill in the details to create a new salary component')
                  : t('Update the component details below')}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Component Name */}
              <div className="space-y-2">
                <Label required htmlFor="name" className="required">{t('Component Name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('e.g., Basic Salary, HRA, Tax')}
                  className={formErrors.name ? 'border-red-500' : ''}
                  disabled={!canCreate && !canEdit}
                  required
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('Description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('Brief description of the component')}
                  rows={3}
                  className={formErrors.description ? 'border-red-500' : ''}
                  disabled={!canCreate && !canEdit}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label required htmlFor="type" className="required">{t('Type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={!canCreate && !canEdit}
                >
                  <SelectTrigger className={formErrors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">{t('Earning')}</SelectItem>
                    <SelectItem value="deduction">{t('Deduction')}</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.type && (
                  <p className="text-sm text-red-500">{formErrors.type}</p>
                )}
              </div>

              {/* Calculation Type */}
              <div className="space-y-2">
                <Label required htmlFor="calculation_type" className="required">{t('Calculation Type')} </Label>
                <Select
                  value={formData.calculation_type}
                  onValueChange={(value) => setFormData({ ...formData, calculation_type: value })}
                  disabled={!canCreate && !canEdit}
                >
                  <SelectTrigger className={formErrors.calculation_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select calculation type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                    <SelectItem value="percentage">{t('Percentage of Basic')}</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.calculation_type && (
                  <p className="text-sm text-red-500">{formErrors.calculation_type}</p>
                )}
              </div>

              {/* Conditional Fields based on Calculation Type */}
              {formData.calculation_type === 'fixed' ? (
                <div className="space-y-2">
                  <Label required htmlFor="default_amount" className="required">{t('Fixed Amount')} </Label>
                  <Input
                    id="default_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.default_amount}
                    onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
                    placeholder="0.00"
                    className={formErrors.default_amount ? 'border-red-500' : ''}
                    disabled={!canCreate && !canEdit}
                    required
                  />
                  {formErrors.default_amount && (
                    <p className="text-sm text-red-500">{formErrors.default_amount}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="percentage_of_basic" className="required">{t('Percentage of Basic')}</Label>
                  <Input
                    id="percentage_of_basic"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentage_of_basic}
                    onChange={(e) => setFormData({ ...formData, percentage_of_basic: e.target.value })}
                    placeholder="0.00"
                    className={formErrors.percentage_of_basic ? 'border-red-500' : ''}
                    disabled={!canCreate && !canEdit}
                  />
                  {formErrors.percentage_of_basic && (
                    <p className="text-sm text-red-500">{formErrors.percentage_of_basic}</p>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label required htmlFor="status">{t('Status')} </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={!canCreate && !canEdit}
                >
                  <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {(canCreate || canEdit) && (
                  <Button type="submit" className="flex-1">
                    {formMode === 'create' ? t('Add Component') : t('Update Component')}
                  </Button>
                )}
                {formMode === 'edit' && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {t('Cancel')}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('Search components...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} variant="default">
                  {t('Search')}
                </Button>
                {(searchTerm || selectedType !== 'all' || selectedCalculationType !== 'all' || selectedStatus !== 'all') && (
                  <Button onClick={handleResetFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    {t('Reset')}
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('All Types')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Types')}</SelectItem>
                    <SelectItem value="earning">{t('Earning')}</SelectItem>
                    <SelectItem value="deduction">{t('Deduction')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCalculationType} onValueChange={setSelectedCalculationType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('All Calculations')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Calculations')}</SelectItem>
                    <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                    <SelectItem value="percentage">{t('Percentage')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('All Statuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Statuses')}</SelectItem>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Components Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(salaryComponents?.data || []).length > 0 ? (
              <>
                {/* Table Header */}
                {/* <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('Salary Components')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('Manage your payroll components and their calculation methods')}
                  </p>
                </div> */}

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300  tracking-wider dark:bg-gray-900">
                            {t('Component')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300  tracking-wider dark:bg-gray-900">
                            {t('Type')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300  tracking-wider dark:bg-gray-900">
                            {t('Amount')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300  tracking-wider dark:bg-gray-900">
                            {t('Status')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300  tracking-wider dark:bg-gray-900 pr-[50px]">
                            {t('Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(salaryComponents?.data || []).map((component: any) => (
                          <tr key={component.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {/* Component Name & Description */}
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${component.type === 'earning'
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                  {component.type === 'earning' ? (
                                    <TrendingUp className="h-5 w-5" />
                                  ) : (
                                    <TrendingDown className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {component.name}
                                  </div>
                                  {component.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                      <div className={expandedDescriptions.has(component.id) ? '' : 'line-clamp-2'}>
                                        {component.description}
                                      </div>
                                      {component.description.length > 60 && (
                                        <button
                                          onClick={() => toggleDescription(component.id)}
                                          className="inline-flex items-center mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                        >
                                          {expandedDescriptions.has(component.id) ? (
                                            <>
                                              <ChevronUp className="h-3 w-3 mr-1" />
                                              {t('Show less')}
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="h-3 w-3 mr-1" />
                                              {t('Show more')}
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-3 py-4">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${component.type === 'earning'
                                  ? 'bg-green-50 text-green-700 ring-green-600/20'
                                  : 'bg-red-50 text-red-700 ring-red-600/20'
                                }`}>
                                {component.type === 'earning' ? t('Earning') : t('Deduction')}
                              </span>
                            </td>

                            {/* Amount/Rate */}
                            <td className="px-3 py-4">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                {component.calculation_type === 'fixed'
                                  ? window.appSettings?.formatCurrency(component.default_amount)
                                  : `${component.percentage_of_basic}%`}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {component.calculation_type === 'fixed' ? t('Fixed amount') : t('Of basic salary')}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-4">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${component.status === 'active'
                                  ? 'bg-green-50 text-green-700 ring-green-600/20'
                                  : 'bg-red-50 text-red-700 ring-red-600/20'
                                }`}>
                                {component.status === 'active' ? t('Active') : t('Inactive')}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction('edit', component)}
                                    className="h-8 w-8 p-0 text-gray-500"
                                    title={t('Edit Component')}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction('toggle-status', component)}
                                    className="h-8 w-8 p-0 text-gray-500"
                                    title={component.status === 'active' ? t('Deactivate') : t('Activate')}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction('delete', component)}
                                    className="h-8 w-8 p-0 text-gray-500"
                                    title={t('Delete Component')}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden space-y-4">
                  {(salaryComponents?.data || []).map((component: any) => (
                    <div
                      key={component.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${component.type === 'earning'
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {component.type === 'earning' ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {component.name}
                            </h3>
                            {component.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2" title={component.description}>
                                {component.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction('edit', component)}
                              className="h-8 w-8 p-0 text-gray-500"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction('toggle-status', component)}
                              className="h-8 w-8 p-0 text-gray-500"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction('delete', component)}
                              className="h-8 w-8 p-0 text-gray-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Type & Calculation')}</p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${component.type === 'earning'
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-red-50 text-red-700 ring-red-600/20'
                              }`}>
                              {component.type === 'earning' ? t('Earning') : t('Deduction')}
                            </span>
                            <span className={`inline-flex items-center text-xs ${component.calculation_type === 'fixed'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-purple-600 dark:text-purple-400'
                              }`}>
                              {component.calculation_type === 'fixed' ? (
                                <><DollarSign className="h-3 w-3 mr-1" />{t('Fixed')}</>
                              ) : (
                                <><Percent className="h-3 w-3 mr-1" />{t('%')}</>
                              )}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Amount')}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {component.calculation_type === 'fixed'
                              ? window.appSettings?.formatCurrency(component.default_amount)
                              : `${component.percentage_of_basic}%`}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Properties')}</p>
                          <div className="flex flex-wrap gap-1">
                            {component.is_taxable && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-yellow-50 text-yellow-700 ring-yellow-600/20">
                                {t('Taxable')}
                              </span>
                            )}
                            {component.is_mandatory && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-orange-50 text-orange-700 ring-orange-600/20">
                                {t('Mandatory')}
                              </span>
                            )}
                            {!component.is_taxable && !component.is_mandatory && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {t('Optional')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Status')}</p>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${component.status === 'active'
                              ? 'bg-green-50 text-green-700 ring-green-600/20'
                              : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                            {component.status === 'active' ? t('Active') : t('Inactive')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {salaryComponents?.total > (salaryComponents?.per_page || 10) && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      from={salaryComponents?.from || 0}
                      to={salaryComponents?.to || 0}
                      total={salaryComponents?.total || 0}
                      links={salaryComponents?.links}
                      entityName={t("components")}
                      hidePerPage
                      onPageChange={(url) => {
                        const page = new URL(url).searchParams.get('page');
                        router.get(route('hr.salary-components.index'), {
                          page,
                          per_page: pageFilters.per_page || 10,
                          search: searchTerm || undefined,
                          type: selectedType !== 'all' ? selectedType : undefined,
                          calculation_type: selectedCalculationType !== 'all' ? selectedCalculationType : undefined,
                          status: selectedStatus !== 'all' ? selectedStatus : undefined,
                          sort_field: pageFilters.sort_field || undefined,
                          sort_direction: pageFilters.sort_direction || undefined,
                        }, { preserveState: true, preserveScroll: true });
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('No salary components found')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  {searchTerm || selectedType !== 'all' || selectedCalculationType !== 'all' || selectedStatus !== 'all'
                    ? t('No components match your search criteria. Try adjusting your filters.')
                    : t('Create salary components to define earnings and deductions for your payroll system.')}
                </p>
                {!searchTerm && selectedType === 'all' && selectedCalculationType === 'all' && selectedStatus === 'all' && canCreate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('Use the form on the left to add your first component.')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="salary component"
      />
    </PageTemplate>
  );
}
