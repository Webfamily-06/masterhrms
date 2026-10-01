// pages/plans/plan-orders.tsx
import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getImagePath } from '@/utils/helpers';
import View from './plan-orders/view';
import { FileText, LayoutGrid, Clock, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';

export default function PlanOrdersPage() {
  const { t } = useTranslation();
  const { planOrders, filters: pageFilters = {}, auth, currencySymbol, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedStatus !== '_empty_' ? 1 : 0) +
           (dateFrom !== undefined ? 1 : 0) +
           (dateTo !== undefined ? 1 : 0) +
           (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    const params: any = { page: 1 };
    if (searchTerm) params.search = searchTerm;
    if (selectedStatus !== '_empty_') params.status = selectedStatus;
    if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0];
    if (dateTo) params.date_to = dateTo.toISOString().split('T')[0];
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    router.get(route('plan-orders.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    const params: any = { sort_field: field, sort_direction: direction, page: 1 };
    if (searchTerm) params.search = searchTerm;
    if (selectedStatus !== '_empty_') params.status = selectedStatus;
    if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0];
    if (dateTo) params.date_to = dateTo.toISOString().split('T')[0];
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    router.get(route('plan-orders.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    const params: any = { page: pageNum };
    if (searchTerm) params.search = searchTerm;
    if (selectedStatus !== '_empty_') params.status = selectedStatus;
    if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0];
    if (dateTo) params.date_to = dateTo.toISOString().split('T')[0];
    if (pageFilters.per_page) params.per_page = pageFilters.per_page;
    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
    router.get(route('plan-orders.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    if (action === 'view') {
      setViewingItem(item);
    } else if (action === 'approve') {
      if (!globalSettings?.is_demo) {
        toast.loading(t('Approving plan order...'));
      }

      router.post(route('plan-orders.approve', item.id), {}, {
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
            toast.error(t(errors));
          } else {
            toast.error(t('Failed to approve plan order: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (action === 'reject') {
      setIsRejectModalOpen(true);
    }
  };

  const handleRejectConfirm = (notes: string) => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Rejecting plan order...'));
    }

    router.post(route('plan-orders.reject', currentItem.id), { notes }, {
      onSuccess: (page) => {
        setIsRejectModalOpen(false);
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
          toast.error(t('Failed to reject plan order: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('plan-orders.index'));
  };

  const [pageInitialState, setPageInitialState] = useState(true);

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedStatus, dateFrom, dateTo]);

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Plans'), href: route('plans.index') },
    { title: t('Plan Orders') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'order_number',
      label: t('Order Number'),
      render: (value) => value || '-'
    },
    {
      key: 'user.name',
      label: t('Name'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.user?.avatar ? (
            <img
              src={getImagePath(row.user.avatar)}
              alt={row.user.name}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white flex-shrink-0 ${row.user?.avatar ? 'hidden' : ''}`}>
            {getInitials(row.user?.name || '')}
          </div>
          <div>
            <div className="font-medium">{row.user?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.user?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'plan.name',
      label: t('Plan'),
      render: (_, row) => {
        const planName = row.plan?.name;
        if (!planName) return '-';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
            {planName}
          </span>
        );
      }
    },
    {
      key: 'original_price',
      label: t('Original Price'),
      render: (value) => <span className="font-mono">{`${currencySymbol}${value || 0}`}</span>
      },
    {
      key: 'discount_amount',
      label: t('Discount'),
      render: (value) => value > 0 ? <span className="font-mono">{`-${currencySymbol}${value}`}</span> : '-'
    },
    {
      key: 'final_price',
      label: t('Final Price'),
      sortable: true,
      render: (value) => <span className="font-mono">{`${currencySymbol}${value || 0}`}</span>
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => {
        const statusColors: Record<string, string> = {
          pending:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          approved:  'bg-green-50 text-green-700 ring-green-600/20',
          rejected:  'bg-red-50 text-red-700 ring-red-600/20',
          completed: 'bg-blue-50 text-blue-700 ring-blue-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${statusColors[value] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
            {t(value)}
          </span>
        );
      }
    },
    {
      key: 'receipt',
      label: t('Receipt'),
      render: (value) => {
        if (!value) return '-';
        return (
          <button
            type="button"
            onClick={() => window.open(value, '_blank')}
            className="inline-flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
            title={t('View receipt')}
          >
            <FileText className="h-4 w-4" />
          </button>
        );
      }
    },
    {
      key: 'ordered_at',
      label: t('Order Date'),
      sortable: true,
      type: 'date'
    }
  ];

  // Define table actions - only visible to super admin
  const isSuperAdmin = auth?.user?.type === 'superadmin';
  const actions = isSuperAdmin ? [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-plan-orders'
    },
    {
      label: t('Approve'),
      icon: 'Check',
      action: 'approve',
      className: 'text-green-500',
      requiredPermission: 'approve-plan-orders',
      condition: (row) => row.status === 'pending'
    },
    {
      label: t('Reject'),
      icon: 'X',
      action: 'reject',
      className: 'text-red-500',
      requiredPermission: 'reject-plan-orders',
      condition: (row) => row.status === 'pending'
    }
  ] : [];

  // Prepare status options for filter
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'pending', label: t('Pending'), icon: <Clock className="h-4 w-4" />, count: statusCounts.pending ?? 0 },
    { value: 'approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.approved ?? 0 },
    { value: 'rejected', label: t('Rejected'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.rejected ?? 0 },
  ];

  return (
    <PageTemplate
      title={t('Plan Orders')}
      url="/plan-orders"
      description={t('View and manage all plan orders from companies.')}
      breadcrumbs={breadcrumbs}
      noPadding
    >
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
              name: 'date_from',
              label: t('Date From'),
              type: 'date',
              value: dateFrom,
              onChange: (date: Date | undefined) => setDateFrom(date)
            },
            {
              name: 'date_to',
              label: t('Date To'),
              type: 'date',
              value: dateTo,
              onChange: (date: Date | undefined) => setDateTo(date)
            }
          ]}
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
          data={planOrders?.data || []}
          from={planOrders?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
        />

        {/* Pagination section */}
        <Pagination
          from={planOrders?.from || 0}
          to={planOrders?.to || 0}
          total={planOrders?.total || 0}
          links={planOrders?.links}
          entityName={t("plan orders")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            const params: any = { page: 1, per_page: parseInt(value) };
            if (searchTerm) params.search = searchTerm;
            if (selectedStatus !== '_empty_') params.status = selectedStatus;
            if (dateFrom) params.date_from = dateFrom.toISOString().split('T')[0];
            if (dateTo) params.date_to = dateTo.toISOString().split('T')[0];
            if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
            if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
            router.get(route('plan-orders.index'), params, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View planOrder={viewingItem} />}
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Plan Order')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const notes = formData.get('notes') as string;
            handleRejectConfirm(notes);
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">{t('Rejection Reason (Optional)')}</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder={t('Enter rejection reason...')}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="destructive">
                {t('Reject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
