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
import { Plus, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Generate from './generate';

export default function OfferTemplates() {
  const { t } = useTranslation();
  const { auth, offerTemplates, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const { flash } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // Show flash error only — for permission denied errors from router.get() navigations
  useEffect(() => {
    if (flash?.error) toast.error(t(flash.error));
  }, [flash?.error]);

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return statusFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (statusFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.recruitment.offer-templates.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.recruitment.offer-templates.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.recruitment.offer-templates.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.recruitment.offer-templates.show', item.id));
        break;
      case 'edit':
        router.get(route('hr.recruitment.offer-templates.edit', item.id));
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

  const handleToggleStatus = (template: any) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active';
    if (!globalSettings?.is_demo) toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} template...`);

    router.put(route('hr.recruitment.offer-templates.toggle-status', template.id), {}, {
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

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting template...'));

    router.delete(route('hr.recruitment.offer-templates.destroy', currentItem.id), {
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

  const handleResetFilters = () => {
    router.get(route('hr.recruitment.offer-templates.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-offer-templates')) {
    pageActions.push({
      label: t('Add Template'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => router.get(route('hr.recruitment.offer-templates.create'))
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Offer Templates') }
  ];

  const columns = [
    {
      key: 'name',
      label: t('Name'),
      sortable: true,
      render: (value) => <div className="font-medium">{value}</div>
    },
    {
      key: 'template_content',
      label: t('Content Preview'),
      render: (value) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-600 truncate">
            {value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : '-'}
          </div>
        </div>
      )
    },
    {
      key: 'variables',
      label: t('Variables'),
      render: (value) => {
        if (!value || !Array.isArray(value) || value.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 3).map((variable: string, index: number) => (
              <span key={index} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                {variable}
              </span>
            ))}
            {value.length > 3 && (
              <span className="text-xs text-gray-500">+{value.length - 3} more</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${value === 'active'
          ? 'bg-green-50 text-green-700 ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-red-600/20'
        }`}>
          {value === 'active' ? t('Active') : t('Inactive')}
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

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-offer-templates'
    },
    {
      label: t('Preview'),
      icon: 'FileText',
      action: 'preview',
      className: 'text-purple-500',
      requiredPermission: 'view-offer-templates'
    },
    {
      label: t('Generate Offer'),
      icon: 'Download',
      action: 'generate',
      className: 'text-green-500',
      requiredPermission: 'view-offer-templates'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-offer-templates'
    },
    {
      label: t('Toggle Status'),
      icon: 'Lock',
      action: 'toggle-status',
      className: 'text-orange-500',
      requiredPermission: 'edit-offer-templates'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-offer-templates'
    }
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'active', label: t('Active'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.active ?? 0 },
    { value: 'inactive', label: t('Inactive'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.inactive ?? 0 },
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, statusFilter]);

  const statusOptions = [
    { value: '_empty_', label: t('All Statuses') },
    { value: 'active', label: t('Active') },
    { value: 'inactive', label: t('Inactive') }
  ];

  return (
    <PageTemplate
      title={t("Offer Templates")}
      description={t("Manage reusable templates for job offer letters.")}
      url="/hr/recruitment/offer-templates"
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
          filters={[]}
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
          data={offerTemplates?.data || []}
          from={offerTemplates?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-offer-templates',
            create: 'create-offer-templates',
            edit: 'edit-offer-templates',
            delete: 'delete-offer-templates'
          }}
        />

        <Pagination
          from={offerTemplates?.from || 0}
          to={offerTemplates?.to || 0}
          total={offerTemplates?.total || 0}
          links={offerTemplates?.links}
          entityName={t("offer templates")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.recruitment.offer-templates.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: statusFilter !== '_empty_' ? statusFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="offer template"
      />

      {/* Preview Modal */}
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
            {currentItem?.variables && currentItem.variables.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">{t('Available Variables')}:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentItem.variables.map((variable: string, index: number) => (
                    <span key={index} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Offer Modal */}
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
