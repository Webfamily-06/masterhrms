// pages/hr/assets/depreciation-report.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { List, BarChart, Download, Printer, ShoppingCart, TrendingDown, DollarSign, TrendingUp } from 'lucide-react';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { CrudTable } from '@/components/CrudTable';

import { getImagePath } from '@/utils/helpers';

export default function DepreciationReport() {
  const { t } = useTranslation();
  const {
    assets,
    assetTypes,
    totalPurchaseValue,
    totalCurrentValue,
    totalDepreciation,
    globalSettings,
    filters: pageFilters = {}
  } = usePage().props as any;

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [selectedAssetType, setSelectedAssetType] = useState(pageFilters.asset_type_id || '_empty_');
  const [purchaseDateFrom, setPurchaseDateFrom] = useState<Date | undefined>(pageFilters.purchase_date_from ? new Date(pageFilters.purchase_date_from) : undefined);
  const [purchaseDateTo, setPurchaseDateTo] = useState<Date | undefined>(pageFilters.purchase_date_to ? new Date(pageFilters.purchase_date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedAssetType, purchaseDateFrom, purchaseDateTo]);

  const handleViewAssets = () => {
    router.get(route('hr.assets.index'));
  };

  const handleViewDashboard = () => {
    router.get(route('hr.assets.dashboard'));
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedAssetType !== '_empty_' ||
           purchaseDateFrom !== undefined ||
           purchaseDateTo !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedAssetType !== '_empty_' ? 1 : 0) +
           (purchaseDateFrom !== undefined ? 1 : 0) +
           (purchaseDateTo !== undefined ? 1 : 0);
  };

  const applyFilters = () => {
    router.get(route('hr.assets.depreciation-report'), {
      page: 1,
      asset_type_id: selectedAssetType !== '_empty_' ? selectedAssetType : undefined,
      purchase_date_from: purchaseDateFrom ? purchaseDateFrom.toISOString().split('T')[0] : undefined,
      purchase_date_to: purchaseDateTo ? purchaseDateTo.toISOString().split('T')[0] : undefined,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.assets.depreciation-report'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      asset_type_id: selectedAssetType !== '_empty_' ? selectedAssetType : undefined,
      purchase_date_from: purchaseDateFrom ? purchaseDateFrom.toISOString().split('T')[0] : undefined,
      purchase_date_to: purchaseDateTo ? purchaseDateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('hr.assets.depreciation-report'));
  };

  const handlePageChange = (url: string) => {
    const pageParam = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.assets.depreciation-report'), {
      page: pageParam,
      asset_type_id: selectedAssetType !== '_empty_' ? selectedAssetType : undefined,
      purchase_date_from: purchaseDateFrom ? purchaseDateFrom.toISOString().split('T')[0] : undefined,
      purchase_date_to: purchaseDateTo ? purchaseDateTo.toISOString().split('T')[0] : undefined,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      per_page: pageFilters.per_page,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      ...(selectedAssetType !== '_empty_' && { asset_type_id: selectedAssetType }),
      ...(purchaseDateFrom && { purchase_date_from: purchaseDateFrom.toISOString().split('T')[0] }),
      ...(purchaseDateTo && { purchase_date_to: purchaseDateTo.toISOString().split('T')[0] })
    });

    window.open(`${route('hr.assets.export-depreciation-csv')}?${params.toString()}`, '_blank');
  };

  // Define page actions
  const pageActions = [
    {
      label: t('Asset List'),
      icon: <List className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handleViewAssets
    },
    {
      label: t('Dashboard'),
      icon: <BarChart className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handleViewDashboard
    },
    {
      label: t('Print'),
      icon: <Printer className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handlePrint,
      className: 'print:hidden'
    },
    {
      label: t('Export CSV'),
      icon: <Download className="h-4 w-4 mr-2" />,
      variant: 'outline' as const,
      onClick: handleExportCSV,
      className: 'print:hidden'
    }
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Asset Management') },
    { title: t('Depreciation Report') }
  ];

  // Prepare asset type options for filter
  const assetTypeOptions = [
    { value: '_empty_', label: t('All Types') },
    ...(assetTypes || []).map((type: any) => ({
      value: type.id.toString(),
      label: type.name
    }))
  ];

  // Calculate depreciation percentage
  const calculateDepreciationPercentage = (purchaseCost: number, currentValue: number) => {
    if (!purchaseCost || purchaseCost === 0) return 0;
    return ((purchaseCost - currentValue) / purchaseCost) * 100;
  };

  // CrudTable columns
  const columns = [
    {
      key: 'name',
      label: t('Asset Name'),
      sortable: true,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image_url}
            alt={row.name}
            className="h-9 w-9 cursor-pointer rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
            onClick={() => window.open(row.image_url, '_blank')}
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
            <div className="text-xs text-gray-500">{row.asset_type?.name || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'purchase_date',
      label: t('Purchase Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'purchase_cost',
      label: t('Purchase Cost'),
      sortable: true,
      render: (value: any) => {
        const cost = parseFloat(value || 0);
        return <span className="font-mono">{window.appSettings?.formatCurrency(cost) ?? '-'}</span>;
      },
    },
    {
      key: 'depreciation_method',
      label: t('Depreciation Method'),
      render: (_: any, row: any) => {
        const method = row.depreciation?.method;
        if (method === 'straight_line') return t('Straight Line');
        if (method === 'reducing_balance') return t('Reducing Balance');
        return '-';
      },
    },
    {
      key: 'current_value',
      label: t('Current Value'),
      render: (_: any, row: any) => {
        const val = parseFloat(row.depreciation?.current_value || 0);
        return <span className="font-mono">{window.appSettings?.formatCurrency(val) ?? '-'}</span>;
      },
    },
    {
      key: 'depreciation_amount',
      label: t('Depreciation'),
      render: (_: any, row: any) => {
        const cost = parseFloat(row.purchase_cost || 0);
        const val = parseFloat(row.depreciation?.current_value || 0);
        return <span className="font-mono">{window.appSettings?.formatCurrency(cost - val) ?? '-'}</span>;
      },
    },
    {
      key: 'depreciation_pct',
      label: t('Depreciation %'),
      render: (_: any, row: any) => {
        const cost = parseFloat(row.purchase_cost || 0);
        const val = parseFloat(row.depreciation?.current_value || 0);
        return `${calculateDepreciationPercentage(cost, val).toFixed(2)}%`;
      },
    },
  ];

  return (
    <PageTemplate
      title={t("Asset Depreciation Report")}
      description={t("View depreciation schedules and current value of assets.")}
      url="/hr/assets/depreciation-report"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
    {/* Summary Cards */}
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Purchase Value')}</p>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{window.appSettings?.formatCurrency(totalPurchaseValue || 0)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('Original cost of all assets')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
            <ShoppingCart className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Current Value')}</p>
            <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{window.appSettings?.formatCurrency(totalCurrentValue || 0)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">{totalPurchaseValue > 0 ? Math.round((totalCurrentValue / totalPurchaseValue) * 100) : 0}% {t('of purchase value')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
            <DollarSign className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('Total Depreciation')}</p>
            <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{window.appSettings?.formatCurrency(totalDepreciation || 0)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">{totalPurchaseValue > 0 ? Math.round((totalDepreciation / totalPurchaseValue) * 100) : 0}% {t('of purchase value')}</span>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
            <TrendingDown className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>

      {/* Filters section - hidden when printing */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border print:hidden">
        <SearchAndFilterBar
          searchTerm=""
          onSearchChange={() => {}}
          onSearch={() => {}}
          filters={[
            {
              name: 'asset_type_id',
              label: t('Asset Type'),
              type: 'select',
              value: selectedAssetType,
              onChange: setSelectedAssetType,
              options: assetTypeOptions
            },
            {
              name: 'purchase_date_from',
              label: t('Purchase Date From'),
              type: 'date',
              value: purchaseDateFrom,
              onChange: setPurchaseDateFrom
            },
            {
              name: 'purchase_date_to',
              label: t('Purchase Date To'),
              type: 'date',
              value: purchaseDateTo,
              onChange: setPurchaseDateTo
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          hideSearch={true}
        />
      </div>

      {/* Report Table */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 print:shadow-none print:ring-0">
        <CardHeader className="bg-gray-50/50 pb-3 dark:bg-gray-800/50 print:bg-transparent print:p-2">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Asset Depreciation Details')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-visible">
            <CrudTable
              columns={columns}
              actions={[]}
              data={assets?.data || []}
              from={assets?.from || 1}
              onAction={() => {}}
              sortField={pageFilters.sort_field}
              sortDirection={pageFilters.sort_direction}
              onSort={handleSort}
              permissions={[]}
              showActions={false}
            />
          </div>
          {/* Pagination - hidden when printing */}
          <div className="print:hidden">
            <Pagination
              from={assets?.from || 0}
              to={assets?.to || 0}
              total={assets?.total || 0}
              links={assets?.links}
              entityName={t('assets')}
              onPageChange={handlePageChange}
            currentPerPage={pageFilters.per_page?.toString() || '10'}
            onPerPageChange={(value) => {
              router.get(route('hr.assets.depreciation-report'), {
                page: 1,
                per_page: parseInt(value),
                asset_type_id: selectedAssetType !== '_empty_' ? selectedAssetType : undefined,
                purchase_date_from: purchaseDateFrom ? purchaseDateFrom.toISOString().split('T')[0] : undefined,
                purchase_date_to: purchaseDateTo ? purchaseDateTo.toISOString().split('T')[0] : undefined,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
              }, { preserveState: true, preserveScroll: true });
            }}
            />
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
