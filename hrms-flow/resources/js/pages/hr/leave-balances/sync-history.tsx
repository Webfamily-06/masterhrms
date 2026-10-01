// pages/hr/leave-balances/sync-history.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { CrudTable } from '@/components/CrudTable';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { ArrowLeft } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';

export default function LeaveBalanceSyncHistory() {
  const { t } = useTranslation();
  const { auth, syncHistory, yearOptions, filters: pageFilters = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [selectedYear, setSelectedYear] = useState(pageFilters.year || '_empty_');
  const [showFilters, setShowFilters]   = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);

  const hasActiveFilters  = () => selectedYear !== '_empty_';
  const activeFilterCount = () => (selectedYear !== '_empty_' ? 1 : 0);

  const applyFilters = () => {
    router.get(route('hr.leave-balances.sync-history'), {
      page:     1,
      year:     selectedYear !== '_empty_' ? selectedYear : undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    else setPageInitialState(false);
  }, [selectedYear]);

  const handlePageChange = (url: string) => {
    router.get(url, {
      year:     selectedYear !== '_empty_' ? selectedYear : undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    setSelectedYear('_empty_');
    setShowFilters(false);
    router.get(route('hr.leave-balances.sync-history'), {}, { preserveState: true, preserveScroll: true });
  };

  const breadcrumbs = [
    { title: t('Dashboard'),      href: route('dashboard') },
    { title: t('Leave Management'), href: route('hr.leave-balances.index') },
    { title: t('Leave Balances'), href: route('hr.leave-balances.index') },
    { title: t('Sync History') },
  ];

  const pageActions = [
    {
      label: t('Back'),
      icon: <ArrowLeft className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: () => router.get(route('hr.leave-balances.index')),
    },
  ];

  const yearFilterOptions = [
    { value: '_empty_', label: t('All Years') },
    ...(yearOptions || []).map((y: any) => ({ value: y.value, label: y.label })),
  ];

  const columns = [
    {
      key: 'year',
      label: t('Year'),
      render: (value: number) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20">
          {value}
        </span>
      ),
    },
    {
      key: 'synced_by',
      label: t('Synced By'),
      render: (value: any, row: any) => {
        return (
        <div className="flex items-center gap-3">
            <img
            src={row.synced_by_user?.avatar}
            alt={row.synced_by_user?.name}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getImagePath('avatars/avatar.png');
            }}
            />
            <div>
            <div className="font-medium">{row.synced_by_user?.name}</div>
            <div className="text-sm text-muted-foreground">{row.synced_by_user?.email}</div>
            </div>
        </div>
        );
    }
    },
    {
      key: 'synced_at',
      label: t('Synced At'),
      render: (value: string) =>
        value
          ? window.appSettings?.formatDateTimeSimple
            ? window.appSettings.formatDateTimeSimple(value, true)
            : new Date(value).toLocaleString()
          : '-',
    },
    {
      key: 'created_at',
      label: t('Recorded At'),
      render: (value: string) =>
        value
          ? window.appSettings?.formatDateTimeSimple
            ? window.appSettings.formatDateTimeSimple(value, true)
            : new Date(value).toLocaleString()
          : '-',
    },
  ];

  return (
    <PageTemplate
      title={t('Leave Balance Sync History')}
      description={t("View the history of leave balance synchronization operations.")}
      url="/hr/leave-balances/sync-history"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Filters */}
      {/* <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm=""
          onSearchChange={() => {}}
          hideSearch
          onSearch={(e) => { e.preventDefault(); applyFilters(); }}
          filters={[
            {
              name: 'year',
              label: t('Year'),
              type: 'select',
              value: selectedYear,
              onChange: setSelectedYear,
              options: yearFilterOptions,
            },
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div> */}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={[]}
          data={syncHistory?.data || []}
          from={syncHistory?.from || 1}
          onAction={() => {}}
          permissions={permissions}
          entityPermissions={{
            view: 'manage-leave-balance-sync-history',
          }}
        />

        <Pagination
          from={syncHistory?.from || 0}
          to={syncHistory?.to || 0}
          total={syncHistory?.total || 0}
          links={syncHistory?.links}
          entityName={t('sync records')}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.leave-balances.sync-history'), {
              page:     1,
              per_page: value,
              year:     selectedYear !== '_empty_' ? selectedYear : undefined,
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>
    </PageTemplate>
  );
}
