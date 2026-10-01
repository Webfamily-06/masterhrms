import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Plus, FileText, Code, Star, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Generate from './generate';

export default function DocumentTemplates() {
  const { t } = useTranslation();
  const { auth, documentTemplates, statusCounts = {}, categories, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const { flash } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // Show flash error only — for permission denied errors from router.get() navigations (view, edit)
  // flash.success is intentionally excluded here to avoid duplicate toasts with onSuccess handlers
  useEffect(() => {
    if (flash?.error) toast.error(t(flash.error));
  }, [flash?.error]);

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [categoryFilter, setCategoryFilter] = useState(pageFilters.category_id || '_empty_');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [defaultFilter, setDefaultFilter] = useState(pageFilters.is_default || '_empty_');
  const [pageInitialState, setPageInitialState] = useState(true);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [categoryFilter, statusFilter, defaultFilter]);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return categoryFilter !== '_empty_' || statusFilter !== '_empty_' || defaultFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (categoryFilter !== '_empty_' ? 1 : 0) + (statusFilter !== '_empty_' ? 1 : 0) + (defaultFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.documents.document-templates.index'), {
      page: 1,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_default: defaultFilter !== '_empty_' ? defaultFilter : undefined,
      per_page: pageFilters.per_page || 10,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.documents.document-templates.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_default: defaultFilter !== '_empty_' ? defaultFilter : undefined,
      per_page: pageFilters.per_page || 10,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.documents.document-templates.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      is_default: defaultFilter !== '_empty_' ? defaultFilter : undefined,
      per_page: pageFilters.per_page || 10
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.documents.document-templates.show', item.id));
        break;
      case 'edit':
        router.get(route('hr.documents.document-templates.edit', item.id));
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'toggle-status':
        handleToggleStatus(item);
        break;
      case 'preview':
        setCurrentItem(item);
        setIsPreviewModalOpen(true);
        break;
      case 'generate':
        setCurrentItem(item);
        setIsGenerateModalOpen(true);
        break;
    }
  };

  const handleAddNew = () => {
    router.get(route('hr.documents.document-templates.create'));
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting document template...'));

    router.delete(route('hr.documents.document-templates.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
      },
      onError: (errors) => {
        toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      }
    });
  };

  const handleToggleStatus = (template: any) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} document template...`);

    router.put(route('hr.documents.document-templates.toggle-status', template.id), {}, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
      },
      onError: (errors) => {
        toast.dismiss();
        toast.error(typeof errors === 'string' ? errors : Object.values(errors).join(', '));
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.documents.document-templates.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-document-templates')) {
    pageActions.push({
      label: t('Add Template'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Documents & Contracts') },
    { title: t('Document Templates') }
  ];

  const columns = [
    {
      key: 'name',
      label: t('Template Name'),
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: row.category?.color || '#3B82F6' }}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {value}
              {row.is_default && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            <div className="text-xs text-gray-500">{row.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category.name',
      label: t('Category'),
      render: (_, row) => row.category?.name || '-'
    },
    {
      key: 'placeholders',
      label: t('Placeholders'),
      render: (value) => {
        if (!value || !Array.isArray(value) || value.length === 0) return '-';
        return (
          <div className="flex items-center gap-1">
            <Code className="h-4 w-4 text-gray-500" />
            <span>{value.length} {t('placeholders')}</span>
          </div>
        );
      }
    },
    {
      key: 'file_format',
      label: t('Format'),
      render: (value) => (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {value.toUpperCase()}
        </span>
      )
    },
    {
      key: 'template_content',
      label: t('Content Length'),
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value ? `${value.length} ${t('characters')}` : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            value === 'active'
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}>
            {value === 'active' ? t('Active') : t('Inactive')}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Created'),
      sortable: true,
      type: 'date'
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-document-templates'
    },
    {
      label: t('Preview'),
      icon: 'FileText',
      action: 'preview',
      className: 'text-purple-500',
      requiredPermission: 'view-document-templates'
    },
    {
      label: t('Generate'),
      icon: 'Download',
      action: 'generate',
      className: 'text-green-500',
      requiredPermission: 'view-document-templates'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-document-templates'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-document-templates'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-document-templates'
    }
  ];

  const categoryOptions = [
    { value: '_empty_', label: t('All Categories') },
    ...(categories || []).map((cat: any) => ({
      value: cat.id.toString(),
      label: cat.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
  ];

  const defaultOptions = [
    { value: '_empty_', label: t('All') },
    { value: 'true', label: t('Default') },
    { value: 'false', label: t('Custom') }
  ];

  const categorySelectOptions = [
    { value: '_empty_', label: t('Select Category') },
    ...(categories || []).map((cat: any) => ({
      value: cat.id.toString(),
      label: cat.name
    }))
  ];

  const fileFormatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC' },
    { value: 'docx', label: 'DOCX' },
    { value: 'txt', label: 'TXT' }
  ];

  return (
    <PageTemplate
      title={t("Document Templates")}
      description={t("Reusable templates for generating HR documents.")}
      url="/hr/documents/document-templates"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
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
              name: 'category_id',
              label: t('Category'),
              type: 'select',
              value: categoryFilter,
              searchable: true,
              onChange: setCategoryFilter,
              options: categoryOptions
            },
            {
              name: 'is_default',
              label: t('Type'),
              type: 'select',
              value: defaultFilter,
              onChange: setDefaultFilter,
              options: defaultOptions
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={documentTemplates?.data || []}
          from={documentTemplates?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-document-templates',
            create: 'create-document-templates',
            edit: 'edit-document-templates',
            delete: 'delete-document-templates'
          }}
        />

        <Pagination
          from={documentTemplates?.from || 0}
          to={documentTemplates?.to || 0}
          total={documentTemplates?.total || 0}
          links={documentTemplates?.links}
          entityName={t("document templates")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.documents.document-templates.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              category_id: categoryFilter !== '_empty_' ? categoryFilter : undefined,
              status: statusFilter !== '_empty_' ? statusFilter : undefined,
              is_default: defaultFilter !== '_empty_' ? defaultFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="document template"
      />

      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {t('Template Preview')}: {currentItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto max-h-[60vh] pr-1">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {currentItem?.template_content || t('No content available')}
              </pre>
            </div>
            {currentItem?.placeholders && currentItem.placeholders.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">{t('Available Placeholders')}:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentItem.placeholders.map((placeholder: string, index: number) => (
                    <span key={index} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {`{{${placeholder}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Document Modal */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        {currentItem && (
          <Generate
            record={currentItem}
            onClose={() => setIsGenerateModalOpen(false)}
          />
        )}
      </Dialog>
    </PageTemplate>
  );
}
