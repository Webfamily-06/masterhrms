// pages/hr/performance/employee-reviews/index.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { useInitials } from '@/hooks/use-initials';
import { Plus, ClipboardList, LayoutGrid, CalendarClock, Loader2, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function EmployeeReviews() {
  const { t } = useTranslation();
  const { auth, reviews, employees, reviewCycles, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedReviewer, setSelectedReviewer] = useState(pageFilters.reviewer_id || '_empty_');
  const [selectedReviewCycle, setSelectedReviewCycle] = useState(pageFilters.review_cycle_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedStatus !== '_empty_' ||
           searchTerm !== '' ||
           selectedEmployee !== '_empty_' ||
           selectedReviewer !== '_empty_' ||
           selectedReviewCycle !== '_empty_' ||
           dateFrom !== undefined ||
           dateTo !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedStatus !== '_empty_' ? 1 : 0) +
           (searchTerm ? 1 : 0) +
           (selectedEmployee !== '_empty_' ? 1 : 0) +
           (selectedReviewer !== '_empty_' ? 1 : 0) +
           (selectedReviewCycle !== '_empty_' ? 1 : 0) +
           (dateFrom ? 1 : 0) +
           (dateTo ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.performance.employee-reviews.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      reviewer_id: selectedReviewer !== '_empty_' ? selectedReviewer : undefined,
      review_cycle_id: selectedReviewCycle !== '_empty_' ? selectedReviewCycle : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.performance.employee-reviews.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      reviewer_id: selectedReviewer !== '_empty_' ? selectedReviewer : undefined,
      review_cycle_id: selectedReviewCycle !== '_empty_' ? selectedReviewCycle : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.performance.employee-reviews.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      reviewer_id: selectedReviewer !== '_empty_' ? selectedReviewer : undefined,
      review_cycle_id: selectedReviewCycle !== '_empty_' ? selectedReviewCycle : undefined,
      status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
      date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
      date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.visit(route('hr.performance.employee-reviews.show', item.id));
        break;
      case 'conduct':
        router.visit(route('hr.performance.employee-reviews.conduct', item.id));
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'update-status':
        handleUpdateStatus(item);
        break;
    }
  };

  const handleAddNew = () => {
    router.visit(route('hr.performance.employee-reviews.create'));
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting employee review...'));

    router.delete(route('hr.performance.employee-reviews.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete review: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleUpdateStatus = (review: any) => {
    // Determine next status based on current status
    let nextStatus = 'in_progress';
    if (review.status === 'scheduled') {
      nextStatus = 'in_progress';
    } else if (review.status === 'in_progress') {
      nextStatus = 'completed';
    } else {
      nextStatus = 'scheduled';
    }

    if (!globalSettings?.is_demo) toast.loading(t('Updating review status to {{status}}...', { status: t(nextStatus) }));

    router.put(route('hr.performance.employee-reviews.update-status', review.id), { status: nextStatus }, {
      onSuccess: (page) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update review status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.performance.employee-reviews.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedReviewer, selectedReviewCycle, selectedStatus, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Schedule Review" button if user has permission
  if (hasPermission(permissions, 'create-employee-reviews')) {
    pageActions.push({
      label: t('Schedule Review'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },

    { title: t('Performance Management') },
    { title: t('Employee Reviews') }
  ];

  // Define table columns
  const columns = [
    {
      key: 'employee.name',
      label: t('Employee'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
            {row.employee?.avatar ? (
              <img src={row.employee.avatar} alt={row.employee?.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(row.employee?.name || '')
            )}
          </div>
          <div>
            <div className="font-medium">{row.employee?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.employee?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'reviewer.name',
      label: t('Reviewer'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden shrink-0">
            {row.reviewer?.avatar ? (
              <img src={row.reviewer.avatar} alt={row.reviewer?.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(row.reviewer?.name || '')
            )}
          </div>
          <div>
            <div className="font-medium">{row.reviewer?.name || '-'}</div>
            <div className="text-sm text-muted-foreground">{row.reviewer?.email || ''}</div>
          </div>
        </div>
      )
    },
    {
      key: 'review_cycle.name',
      label: t('Review Cycle'),
      render: (value: string, row: any) => row.review_cycle?.name || '-'
    },
    {
      key: 'review_date',
      label: t('Review Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'overall_rating',
      label: t('Rating'),
      render: (value: number) => value ? value.toFixed(1) : '-'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value: string) => {
        let statusClass = '';
        let statusText = '';

        switch(value) {
          case 'scheduled':
            statusClass = 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            statusText = t('Scheduled');
            break;
          case 'in_progress':
            statusClass = 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
            statusText = t('In Progress');
            break;
          case 'completed':
            statusClass = 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
            statusText = t('Completed');
            break;
          default:
            statusClass = 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
            statusText = value;
        }

        return (
          <Badge variant="outline" className={statusClass}>
            {statusText}
          </Badge>
        );
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
      requiredPermission: 'view-employee-reviews'
    },
    {
      label: t('Conduct Review'),
      icon: 'ClipboardList',
      action: 'conduct',
      className: 'text-green-500',
      requiredPermission: 'edit-employee-reviews',
      condition: (item: any) => item.status !== 'completed'
    },
    {
      label: t('Update Status'),
      icon: 'RefreshCw',
      action: 'update-status',
      className: 'text-amber-500',
      requiredPermission: 'edit-employee-reviews'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-employee-reviews',
      condition: (item: any) => item.status !== 'completed'
    }
  ];


  // Prepare filter options
  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'scheduled', label: t('Scheduled'), icon: <CalendarClock className="h-4 w-4" />, count: statusCounts.scheduled ?? 0 },
    { value: 'in_progress', label: t('In Progress'), icon: <Loader2 className="h-4 w-4" />, count: statusCounts.in_progress ?? 0 },
    { value: 'completed', label: t('Completed'), icon: <BadgeCheck className="h-4 w-4" />, count: statusCounts.completed ?? 0 },
  ];

  // Prepare employee options
  const employeeOptions = [
    { value: '_empty_', label: t('Select Employee'), disabled: true },
    ...(employees || []).map((employee: any) => ({
      value: employee.id.toString(),
      label: `${employee.name}  (${employee.employee_id})`
    }))
  ];

  // Prepare review cycle options
  const reviewCycleOptions = [
    { value: '_empty_', label: t('All Review Cycle'), disabled: true },
    ...(reviewCycles || []).map((cycle: any) => ({
      value: cycle.id.toString(),
      label: cycle.name
    }))
  ];

  return (
    <PageTemplate
      title={t("Employee Reviews")}
      description={t("Manage performance reviews for your employees.")}
      url="/hr/performance/employee-reviews"
      actions={pageActions}
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
            // {
            //   name: 'employee_id',
            //   label: t('Employee'),
            //   type: 'select',
            //   value: selectedEmployee,
            //   onChange: setSelectedEmployee,
            //   options: employeeOptions,
            //   searchable: true
            // },
            // {
            //   name: 'reviewer_id',
            //   label: t('Reviewer'),
            //   type: 'select',
            //   value: selectedReviewer,
            //   onChange: setSelectedReviewer,
            //   options: employeeOptions,
            //   searchable: true
            // },
            {
              name: 'review_cycle_id',
              label: t('Review Cycle'),
              type: 'select',
              value: selectedReviewCycle,
              onChange: setSelectedReviewCycle,
              options: reviewCycleOptions,
              searchable: true
            },
            {
              name: 'date_from',
              label: t('From Date'),
              type: 'date',
              value: dateFrom,
              onChange: setDateFrom
            },
            {
              name: 'date_to',
              label: t('To Date'),
              type: 'date',
              value: dateTo,
              onChange: setDateTo
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
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
          data={reviews?.data || []}
          from={reviews?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-employee-reviews',
            create: 'create-employee-reviews',
            edit: 'edit-employee-reviews',
            delete: 'delete-employee-reviews'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={reviews?.from || 0}
          to={reviews?.to || 0}
          total={reviews?.total || 0}
          links={reviews?.links}
          entityName={t("employee reviews")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.performance.employee-reviews.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
              reviewer_id: selectedReviewer !== '_empty_' ? selectedReviewer : undefined,
              review_cycle_id: selectedReviewCycle !== '_empty_' ? selectedReviewCycle : undefined,
              status: selectedStatus !== '_empty_' ? selectedStatus : undefined,
              date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
              date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.first_name || ''} ${currentItem?.employee?.last_name || ''}'s review`}
        entityName="employee review"
      />
    </PageTemplate>
  );
}
