import React, { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Plus } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
  sort_order: number;
}

interface PageProps {
  pages: any;
  flash?: {
    success?: string;
    error?: string;
  };
  filters?: any;
  globalSettings?: any;
}

export default function CustomPagesIndex() {
  const { t } = useTranslation();
  const { pages, filters: pageFilters = {}, globalSettings } = usePage<PageProps>().props;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPage, setDeletingPage] = useState<CustomPage | null>(null);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');

  const handleEdit = (page: CustomPage) => {
    router.get(route('landing-page.custom-pages.edit', page.id));
  };

  const handleDelete = (page: CustomPage) => {
    setDeletingPage(page);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting page...'));
    }

    router.delete(route('landing-page.custom-pages.destroy', deletingPage.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        setDeletingPage(null);
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash?.error) {
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
          toast.error(t('Failed to delete page'));
        }
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    const params: any = { page: 1 };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'desc' ? 'asc' : 'desc';
    const params: any = { sort_field: field, sort_direction: direction, page: 1 };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    const params: any = { page: pageNum };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('landing-page.custom-pages.index'));
  };

  const handleAction = (action: string, item: CustomPage) => {
    if (action === 'edit') {
      handleEdit(item);
    } else if (action === 'delete') {
      handleDelete(item);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: string) => <div className="font-medium">{value}</div>
    },
    {
      key: 'content',
      label: 'Content',
      render: (value: string) => {
        const plainText = value.replace(/<[^>]*>/g, '');
        return <div className="max-w-xs truncate" title={plainText}>{plainText.substring(0, 100)}...</div>;
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: boolean) => {
        const statusClass = value
          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusClass}`}>
            {value ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      type: 'date'
    }
  ];

  const actions = [
    {
      label: 'Edit',
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500'
    },
    {
      label: 'Delete',
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500'
    }
  ];

  return (
    <PageTemplate
      title="Custom Pages"
      url="/custom-pages"
      description={t("View and manage all plan requests from companies.")}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Landing Page') },
        { title: t('Custom Pages') }
      ]}
      actions={[
        {
          label: 'Add Page',
          icon: <Plus className="w-4 h-4 mr-2" />,
          variant: 'default',
          onClick: () => router.get(route('landing-page.custom-pages.create'))
        }
      ]}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[]}
          hasActiveFilters={() => searchTerm !== ''}
          activeFilterCount={() => (searchTerm !== '' ? 1 : 0)}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={pages?.data || pages || []}
          from={pages?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
        />

        {pages?.links && (
          <Pagination
            from={pages?.from || 0}
            to={pages?.to || 0}
            total={pages?.total || 0}
            links={pages?.links}
            entityName="pages"
            onPageChange={handlePageChange}
            currentPerPage={pageFilters.per_page?.toString() || "10"}
            onPerPageChange={(value) => {
              const params: any = { page: 1, per_page: parseInt(value) };
              if (searchTerm) params.search = searchTerm;
              if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
              if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
              router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
            }}
          />
        )}
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingPage(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={deletingPage?.title || ''}
        entityName="page"
      />

      <Toaster />
    </PageTemplate>
  );
}
