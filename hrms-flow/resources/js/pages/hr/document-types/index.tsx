// pages/hr/document-types/index.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { FileText, Edit, Trash2, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
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

export default function DocumentTypes() {
  const { t } = useTranslation();
  const { auth, documentTypes, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // Filter state
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedRequired, setSelectedRequired] = useState(pageFilters.required || 'all');

  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_required: false,
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());

  const toggleDescription = (id: number) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDescriptions(newExpanded);
  };

  const [formErrors, setFormErrors] = useState<any>({});
  const canCreate = hasPermission(permissions, 'create-document-types');
  const canEdit = hasPermission(permissions, 'edit-document-types');
  const canDelete = hasPermission(permissions, 'delete-document-types');

  // Normalize is_required to boolean
  const normalizeRequired = (value: any): boolean =>
    value === true || value === 1 || value === '1' || value === 'true';

  const resetForm = () => {
    setFormData({ name: '', description: '', is_required: false });
    setFormErrors({});
    setFormMode('create');
    setCurrentItem(null);
  };

  const loadItemForEdit = (item: any) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      is_required: normalizeRequired(item.is_required),
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
    router.get(route('hr.document-types.index'), {
      page: 1,
      search: searchTerm || undefined,
      required: selectedRequired !== 'all' ? selectedRequired : undefined,
      per_page: pageFilters.per_page || 10,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRequired('all');
    router.get(route('hr.document-types.index'), {
      page: 1,
      per_page: pageFilters.per_page || 10,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.document-types.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      required: selectedRequired !== 'all' ? selectedRequired : undefined,
      per_page: pageFilters.per_page || 10,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    switch (action) {
      case 'edit':
        loadItemForEdit(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'delete':
        setCurrentItem(item);
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      ...formData,
      is_required: formData.is_required ? 1 : 0,
    };

    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating document type...'));
      router.post(route('hr.document-types.store'), payload, {
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
            toast.error(t(errors));
          } else {
            toast.error(t('Please check the form for errors'));
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating document type...'));
      router.put(route('hr.document-types.update', currentItem.id), payload, {
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
            toast.error(t(errors));
          } else {
            toast.error(t('Please check the form for errors'));
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting document type...'));
    router.delete(route('hr.document-types.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete document type: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Organization Structure') },
    { title: t('Document Types') }
  ];

  const isFilterActive = searchTerm || selectedRequired !== 'all';

  return (
    <PageTemplate
      title={t('Document Types')}
      description={t("Manage document types used for employee records.")}
      url="/hr/document-types"
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side - Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formMode === 'create' ? t('Add New Document Type') : t('Edit Document Type')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formMode === 'create'
                  ? t('Fill in the details to create a new document type')
                  : t('Update the document type details below')}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label required htmlFor="name" className="required">{t('Document Type Name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('e.g., Passport, National ID, Contract')}
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
                  placeholder={t('Brief description of the document type')}
                  rows={3}
                  className={formErrors.description ? 'border-red-500' : ''}
                  disabled={!canCreate && !canEdit}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>

              {/* Is Required */}
              <div className="space-y-2">
                <Label htmlFor="is_required">{t('Required')}</Label>
                <Select
                  value={formData.is_required ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData({ ...formData, is_required: value === 'yes' })}
                  disabled={!canCreate && !canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t('Required')}</SelectItem>
                    <SelectItem value="no">{t('Optional')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Is this document required for all employees?')}
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {(canCreate || canEdit) && (
                  <Button type="submit" className="flex-1">
                    {formMode === 'create' ? t('Add Document Type') : t('Update Document Type')}
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
                    placeholder={t('Search document types...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} variant="default">
                  {t('Search')}
                </Button>
                {isFilterActive && (
                  <Button onClick={handleResetFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    {t('Reset')}
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={selectedRequired} onValueChange={setSelectedRequired}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('All')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All')}</SelectItem>
                    <SelectItem value="yes">{t('Required')}</SelectItem>
                    <SelectItem value="no">{t('Optional')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(documentTypes?.data || []).length > 0 ? (
              <>
                {/* Table Header */}
                {/* <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('Document Types')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('Manage document types required for employee records')}
                  </p>
                </div> */}

                {/* Desktop Table */}
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
                              {t('Name')}
                              {pageFilters.sort_field === 'name' ? (
                                pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓'
                              ) : (
                                <span className="opacity-40">↕</span>
                              )}
                            </div>
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider dark:bg-gray-900">
                            {t('Required')}
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 tracking-wider dark:bg-gray-900 pr-[25px]">
                            {t('Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(documentTypes?.data || []).map((item: any) => {
                          const isRequired = normalizeRequired(item.is_required);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              {/* Name */}
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {item.name}
                                    </div>
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
                                            {expandedDescriptions.has(item.id) ? (
                                              <><ChevronUp className="h-3 w-3 mr-1" />{t('Show less')}</>
                                            ) : (
                                                <><ChevronDown className="h-3 w-3 mr-1" />{t('Show more')}</>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Required */}
                              <td className="px-3 py-4">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                  isRequired
                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                    : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                                }`}>
                                  {isRequired ? t('Required') : t('Optional')}
                                </span>
                              </td>


                              {/* Actions */}
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAction('edit', item)}
                                      className="h-8 w-8 p-0 text-gray-500"
                                      title={t('Edit')}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAction('delete', item)}
                                      className="h-8 w-8 p-0 text-gray-500"
                                      title={t('Delete')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {(documentTypes?.data || []).map((item: any) => {
                    const isRequired = normalizeRequired(item.is_required);
                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </h3>
                              {item.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2" title={item.description}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction('edit', item)}
                                className="h-8 w-8 p-0 text-gray-500"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction('delete', item)}
                                className="h-8 w-8 p-0 text-gray-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Required')}</p>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              isRequired
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                            }`}>
                              {isRequired ? t('Required') : t('Optional')}
                            </span>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {documentTypes?.total > (documentTypes?.per_page || 10) && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <Pagination
                      from={documentTypes?.from || 0}
                      to={documentTypes?.to || 0}
                      total={documentTypes?.total || 0}
                      links={documentTypes?.links}
                      entityName={t('document types')}
                      hidePerPage
                      onPageChange={(url) => {
                        const page = new URL(url).searchParams.get('page');
                        router.get(route('hr.document-types.index'), {
                          page,
                          per_page: pageFilters.per_page || 10,
                          search: searchTerm || undefined,
                          required: selectedRequired !== 'all' ? selectedRequired : undefined,
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
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('No document types found')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  {isFilterActive
                    ? t('No document types match your search criteria. Try adjusting your filters.')
                    : t('Create document types to categorize employee documents.')}
                </p>
                {!isFilterActive && canCreate && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('Use the form on the left to add your first document type.')}
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
        entityName="document type"
      />
    </PageTemplate>
  );
}
