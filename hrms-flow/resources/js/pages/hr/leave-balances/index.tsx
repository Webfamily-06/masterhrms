// pages/hr/leave-balances/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { useInitials } from '@/hooks/use-initials';
import { Info, RefreshCw, History, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function LeaveBalances() {
  const { t } = useTranslation();
  const { auth, employeeBalances, employees, yearOptions, currentYear, systemYear, filters: pageFilters = {}, lastSync, globalSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm]             = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedYear, setSelectedYear]         = useState(pageFilters.year || currentYear.toString());
  const [showFilters, setShowFilters]           = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen]   = useState(false);
  const [currentBalance, setCurrentBalance]     = useState<any>(null);
  const [infoEmployee, setInfoEmployee]         = useState<any>(null);
  const [isSyncing, setIsSyncing]               = useState(false);
  const [showNote, setShowNote]                 = useState(() => localStorage.getItem('leave_balance_note_dismissed') !== '1');

  const hasActiveFilters  = () => searchTerm !== '' || selectedEmployee !== '_empty_' || selectedYear !== currentYear.toString();
  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedEmployee !== '_empty_' ? 1 : 0) + (selectedYear !== currentYear.toString() ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  const applyFilters = () => {
    router.get(route('hr.leave-balances.index'), {
      page: 1,
      search:      searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      year:        selectedYear,
      per_page:    pageFilters.per_page,
      sort_field:  pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const page = new URL(url).searchParams.get('page');
    router.get(route('hr.leave-balances.index'), {
      page,
      search:      searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      year:        selectedYear,
      per_page:    pageFilters.per_page,
      sort_field:  pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('hr.leave-balances.index'));
  };

  const handleAdjust = (balance: any) => {
    setCurrentBalance(balance);
    setIsAdjustModalOpen(true);
  };

  const handleSync = () => {
    setIsSyncing(true);
    router.post(route('hr.leave-balances.sync'), {}, {
      onSuccess: (page) => {
        setIsSyncing(false);
        if (page.props.flash?.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        setIsSyncing(false);
        const msg = typeof errors === 'object' ? Object.values(errors).join(', ') : errors;
        toast.error(msg || t('Failed to sync leave balances.'));
      }
    });
  };

  const handleInfo = (balance: any, emp: any) => {
    setCurrentBalance(balance);
    setInfoEmployee(emp);
    setIsInfoModalOpen(true);
  };

  const handleAdjustSubmit = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Adjusting leave balance...'));
    router.put(route('hr.leave-balances.adjust', currentBalance.leave_balance_id), formData, {
      onSuccess: (page) => {
        setIsAdjustModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) toast.success(t(page.props.flash.success));
        else if (page.props.flash.error) toast.error(t(page.props.flash.error));
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        toast.error(typeof errors === 'string' ? t(errors) : Object.values(errors).join(', '));
      }
    });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Leave Management') },
    { title: t('Leave Balances') }
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('All Employees'), disabled: true },
    ...(employees || []).map((emp: any) => ({ value: emp.id.toString(), label: emp.name }))
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, selectedEmployee, selectedYear]);

  return (
    <PageTemplate
      title={t('Leave Balances')}
      description={t("View and manage leave balances.")}
      url="/hr/leave-balances"
      actions={[
        ...(hasPermission(permissions, 'manage-leave-balance-sync-history') ? [{
          label: t('Sync History'),
          icon: <History className="h-4 w-4 mr-2" />,
          variant: 'outline' as const,
          className: 'bg-blue-50 border-blue-500 text-blue-700 font-medium hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-300',
          onClick: () => router.get(route('hr.leave-balances.sync-history'), {}, {
            onSuccess: (page) => {
              if (page.props.flash?.error) toast.error(t(page.props.flash.error));
            },
            onError: () => toast.error(t('Permission Denied.')),
          }),
        }] : []),
        ...(hasPermission(permissions, 'sync-leave-balances') ? [{
          label: isSyncing ? t('Syncing...') : (lastSync ? `${t('Re-sync')} ${systemYear}` : `${t('Sync')} ${systemYear} ${t('Balances')}`),
          icon: <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />,
          variant: 'outline' as const,
          className: 'bg-green-50 border-green-500 text-green-700 font-medium hover:bg-green-100 hover:text-green-700 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300 dark:hover:bg-green-900/30 dark:hover:text-green-300',
          onClick: handleSync,
          disabled: isSyncing,
        }] : [])
      ]}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Note Banner */}
      {showNote && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-4">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            <span className="font-semibold">{t('Note')}:</span> {t('If you add a new Employee, Leave Type, or Leave Policy, you must click the')} <span className="font-semibold">{t('Sync Balances')}</span> {t('or')} <span className="font-semibold">{t('Re-sync')}</span> {t('button to apply the changes for the current year.')}
          </p>
          <button onClick={() => { localStorage.setItem('leave_balance_note_dismissed', '1'); setShowNote(false); }} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              options: employeeOptions,
              searchable: true,
            },
            {
              name: 'year',
              label: t('Year'),
              type: 'select',
              value: selectedYear,
              onChange: setSelectedYear,
              options: yearOptions || [],
              hideBadgeCancelButton: true
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
        {lastSync && (
          <div className="flex items-center gap-2 mx-3 mb-3">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Last synced')}:</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {window.appSettings?.formatDateTimeSimple ? window.appSettings.formatDateTimeSimple(lastSync.synced_at, true) : new Date(lastSync.synced_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Employee Balance Cards */}
      {employeeBalances?.data && employeeBalances.data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeeBalances.data.map((emp: any) => (
            <Card key={emp.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <div className="p-4">

              {/* Employee Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold overflow-hidden shrink-0">
                  {emp.avatar
                    ? <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover rounded-lg" />
                    : getInitials(emp.name || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{emp.name}</div>
                  {emp.employee_id && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{emp.employee_id}</div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700 mb-3" />

              {/* Leave Type Table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="flex text-xs text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-2 font-semibold w-[45%]">{t('Leave Type')}</th>
                    <th className="text-center py-2 font-semibold w-[15%]">{t('Total')}</th>
                    <th className="text-center py-2 font-semibold text-red-500 w-[15%]">{t('Used')}</th>
                    <th className="text-center py-2 font-semibold text-green-600 w-[18%]">{t('Available')}</th>
                    <th className="py-2 w-[7%]"></th>
                  </tr>
                </thead>
                <tbody className="block max-h-[216px] overflow-y-auto">
                  {emp.balances.map((balance: any) => (
                    <tr key={balance.leave_type_id} className="flex border-b dark:border-gray-800 last:border-0">
                      <td className="py-2 pr-2 w-[45%] shrink-0">
                        <span className="text-gray-700 dark:text-gray-300 text-xs leading-tight">{balance.leave_type_name}</span>
                      </td>
                      <td className="py-2 text-center font-mono text-gray-700 dark:text-gray-300 w-[15%] shrink-0">{balance.total}</td>
                      <td className="py-2 text-center font-mono text-red-500 w-[15%] shrink-0">{balance.used}</td>
                      <td className="py-2 text-center font-mono font-semibold text-green-600 w-[18%] shrink-0">{balance.available}</td>
                      <td className="py-2 text-center w-[7%] shrink-0">
                        <button onClick={() => handleInfo(balance, emp)} className="text-gray-500 cursor-pointer" title={t('View Details')}>
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-12 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('No leave balance data found for')} {selectedYear}.</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('Data will be available once the year begins.')}</p>
        </div>
      )}

      {/* Pagination */}
      {employeeBalances?.data && employeeBalances.data.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow mt-4 overflow-hidden">
          <Pagination
            from={employeeBalances?.from || 0}
            to={employeeBalances?.to || 0}
            total={employeeBalances?.total || 0}
            links={employeeBalances?.links}
            entityName={t('employees')}
            onPageChange={handlePageChange}
            perPageOptions={[9, 27, 45, 90]}
            currentPerPage={pageFilters.per_page?.toString() || '9'}
            onPerPageChange={(value) => {
              router.get(route('hr.leave-balances.index'), {
                page: 1,
                per_page: value,
                search: searchTerm || undefined,
                employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
                year: selectedYear,
                sort_field: pageFilters.sort_field || undefined,
                sort_direction: pageFilters.sort_direction || undefined,
              }, { preserveState: true, preserveScroll: true });
            }}
          />
        </div>
      )}

      {/* Info Modal — Leave Type Breakdown */}
      <Dialog open={isInfoModalOpen} onOpenChange={(open) => { if (!open) setIsInfoModalOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentBalance?.leave_type_name}
            </DialogTitle>
          </DialogHeader>

          {currentBalance && (
            <div className="space-y-0">
              {/* Employee name */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{infoEmployee?.name} — {selectedYear}</p>

              <div className="space-y-2 text-sm">
                {/* Allocated */}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t('Allocated')} ({selectedYear})</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                    {currentBalance.total - currentBalance.carried_forward - currentBalance.manual_adjustment} {t('days')}
                  </span>
                </div>

                {/* Carried Forward */}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t('Carried Forward')} ({Number(selectedYear) - 1})</span>
                  <span className={`font-mono font-medium ${currentBalance.carried_forward > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                    {currentBalance.carried_forward > 0 ? '+' : ''}{currentBalance.carried_forward} {t('days')}
                  </span>
                </div>

                {/* Manual Adjustment */}
                {/* <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t('Manual Adjustment')}</span>
                  <span className={`font-mono font-medium ${
                    currentBalance.manual_adjustment > 0 ? 'text-blue-600'
                    : currentBalance.manual_adjustment < 0 ? 'text-red-500'
                    : 'text-gray-400'
                  }`}>
                    {currentBalance.manual_adjustment > 0 ? '+' : ''}{currentBalance.manual_adjustment} {t('days')}
                  </span>
                </div> */}

                {/* Total */}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 rounded">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t('Total')}</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{currentBalance.total} {t('days')}</span>
                </div>

                {/* Used */}
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{t('Used')}</span>
                  <span className="font-mono font-medium text-red-500">-{currentBalance.used} {t('days')}</span>
                </div>

                {/* Available */}
                <div className="flex justify-between items-center py-2 bg-green-50 dark:bg-green-900/20 px-2 rounded">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t('Available')}</span>
                  <span className="font-mono font-bold text-green-600">{currentBalance.available} {t('days')}</span>
                </div>

                {/* Adjustment Reason */}
                {currentBalance.adjustment_reason && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('Adjustment Reason')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {currentBalance.adjustment_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Adjust Modal */}
      <CrudFormModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSubmit={handleAdjustSubmit}
        formConfig={{
          fields: [
            {
              name: 'manual_adjustment',
              label: t('Adjustment Amount'),
              type: 'number',
              required: true,
              step: 0.5,
              placeholder: t('e.g. 2 to add, -1 to deduct'),
              helpText: t('Positive value adds days, negative value deducts days')
            },
            {
              name: 'adjustment_reason',
              label: t('Reason for Adjustment'),
              type: 'textarea',
              required: true,
              placeholder: t('e.g. Additional leave granted for special circumstances...')
            }
          ],
          modalSize: 'md'
        }}
        initialData={currentBalance ? {
          manual_adjustment: currentBalance.manual_adjustment,
          adjustment_reason: currentBalance.adjustment_reason || ''
        } : {}}
        title={`${t('Adjust')} — ${currentBalance?.leave_type_name || ''}`}
        mode="edit"
      />
    </PageTemplate>
  );
}

