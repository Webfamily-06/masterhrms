import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import ViewPopup from './view';
import UserInitials from '@/components/user-initials';

export default function Contacts() {
  const { t } = useTranslation();
  const { auth, contacts, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [pageInitialState, setPageInitialState] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
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
    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
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
    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    const params: Record<string, any> = { page: 1, sort_field: field, sort_direction: direction };
    if (searchTerm) params.search = searchTerm;
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        setIsViewModalOpen(true);
        break;
      case 'update-status':
        setIsStatusModalOpen(true);
        break;
      case 'send-reply':
        setIsReplyModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleStatusUpdate = (data: any) => {
    toast.loading(t('Updating contact status...'));

    router.put(route('contacts.update-status', currentItem.id), { status: data.status }, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update contact status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting contact...'));
    }

    router.delete(route('contacts.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete contact: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleReplySubmit = (data: any) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Sending reply...'));
    }
    router.post(route('contacts.send-reply', currentItem.id), {
      subject: data.subject,
      message: data.message
    }, {
      onSuccess: (page) => {
        setIsReplyModalOpen(false);
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
          toast.error(t('Failed to send reply: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    router.get(route('contacts.index'));
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page') },
    { title: t('Contact Inquiries') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: t('User'),
      sortable: true,
      render: (value: any, row: any) => {
        return (
          <div className="flex items-center gap-3">
            <UserInitials name={`${row.name}`} />
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-sm text-muted-foreground">{row.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'subject',
      label: t('Subject'),
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => {
        const statusColors: Record<string, string> = {
          'New':       'bg-blue-50 text-blue-700 ring-blue-700/10',
          'Contacted': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          'Qualified': 'bg-green-50 text-green-700 ring-green-600/20',
          'Converted': 'bg-purple-50 text-purple-700 ring-purple-700/10',
          'Closed':    'bg-gray-50 text-gray-700 ring-gray-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {value || 'New'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Date'),
      sortable: true,
      type: 'date'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-contacts'
    },
    {
      label: t('Update Status'),
      icon: 'RefreshCw',
      action: 'update-status',
      className: 'text-green-500',
      requiredPermission: 'update-contact-status'
    },
    {
      label: t('Send Reply'),
      icon: 'Reply',
      action: 'send-reply',
      className: 'text-purple-500',
      requiredPermission: 'send-reply-contacts'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-contacts'
    }
  ];

  return (
    <PageTemplate
      title={t("Contact Inquiries")}
      url="/contacts"
      breadcrumbs={breadcrumbs}
      description={t("Manage and review contact inquiries from users.")}
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
          data={contacts?.data || []}
          from={contacts?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-contacts',
            delete: 'delete-contacts'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={contacts?.from || 0}
          to={contacts?.to || 0}
          total={contacts?.total || 0}
          links={contacts?.links}
          entityName={t("contacts")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            const params: Record<string, any> = { page: 1, per_page: value };
            if (searchTerm) params.search = searchTerm;
            if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
            if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
            router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.name || ''} - ${currentItem?.subject || ''}`}
        itemType={t('contact')}
      />

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        {currentItem && <ViewPopup record={currentItem} />}
      </Dialog>

      {/* Status Update Modal */}
      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusUpdate}
        title={t('Update Contact Status')}
        mode="edit"
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              options: [
                { value: 'New', label: t('New') },
                { value: 'Contacted', label: t('Contacted') },
                { value: 'Qualified', label: t('Qualified') },
                { value: 'Converted', label: t('Converted') },
                { value: 'Closed', label: t('Closed') }
              ]
            }
          ]
        }}
        initialData={{ status: currentItem?.status || 'New' }}
      />

      {/* Reply Modal */}
      <CrudFormModal
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        onSubmit={handleReplySubmit}
        title={t('Send Reply')}
        mode="create"
        submitButtonText={t('Send')}
        formConfig={{
          fields: [
            {
              name: 'email',
              label: t('Email'),
              type: 'text',
              defaultValue: currentItem?.email || '',
              disabled: true
            },
            {
              name: 'subject',
              label: t('Subject'),
              type: 'text',
              required: true,
              placeholder: t('Enter reply subject')
            },
            {
              name: 'message',
              label: t('Message'),
              type: 'textarea',
              required: true,
              placeholder: t('Enter your reply message')
            }
          ],
          modalSize: '2xl'
        }}
        initialData={{ email: currentItem?.email || '' }}
      />
    </PageTemplate>
  );
}
