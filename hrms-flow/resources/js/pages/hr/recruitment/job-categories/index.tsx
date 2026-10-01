import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Briefcase, Edit, Trash2, Search, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';
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

export default function JobCategories() {
  const { t } = useTranslation();
  const { auth, jobCategories, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // ── filter state ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]     = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || 'all');

  // ── ui state ────────────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem]             = useState<any>(null);
  const [formMode, setFormMode]                   = useState<'create' | 'edit'>('create');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

  // ── form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [formErrors, setFormErrors] = useState<any>({});

  const canCreate = hasPermission(permissions, 'create-job-categories');
  const canEdit   = hasPermission(permissions, 'edit-job-categories');
  const canDelete = hasPermission(permissions, 'delete-job-categories');

  const toggleDescription = (id: number) => {
    const next = new Set(expandedDescriptions);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedDescriptions(next);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', status: 'active' });
    setFormErrors({});
    setFormMode('create');
    setCurrentItem(null);
  };

  const loadItemForEdit = (item: any) => {
    setFormData({
      name:        item.name        || '',
      description: item.description || '',
      status:      item.status      || 'active',
    });
    setFormMode('edit');
    setCurrentItem(item);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: any = {};
    if (!formData.name.trim()) {
      errors.name = t('Category name is required');
    } else if (formData.name.trim().length > 255) {
      errors.name = t('Name must not exceed 255 characters');
    }
    if (!['active', 'inactive'].includes(formData.status)) {
      errors.status = t('Please select a valid status');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── filters / sort / pagination ─────────────────────────────────────────────
  const applyFilters = (overrides: Record<string, any> = {}) => {
    router.get(route('hr.recruitment.job-categories.index'), {
      page:           1,
      search:         searchTerm   || undefined,
      status:         statusFilter !== 'all' ? statusFilter : undefined,
      per_page:       pageFilters.per_page || 10,
      sort_field:     pageFilters.sort_field     || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      ...overrides,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    router.get(route('hr.recruitment.job-categories.index'), {
      page:     1,
      per_page: pageFilters.per_page || 10,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    applyFilters({ sort_field: field, sort_direction: direction });
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating job category...'));
      router.post(route('hr.recruitment.job-categories.store'), formData, {
        onSuccess: (page) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) { toast.success(t(page.props.flash.success)); resetForm(); }
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          setFormErrors(errors);
          toast.error(t('Please check the form for errors'));
        },
      });
    } else {
      if (!globalSettings?.is_demo) toast.loading(t('Updating job category...'));
      router.put(route('hr.recruitment.job-categories.update', currentItem.id), formData, {
        onSuccess: (page) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) { toast.success(t(page.props.flash.success)); resetForm(); }
          else if (page.props.flash.error) toast.error(t(page.props.flash.error));
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          setFormErrors(errors);
          toast.error(t('Please check the form for errors'));
        },
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting job category...'));
    router.delete(route('hr.recruitment.job-categories.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string'
          ? t(errors)
          : t('Failed to delete job category: {{errors}}', { errors: Object.values(errors).join(', ') }));
      },
    });
  };

  const handleToggleStatus = (item: any) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) {
      toast.loading(newStatus === 'active' ? t('Activating job category...') : t('Deactivating job category...'));
    }
    router.put(route('hr.recruitment.job-categories.toggle-status', item.id), {}, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string'
          ? t(errors)
          : t('Failed to update status: {{errors}}', { errors: Object.values(errors).join(', ') }));
      },
    });
  };

  const breadcrumbs = [
    { title: t('Dashboard'),   href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Job Categories') },
  ];

  const isFilterActive = !!searchTerm || statusFilter !== 'all';

  const SortIcon = ({ field }: { field: string }) =>
    pageFilters.sort_field === field
      ? <span>{pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓'}</span>
      : <span className="opacity-40">↕</span>;

  return (
    <PageTemplate
      title={t('Job Categories')}
      description={t("Manage job categories used to classify open positions.")}
      url="/hr/recruitment/job-categories"
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Form ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formMode === 'create' ? t('Add New Job Category') : t('Edit Job Category')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formMode === 'create'
                  ? t('Fill in the details to create a new job category')
                  : t('Update the job category details below')}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label required htmlFor="name" className="required">
                  {t('Category Name')}
                </Label>
                <Input
                required
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('e.g., Engineering, Marketing, Finance')}
                  className={formErrors.name ? 'border-red-500' : ''}
                  disabled={!canCreate && !canEdit}
                />
                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('Description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('Brief description of the job category')}
                  rows={3}
                  className={formErrors.description ? 'border-red-500' : ''}
                  disabled={!canCreate && !canEdit}
                />
                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label required htmlFor="status" className="required">
                  {t('Status')}
                </Label>
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
                {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {(canCreate || canEdit) && (
                  <Button type="submit" className="flex-1">
                    {formMode === 'create' ? t('Add Job Category') : t('Update Job Category')}
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

        {/* ── Right: Table ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search & Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('Search job categories...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} variant="default">{t('Search')}</Button>
                {isFilterActive && (
                  <Button onClick={handleResetFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />{t('Reset')}
                  </Button>
                )}
              </div>

              {/* Status filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(jobCategories?.data || []).length > 0 ? (
              <>
                {/* <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Job Categories')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('Manage job categories used in recruitment')}
                  </p>
                </div> */}

                {/* Desktop table */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider cursor-pointer select-none dark:bg-gray-900"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            {t('Name')} <SortIcon field="name" />
                          </div>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider dark:bg-gray-900">
                          {t('Status')}
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider dark:bg-gray-900 pr-[50px]">
                          {t('Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {(jobCategories?.data || []).map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">

                          {/* Name + description */}
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Briefcase className="h-5 w-5" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                    <div className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}>
                                      {item.description}
                                    </div>
                                    {item.description.length > 60 && (
                                      <button
                                        onClick={() => toggleDescription(item.id)}
                                        className="inline-flex items-center mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                      >
                                        {expandedDescriptions.has(item.id)
                                          ? <><ChevronUp className="h-3 w-3 mr-1" />{t('Show less')}</>
                                          : <><ChevronDown className="h-3 w-3 mr-1" />{t('Show more')}</>}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-4">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              item.status === 'active'
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-red-50 text-red-700 ring-red-600/20'
                            }`}>
                              {item.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => loadItemForEdit(item)}
                                    className="h-8 w-8 p-0 text-gray-500"
                                    title={t('Edit')}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={() => handleToggleStatus(item)}
                                    className="h-8 w-8 p-0 text-gray-500"
                                    title={item.status === 'active' ? t('Deactivate') : t('Activate')}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => { setCurrentItem(item); setIsDeleteModalOpen(true); }}
                                  className="h-8 w-8 p-0 text-gray-500"
                                  title={t('Delete')}
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

                {/* Mobile cards */}
                <div className="lg:hidden space-y-4">
                  {(jobCategories?.data || []).map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2" title={item.description}>{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => loadItemForEdit(item)} className="h-8 w-8 p-0 text-gray-500">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(item)} className="h-8 w-8 p-0 text-gray-500">
                                <Lock className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" onClick={() => { setCurrentItem(item); setIsDeleteModalOpen(true); }} className="h-8 w-8 p-0 text-gray-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Status')}</p>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            item.status === 'active'
                              ? 'bg-green-50 text-green-700 ring-green-600/20'
                              : 'bg-red-50 text-red-700 ring-red-600/20'
                          }`}>
                            {item.status === 'active' ? t('Active') : t('Inactive')}
                          </span>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {jobCategories?.total > (jobCategories?.per_page || 10) && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      from={jobCategories?.from || 0}
                      to={jobCategories?.to || 0}
                      total={jobCategories?.total || 0}
                      links={jobCategories?.links}
                      entityName={t('job categories')}
                      hidePerPage
                      onPageChange={(url) => {
                        const page = new URL(url).searchParams.get('page');
                        router.get(route('hr.recruitment.job-categories.index'), {
                          page,
                          per_page:       pageFilters.per_page || 10,
                          search:         searchTerm   || undefined,
                          status:         statusFilter !== 'all' ? statusFilter : undefined,
                          sort_field:     pageFilters.sort_field     || undefined,
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
                  <Briefcase className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('No job categories found')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  {isFilterActive
                    ? t('No job categories match your search criteria. Try adjusting your filters.')
                    : t('Create job categories to organize your recruitment process.')}
                </p>
                {!isFilterActive && canCreate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('Use the form on the left to add your first job category.')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="job category"
      />
    </PageTemplate>
  );
}
