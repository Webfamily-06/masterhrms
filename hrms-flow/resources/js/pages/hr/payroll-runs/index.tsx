import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, FileDown, FileUp, Calendar, LayoutGrid, FileText, Play, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { ImportModal } from '@/components/ImportModal';

export default function PayrollRuns() {
  const { t } = useTranslation();
  const { auth, payrollRuns, hasSampleFile, filters: pageFilters = {}, globalSettings, statusCounts = {}, monthLabel, selectedDate, months } = usePage().props as any;
  const permissions = auth?.permissions || [];

  // State
  const [pageInitialState, setPageInitialState] = useState(true);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const navigateYear = (direction: 'prev' | 'next') => {
    const current = selectedDate ? new Date(selectedDate) : new Date();
    current.setFullYear(current.getFullYear() + (direction === 'next' ? 1 : -1));
    router.get(route('hr.payroll-runs.index'), {
      page: pageFilters.page ?? 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      selected_date: current.toISOString().slice(0, 10),
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleMonthClick = (dateStr: string) => {
    router.get(route('hr.payroll-runs.index'), {
      page: pageFilters.page ?? 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      selected_date: dateStr,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedStatus, dateFrom, dateTo]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedStatus !== '_empty_' ? 1 : 0) + (dateFrom !== undefined ? 1 : 0) + (dateTo !== undefined ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.payroll-runs.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      selected_date: selectedDate,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.payroll-runs.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      selected_date: selectedDate,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.payroll-runs.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      selected_date: selectedDate,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.payroll-runs.show', item.id));
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'process':
        handleProcessPayroll(item);
        break;
      case 'generate-payslips':
        handleGeneratePayslips(item);
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Creating payroll run...'));
      }

      router.post(route('hr.payroll-runs.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(errors);
          } else {
            toast.error(`Failed to create payroll run: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Updating payroll run...'));
      }

      router.put(route('hr.payroll-runs.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(errors);
          } else {
            toast.error(`Failed to update payroll run: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting payroll run...'));
    }

    router.delete(route('hr.payroll-runs.destroy', currentItem.id), {
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
          toast.error(errors);
        } else {
          toast.error(`Failed to delete payroll run: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleProcessPayroll = (payrollRun: any) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Processing payroll...'));
    }

    router.post(route('hr.payroll-runs.process', payrollRun.id), {}, {
      onSuccess: (page) => {
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
          toast.error(errors);
        } else {
          toast.error(`Failed to process payroll: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleGeneratePayslips = (payrollRun: any) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Generating payslips...'));
    }

    router.post(route('hr.payslips.bulk-generate'), {
      payroll_run_id: payrollRun.id
    }, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
          // Redirect to payslips page to see generated payslips
          setTimeout(() => {
            router.get(route('hr.payslips.index'));
          }, 1000);
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error('Failed to generate payslips');
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.payroll-runs.index'));
  };

  const handleExport = async () => {
    try {
      const response = await fetch(route('hr.payroll-runs.export'), {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(t(data.message || 'Failed to export payroll runs'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_runs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error(t('Failed to export payroll runs'));
    }
  };

  // Define page actions
  const pageActions = [];

  // Add Export button
  if (hasPermission(permissions, 'export-payroll-runs')) {
    pageActions.push({
      label: t('Export'),
      icon: <FileDown className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: handleExport
    });
  }

  // Add Import button
  if (hasPermission(permissions, 'import-payroll-runs')) {
    pageActions.push({
      label: t('Import'),
      icon: <FileUp className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: () => setIsImportModalOpen(true)
    });
  }

  // Add the "Add New Payroll Run" button if user has permission
  if (hasPermission(permissions, 'create-payroll-runs')) {
    pageActions.push({
      label: t('Add Payroll Run'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Payroll Management') },
    { title: t('Payroll Runs') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'title',
      label: t('Title'),
      sortable: true
    },
    {
      key: 'payroll_frequency',
      label: t('Frequency'),
      render: (value: string) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {value === 'weekly' ? t('Weekly') : value === 'biweekly' ? t('Bi-Weekly') : t('Monthly')}
        </span>
      )
    },
    {
      key: 'pay_period',
      label: t('Pay Period'),
      render: (value: any, row: any) => (
        <div>
          <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500 mb-1">
            {row.pay_period_start && <Calendar className="h-4 w-4" />}
            <span>{window.appSettings?.formatDateTimeSimple(row.pay_period_start, false) || '-'}</span>
          </div>
          <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
            {row.pay_period_end && <Calendar className="h-4 w-4" />}
            <span>{window.appSettings?.formatDateTimeSimple(row.pay_period_end, false) || '-'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'pay_date',
      label: t('Pay Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'employee_count',
      label: t('Employees'),
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      )
    },
    {
      key: 'total_gross_pay',
      label: t('Gross Pay'),
      render: (value: number) => (
        <span className="font-mono text-green-600">{window.appSettings?.formatCurrency(value)}</span>
      )
    },
    {
      key: 'total_net_pay',
      label: t('Net Pay'),
      render: (value: number) => (
        <span className="font-mono text-blue-600">{window.appSettings?.formatCurrency(value)}</span>
      )
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        const statusColors = {
          draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
          processing: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          completed: 'bg-green-50 text-green-700 ring-green-600/20',
          cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[value as keyof typeof statusColors]}`}>
            {t(value.charAt(0).toUpperCase() + value.slice(1))}
          </span>
        );
      }
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View Details'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-payroll-runs'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-payroll-runs',
      condition: (item: any) => item.status === 'draft'
    },
    {
      label: t('Process'),
      icon: 'Play',
      action: 'process',
      className: 'text-green-500',
      requiredPermission: 'process-payroll-runs',
      condition: (item: any) => item.status === 'draft'
    },
    {
      label: t('Generate Payslips'),
      icon: 'FileText',
      action: 'generate-payslips',
      className: 'text-purple-500',
      requiredPermission: 'create-payslips',
      condition: (item: any) => item.status === 'completed'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-payroll-runs',
      condition: (item: any) => item.status === 'draft'
    }
  ];

  // Prepare options for filters
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (payrollRuns?.total || 0) },
    { value: 'draft', label: t('Draft'), icon: <FileText className="h-4 w-4" />, count: statusCounts.draft ?? 0 },
    { value: 'processing', label: t('Processing'), icon: <Play className="h-4 w-4" />, count: statusCounts.processing ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <CheckCircle className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
    { value: 'cancelled', label: t('Cancelled'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.cancelled ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Payroll Runs")}
      description={t("Process and manage payroll runs for each pay period.")}
      url="/hr/payroll-runs"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* ── Month + Year Switcher Card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4">

        {/* Year navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => navigateYear('prev')} className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {selectedDate && (
              <span className="flex flex-wrap items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h2>
              </span>
            )}
          </div>
          <button onClick={() => navigateYear('next')} className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Month strip (12 months grid) */}
        <div className="flex items-stretch">
          <button onClick={() => navigateYear('prev')} className="px-2 sm:px-3 flex items-center justify-center border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0">
            <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="grid grid-cols-6 sm:grid-cols-12 flex-1 min-w-0">
            {(months || []).map((m: any) => {
              const isSelected = selectedDate && m.month_code === selectedDate.slice(0, 7);
              return (
                <button
                  key={m.month_code}
                  onClick={() => handleMonthClick(m.date)}
                  className={`relative flex flex-col items-center justify-center py-2 sm:py-3 cursor-pointer transition-all border-r last:border-r-0 border-gray-100 dark:border-gray-800 ${isSelected ? 'bg-primary text-white'
                    : m.is_current_month ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                >
                  <span className="text-[10px] sm:text-[11px] font-medium tracking-wide">{m.month_name}</span>
                  {isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
          <button onClick={() => navigateYear('next')} className="px-2 sm:px-3 flex items-center justify-center border-l border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0">
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          // filters={[
          //   {
          //     name: 'date_from',
          //     label: t('Period From'),
          //     type: 'date',
          //     value: dateFrom,
          //     onChange: setDateFrom
          //   },
          //   {
          //     name: 'date_to',
          //     label: t('Period To'),
          //     type: 'date',
          //     value: dateTo,
          //     onChange: setDateTo
          //   }
          // ]}
          statusTabs={statusTabs}
          activeStatusTab={selectedStatus}
          onStatusTabChange={setSelectedStatus}
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
          data={payrollRuns?.data || []}
          from={payrollRuns?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-payroll-runs',
            create: 'create-payroll-runs',
            edit: 'edit-payroll-runs',
            delete: 'delete-payroll-runs'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={payrollRuns?.from || 0}
          to={payrollRuns?.to || 0}
          total={payrollRuns?.total || 0}
          links={payrollRuns?.links}
          entityName={t("payroll runs")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('hr.payroll-runs.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
              date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            { name: 'title', label: t('Title'), type: 'text', required: true, placeholder: t('e.g. April 2025 Monthly Payroll') },
            {
              name: 'payroll_frequency',
              label: t('Payroll Frequency'),
              type: 'select',
              required: true,
              placeholder: t('Select Payroll Frequency'),
              options: [
                { value: 'weekly', label: t('Weekly') },
                { value: 'biweekly', label: t('Bi-Weekly') },
                { value: 'monthly', label: t('Monthly') }
              ]
            },
            { name: 'pay_period_start', label: t('Pay Period Start'), type: 'date', required: true, placeholder: t('Select Pay Period Start') },
            { name: 'pay_period_end', label: t('Pay Period End'), type: 'date', required: true, placeholder: t('Select Pay Period End') },
            { name: 'pay_date', label: t('Pay Date'), type: 'date', required: true, placeholder: t('Select Pay Date') },
            { name: 'notes', label: t('Notes'), type: 'textarea', placeholder: t('e.g. Additional notes about this payroll run...') }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Payroll Run')
            : formMode === 'edit'
              ? t('Edit Payroll Run')
              : t('View Payroll Run')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.title || ''}
        entityName="payroll run"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t('Import Payroll Runs from CSV/Excel')}
        importRoute="hr.payroll-runs.import"
        parseRoute="hr.payroll-runs.parse"
        sampleRoute={hasSampleFile ? 'hr.payroll-runs.download.template' : undefined}
        importNotes={t('Ensure date formats are correct (YYYY-MM-DD). Payroll frequency must be weekly, biweekly, or monthly.')}
        modalSize="xl"
        databaseFields={[
          { key: 'title', required: true },
          { key: 'payroll_frequency', required: true },
          { key: 'pay_period_start', required: true },
          { key: 'pay_period_end', required: true },
          { key: 'pay_date', required: true },
          { key: 'notes' }
        ]}
      />
    </PageTemplate>
  );
}
