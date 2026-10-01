// pages/hr/payslips/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { X, TrendingUp, TrendingDown, Download, Calendar, LayoutGrid, FileText, CheckCircle2 } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { useInitials } from '@/hooks/use-initials';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function Payslips() {
  const { t } = useTranslation();
  const { auth, payslips, statusCounts = {}, employees, filters: pageFilters = {}, flash, globalSettings, monthLabel, selectedMonth } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const getInitials = useInitials();

  useEffect(() => {
    if (flash?.error) {
      toast.error(t(flash.error));
    }
    if (flash?.success) {
      toast.success(t(flash.success));
    }
  }, [flash]);

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm]           = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedStatus, setSelectedStatus]   = useState(pageFilters.status || '_empty_');
  const [selectedYear, setSelectedYear]       = useState(selectedMonth?.split('-')[0] || String(new Date().getFullYear()));
  const [showFilters, setShowFilters]         = useState(false);
  const [viewingPayslip, setViewingPayslip]   = useState<any>(null);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedStatus, selectedYear]);

  // Build shared params — preserves ALL filters across every navigation
  const buildParams = (overrides: Record<string, any> = {}) => ({
    search:         searchTerm || undefined,
    employee_id:    selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
    status:         selectedStatus !== '_empty_' ? selectedStatus : undefined,
    selected_month: selectedMonth,
    per_page:       pageFilters.per_page,
    sort_field:     pageFilters.sort_field || undefined,
    sort_direction: pageFilters.sort_direction || undefined,
    page:           1,
    ...overrides,
  });

  // Month strip click — uses selectedYear so year filter is respected
  const handleMonthClick = (monthIndex: number) => {
    const month    = String(monthIndex + 1).padStart(2, '0');
    const newMonth = `${selectedYear}-${month}`;
    router.get(route('hr.payslips.index'), buildParams({ selected_month: newMonth }), { preserveState: true, preserveScroll: true });
  };

  // Month navigation (kept for future use)
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    router.get(route('hr.payslips.index'), buildParams({ selected_month: newMonth }), { preserveState: true, preserveScroll: true });
  };

  const activeYear = selectedMonth?.split('-')[0] || String(new Date().getFullYear());
  const hasActiveFilters  = () => searchTerm !== '' || selectedEmployee !== '_empty_' || selectedStatus !== '_empty_' || selectedYear !== activeYear;
  const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedEmployee !== '_empty_' ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (selectedYear !== activeYear ? 1 : 0);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

  // Apply — uses selectedYear to build the new selected_month
  const applyFilters = () => {
    const currentMonthNum = selectedMonth?.split('-')[1] || '01';
    const newMonth = `${selectedYear}-${currentMonthNum}`;
    router.get(route('hr.payslips.index'), buildParams({ selected_month: newMonth }), { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('hr.payslips.index'), buildParams({ sort_field: field, sort_direction: direction }), { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    switch (action) {
      case 'view_paystub':
        setViewingPayslip(item);
        break;
      case 'download':
        handleDownload(item);
        break;
    }
  };

  const handleDownload = (payslip: any) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Downloading payslip...'));
    }

    fetch(route('hr.payslips.download', payslip.id))
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to download payslip');
          });
        }
        return response.text();
      })
      .then(html => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        const newWindow = window.open('', '_self');
        if (newWindow) {
          newWindow.document.open();
          newWindow.document.write(html);
          newWindow.document.close();
        }
      })
      .catch(error => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        toast.error(t(error.message));
      });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.payslips.index'), buildParams({ page: pageNum }), { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('hr.payslips.index'), { selected_month: selectedMonth });
  };

  // Define page actions
  const pageActions = [];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Payroll Management') },
    { title: t('Payslips') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'employee',
      label: t('Employee'),
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
            {row.employee?.avatar
              ? <img src={row.employee.avatar} alt={row.employee?.name} className="h-full w-full object-cover" />
              : getInitials(row.employee?.name || '')}
          </div>
          <div>
            <div className="font-medium text-sm">{row.employee?.name || '-'}</div>
            {row.employee?.emp_id && (
              <div className="text-xs text-muted-foreground">{row.employee.emp_id}</div>
            )}
          </div>
        </div>
      )
    },
    // {
    //   key: 'pay_period',
    //   label: t('Pay Period'),
    //   render: (value: any, row: any) => {
    //     const start = window.appSettings?.formatDateTimeSimple(row.pay_period_start, false) || row.pay_period_start;
    //     const end   = window.appSettings?.formatDateTimeSimple(row.pay_period_end, false)   || row.pay_period_end;
    //     return (
    //       <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs whitespace-nowrap">
    //         <span className="font-medium text-gray-700 dark:text-gray-300">{start}</span>
    //         <span className="text-gray-400 dark:text-gray-500">→</span>
    //         <span className="font-medium text-gray-700 dark:text-gray-300">{end}</span>
    //       </div>
    //     );
    //   }
    // },
    {
      key: 'pay_date',
      label: t('Pay Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'net_pay',
      label: t('Net Pay'),
      render: (_: any, row: any) => (
        <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">{window.appSettings?.formatCurrency(row.payroll_entry?.net_pay || 0)}</span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          generated: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          sent: 'bg-green-50 text-green-700 ring-green-600/20',
          downloaded: 'bg-purple-50 text-purple-700 ring-purple-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors]}`}>
            {t(value.charAt(0).toUpperCase() + value.slice(1))}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('Generated On'),
      sortable: true,
      type: 'date'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View PayStub'),
      icon: 'Eye',
      action: 'view_paystub',
      className: 'text-primary',
      requiredPermission: 'view-payslips'
    },
    // {
    //   label: t('Download PDF'),
    //   icon: 'Download',
    //   action: 'download',
    //   className: 'text-blue-500',
    //   requiredPermission: 'download-payslips'
    // }
  ];

  // Prepare options for filters
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    ...Array.from({ length: 5 }, (_, i) => ({
      value: String(currentYear - i),
      label: String(currentYear - i)
    }))
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('All Employees') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: emp.name
    }))
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'generated', label: t('Generated'), icon: <FileText className="h-4 w-4" />, count: statusCounts.generated ?? 0 },
    { value: 'downloaded', label: t('Downloaded'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.downloaded ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Payslips")}
      description={t("Browse and download employee payslips.")}
      url="/hr/payslips"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Month Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4 overflow-hidden">
        <div className="grid grid-cols-6 sm:grid-cols-12">
          {Array.from({ length: 12 }, (_, i) => {
            const month      = String(i + 1).padStart(2, '0');
            const value      = `${selectedYear}-${month}`;
            const isSelected = value === selectedMonth;
            const shortLabel = new Date(Number(selectedYear), i, 1).toLocaleString('default', { month: 'short' });
            return (
              <button
                key={value}
                onClick={() => handleMonthClick(i)}
                className={`flex flex-col items-center justify-center py-3 text-sm font-semibold border-r last:border-r-0 border-gray-300 dark:border-gray-600 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{shortLabel}</span>
                {isSelected && (
                  <span className="text-[10px] mt-0.5 opacity-80">{selectedYear}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
          filters={[
            {
              name: 'year',
              label: t('Year'),
              type: 'select',
              value: selectedYear,
              searchable: true,
              hideBadgeCancelButton: true,
              onChange: (val: string) => setSelectedYear(val),
              options: yearOptions
            },
            {
              name: 'employee_id',
              label: t('Employee'),
              type: 'select',
              value: selectedEmployee,
              onChange: setSelectedEmployee,
              searchable: true,
              options: employeeOptions
            },
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Content section */}
      <div className="flex gap-4 items-start">

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden flex-1 min-w-0">
          <CrudTable
            columns={columns}
            actions={actions}
            data={payslips?.data || []}
            from={payslips?.from || 1}
            onAction={handleAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleSort}
            permissions={permissions}
            entityPermissions={{
              view: 'view-payslips',
              create: 'create-payslips',
              edit: 'edit-payslips',
              delete: 'delete-payslips'
            }}
          />
          <Pagination
            from={payslips?.from || 0}
            to={payslips?.to || 0}
            total={payslips?.total || 0}
            links={payslips?.links}
            entityName={t("payslips")}
            onPageChange={handlePageChange}
            currentPerPage={pageFilters.per_page?.toString() || '10'}
            onPerPageChange={(value) => {
              router.get(route('hr.payslips.index'), buildParams({ per_page: parseInt(value), page: 1 }), { preserveState: true, preserveScroll: true });
            }}
          />
        </div>

        {/* Pay Stub Panel */}
        {viewingPayslip && (
          <div
            className="w-80 xl:w-96 shrink-0 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col sticky top-4"
            style={{
              maxHeight: 'calc(100vh - 120px)',
              animation: 'slideInFromRight 0.3s ease-out forwards'
            }}
          >
            <style>{`
              @keyframes slideInFromRight {
                from { opacity: 0; transform: translateX(30px); }
                to   { opacity: 1; transform: translateX(0); }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('Pay Stub')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {window.appSettings?.formatDateTimeSimple(viewingPayslip.pay_period_start, false) || viewingPayslip.pay_period_start}
                  {' → '}
                  {window.appSettings?.formatDateTimeSimple(viewingPayslip.pay_period_end, false) || viewingPayslip.pay_period_end}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {hasPermission(permissions, 'download-payslips') && (
                  <div className="relative group">
                    <button
                      onClick={() => handleDownload(viewingPayslip)}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end z-50">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                        {t('Download Payslip')}
                      </div>
                      <div className="w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-600 rotate-45 -mt-1 mr-1.5" />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setViewingPayslip(null)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

              {/* Employee info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
                  {viewingPayslip.employee?.avatar
                    ? <img src={viewingPayslip.employee.avatar} alt={viewingPayslip.employee?.name} className="h-full w-full object-cover" />
                    : getInitials(viewingPayslip.employee?.name || '')}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{viewingPayslip.employee?.name || '-'}</div>
                  {viewingPayslip.employee?.emp_id && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{viewingPayslip.employee.emp_id}</div>
                  )}
                </div>
                <div className="ml-auto text-right shrink-0">
                  <div className="text-[11px] text-gray-400 dark:text-gray-500">{t('Pay Date')}</div>
                  <div className="flex text-xs items-center font-medium text-gray-700 dark:text-gray-300">
                    {viewingPayslip.pay_date && <Calendar className='h-3 w-3 mr-1'/>}
                    {window.appSettings?.formatDateTimeSimple(viewingPayslip.pay_date, false) || viewingPayslip.pay_date}
                  </div>
                </div>
              </div>

              {/* ── Attendance ── */}
              {(() => {
                const pe = viewingPayslip.payroll_entry;
                if (!pe) return null;
                const rows = [
                  { label: t('Working Days'),      value: pe.working_days      ?? '-', color: '' },
                  { label: t('Present Days'),      value: pe.present_days      ?? '-', color: 'text-green-600 dark:text-green-400' },
                  { label: t('Absent Days'),       value: pe.absent_days       ?? '-', color: 'text-red-600 dark:text-red-400' },
                  { label: t('Half Days'),         value: pe.half_days         ?? '-', color: 'text-yellow-600 dark:text-yellow-400' },
                  { label: t('Holiday Days'),      value: pe.holiday_days      ?? '-', color: 'text-blue-600 dark:text-blue-400' },
                  { label: t('Paid Leave'),        value: pe.paid_leave_days   ?? '-', color: 'text-green-600 dark:text-green-400' },
                  { label: t('Unpaid Leave'),      value: pe.unpaid_leave_days ?? '-', color: 'text-orange-600 dark:text-orange-400' },
                  { label: t('LOP Days'),          value: pe.lop_days          ?? '-', color: 'text-red-600 dark:text-red-400' },
                  { label: t('Effective Paid Days'), value: pe.effective_paid_days ?? '-', color: 'text-primary font-semibold' },
                  { label: t('Overtime Hours'),    value: pe.overtime_hours    ?? '-', color: 'text-purple-600 dark:text-purple-400' },
                ];
                return (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400  tracking-wide mb-2">{t('Attendance')}</div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {rows.map((row, i) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-1.5 ${ i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800' }`}>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                          <span className={`text-xs font-medium ${row.color || 'text-gray-800 dark:text-gray-200'}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Salary Calculation ── */}
              {(() => {
                const pe = viewingPayslip.payroll_entry;
                if (!pe) return null;
                return (
                  <div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400  tracking-wide mb-2">{t('Gross Pay Calculation')}</div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

                      {/* Basic Salary */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-900">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('Basic Salary')}</span>
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 font-mono">{window.appSettings?.formatCurrency(pe.basic_salary || 0)}</span>
                      </div>

                      {/* Component Earnings */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('Component Earnings')}</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">+{window.appSettings?.formatCurrency(pe.component_earnings || 0)}</span>
                      </div>

                      {/* Total Earnings subtotal */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('Total Earnings')} <span className="font-normal text-gray-400">(Basic + Components)</span></span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">{window.appSettings?.formatCurrency(pe.total_earnings || 0)}</span>
                      </div>

                      {/* LOP Deduction */}
                      {(pe.lop_deduction > 0) && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t('LOP Deduction')}</span>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 font-mono">-{window.appSettings?.formatCurrency(pe.lop_deduction || 0)}</span>
                        </div>
                      )}

                      {/* Unpaid Leave Deduction */}
                      {(pe.unpaid_leave_deduction > 0) && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t('Unpaid Leave Deduction')}</span>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 font-mono">-{window.appSettings?.formatCurrency(pe.unpaid_leave_deduction || 0)}</span>
                        </div>
                      )}

                      {/* Overtime */}
                      {(pe.overtime_amount > 0) && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t('Overtime Earnings')}</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">+{window.appSettings?.formatCurrency(pe.overtime_amount || 0)}</span>
                        </div>
                      )}

                      {/* Gross Pay result */}
                      <div className="flex items-center justify-between px-3 py-2 bg-primary/5 dark:bg-primary/10 border-t-2 border-primary/20">
                        <div>
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-100">{t('Gross Pay')}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t('Total Earnings − LOP − Unpaid Leave + Overtime')}</div>
                        </div>
                        <span className="text-sm font-bold text-primary font-mono">{window.appSettings?.formatCurrency(pe.gross_pay || 0)}</span>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* ── Earnings ── */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide">{t('Earnings / Allowances')}</span>
                </div>
                {(() => {
                  const raw = viewingPayslip.payroll_entry?.earnings_breakdown;
                  const allItems = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.entries(raw).map(([name, amount]) => ({ name, amount })) : []);
                  // Filter out Basic Salary since it's already shown in Gross Pay Calculation
                  const items = allItems.filter((item: any) => {
                    const name = (item.name || item.component_name || '').toLowerCase();
                    return name !== 'basic salary' && name !== 'basic';
                  });
                  if (items.length === 0) return <p className="text-xs text-gray-400 dark:text-gray-500">{t('No additional allowances')}</p>;
                  return (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between px-3 py-1.5 ${ idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800' }`}>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{item.name || item.component_name}</span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">+{window.appSettings?.formatCurrency(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('Total Allowances')}</span>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                          +{window.appSettings?.formatCurrency(items.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0))}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Deductions ── */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide">{t('Deductions')}</span>
                </div>
                {(() => {
                  const raw = viewingPayslip.payroll_entry?.deductions_breakdown;
                  const items = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.entries(raw).map(([name, amount]) => ({ name, amount })) : []);
                  if (items.length === 0) return <p className="text-xs text-gray-400 dark:text-gray-500">{t('No deductions')}</p>;
                  return (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className={`flex items-center justify-between px-3 py-1.5 ${ idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800' }`}>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{item.name || item.component_name}</span>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 font-mono">-{window.appSettings?.formatCurrency(item.amount || 0)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('Total Deductions')}</span>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">-{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.total_deductions || 0)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Final Summary ── */}
              <div className="rounded-lg border-2 border-primary/20 dark:border-primary/30 overflow-hidden">
                <div className="bg-primary/5 dark:bg-primary/10 px-3 py-2 border-b border-primary/20">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide">{t('Net Pay Summary')}</span>
                </div>
                <div className="px-3 py-2 space-y-1.5 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('Basic Salary')}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono">{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.basic_salary || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('Total Earnings')}</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">+{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.total_earnings || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('Gross Pay')}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono">{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.gross_pay || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('Total Deductions')}</span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 font-mono">-{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.total_deductions || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t-2 border-primary/20 mt-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Net Pay')}</span>
                    <span className="text-base font-bold text-primary font-mono">{window.appSettings?.formatCurrency(viewingPayslip.payroll_entry?.net_pay || 0)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">{t('Net Pay = Gross Pay − Total Deductions')}</p>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </PageTemplate>
  );
}
