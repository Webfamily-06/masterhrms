import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function Newsletters() {
  const { t } = useTranslation();
  const { auth, newsletters, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [pageInitialState, setPageInitialState] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = (page = 1) => {
    const params: Record<string, any> = { page };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('newsletters.index'), params, { preserveState: true, preserveScroll: true });
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm]);

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page') || 1;
    const params: Record<string, any> = { page };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('newsletters.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    const params: Record<string, any> = { page: 1, sort_field: field, sort_direction: direction };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('newsletters.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting newsletter subscription...'));
    }

    router.delete(route('newsletters.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete newsletter subscription: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    router.get(route('newsletters.index'));
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page') },
    { title: t('Newsletter') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'email',
      label: t('Email'),
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'created_at',
      label: t('Subscribed Date'),
      sortable: true,
      type: 'date'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-newsletters'
    }
  ];

  return (
    <PageTemplate
      title={t("Newsletter")}
      url="/newsletters"
      breadcrumbs={breadcrumbs}
      description={t("Manage your newsletter subscriptions.")}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
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
          data={newsletters?.data || []}
          from={newsletters?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            delete: 'delete-newsletters'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={newsletters?.from || 0}
          to={newsletters?.to || 0}
          total={newsletters?.total || 0}
          links={newsletters?.links}
          entityName={t("newsletter subscriptions")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            const params: Record<string, any> = { page: 1, per_page: value };
            if (searchTerm) params.search = searchTerm;
            if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
            if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
            router.get(route('newsletters.index'), params, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.email || ''}
        itemType={t('newsletter subscription')}
      />
    </PageTemplate>
  );
}
