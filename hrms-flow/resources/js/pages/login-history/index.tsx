import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, User, Mail, Building, Globe, Clock, Monitor, Settings, Smartphone, Wifi, MapPin } from 'lucide-react';
import UserInitials from '@/components/user-initials';

export default function LoginHistory() {
  const { t } = useTranslation();
  const { auth, loginHistory, filters: pageFilters = {}, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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

  const applyFilters = () => {
    router.get(route('login-history.index'), {
      page: 1,
      search: searchTerm || undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('login-history.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        setIsViewModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting login history...'));
    }

    router.delete(route('login-history.destroy', currentItem.id), {
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
          toast.error(t('Failed to delete login history: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setShowFilters(false);

    router.get(route('login-history.index'), {
      page: 1,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    ...(auth?.user?.type === 'company'
      ? [{ title: t('System Users') }, { title: t('Users'), href: route('users.index') }]
      : [{ title: t('Companies'), href: route('companies.index') }]
    ),
    { title: t('Login History') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'user.name',
      label: t('User'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.avatar ?
            <img src={row.avatar} alt={row.name} className="w-10 h-10 rounded-full object-cover" /> :
            <UserInitials name={`${row.name}`} />
          }
          <div>
            <div className="font-medium">{row.user?.name || '-'}</div>
            <div className="text-xs text-gray-500">{row.user?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'user.type',
      label: t('User Type'),
      render: (_, row) => {
        const userType = row.user?.type || '-';
        return userType.charAt(0).toUpperCase() + userType.slice(1);
      }
    },
    {
      key: 'ip',
      label: t('IP Address'),
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'date',
      label: t('Login Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'Details',
      label: t('Details'),
      render: (value) => {
        try {
          const details = JSON.parse(value || '{}');
          return (
            <div className="text-xs">
              <div>{details.browser_name || '-'}</div>
              <div className="text-gray-500">{details.os_name || '-'}</div>
            </div>
          );
        } catch {
          return '-';
        }
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
      requiredPermission: 'show-login-history'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-login-history'
    }
  ];

  return (
    <PageTemplate
      title={t("Login History")}
      url="/login-history"
      breadcrumbs={breadcrumbs}
      description={t("Track and manage user login history.")}
      noPadding
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4" />,
          variant: 'outline',
          onClick: () => router.visit(auth?.user?.type === 'company' ? route('users.index') : route('companies.index'))
        }
      ]}
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('login-history.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={loginHistory?.data || []}
          from={loginHistory?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            delete: 'delete-login-history'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={loginHistory?.from || 0}
          to={loginHistory?.to || 0}
          total={loginHistory?.total || 0}
          links={loginHistory?.links}
          entityName={t("login records")}
          onPageChange={(url) => router.get(url)}
        />
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.user?.name || ''} `}
        itemType={t('login history')}
      />

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-semibold">{t('Login Details')}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
              {/* User Name */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">{t('User Name')}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{currentItem?.user?.name || '-'}</div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">{t('Email')}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{currentItem?.user?.email || '-'}</div>
                </div>
              </div>

              {/* User Type */}
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">{t('User Type')}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentItem?.user?.type ? currentItem.user.type.charAt(0).toUpperCase() + currentItem.user.type.slice(1) : '-'}
                  </div>
                </div>
              </div>

              {/* IP Address */}
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">{t('IP Address')}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{currentItem?.ip || '-'}</div>
                </div>
              </div>

              {/* Login Time / Date */}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 font-medium">{t('Login Time')}</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentItem?.date ? (window.appSettings?.formatDateTimeSimple(currentItem.date, true) || new Date(currentItem.date).toLocaleString()) : '-'}
                  </div>
                </div>
              </div>

              {/* Dynamic details from Details field */}
              {(() => {
                try {
                  const details = JSON.parse(currentItem?.Details || '{}');
                  return Object.entries(details).map(([key, value]) => {
                    const formattedKey = key.replace(/_/g, ' ');
                    const keyLower = key.toLowerCase();

                    let IconComponent = Globe;
                    if (keyLower.includes('mail') || keyLower.includes('email')) IconComponent = Mail;
                    else if (keyLower.includes('user') || keyLower.includes('name')) IconComponent = User;
                    else if (keyLower.includes('time') || keyLower.includes('date')) IconComponent = Clock;
                    else if (keyLower.includes('browser') || keyLower.includes('screen')) IconComponent = Monitor;
                    else if (keyLower.includes('os') || keyLower.includes('system') || keyLower.includes('setting')) IconComponent = Settings;
                    else if (keyLower.includes('device') || keyLower.includes('mobile')) IconComponent = Smartphone;
                    else if (keyLower.includes('isp') || keyLower.includes('wifi') || keyLower.includes('network')) IconComponent = Wifi;
                    else if (keyLower.includes('org') || keyLower.includes('company')) IconComponent = Building;
                    else if (keyLower.includes('city') || keyLower.includes('location') || keyLower.includes('address')) IconComponent = MapPin;

                    return (
                      <div key={key} className="flex items-start gap-3">
                        <IconComponent className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500 font-medium capitalize">{t(formattedKey)}</div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{String(value) || '-'}</div>
                        </div>
                      </div>
                    );
                  });
                } catch {
                  return null;
                }
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
