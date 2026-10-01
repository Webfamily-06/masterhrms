import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog } from '@/components/ui/dialog';
import View from './view';
import { useInitials } from '@/hooks/use-initials';
import { Plus, FileText, LayoutGrid, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import MediaPicker from '@/components/MediaPicker';
import { getImagePath } from '@/utils/helpers';

export default function Promotions() {
  const { t } = useTranslation();
  const { auth, promotions, employees, designations, filters: pageFilters = {}, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedEmployee, setSelectedEmployee] = useState(pageFilters.employee_id || '_empty_');
  const [selectedDesignation, setSelectedDesignation] = useState(pageFilters.designation_id || '_empty_');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || '_empty_');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [pageInitialState, setPageInitialState] = useState(true);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingItem, setViewingItem] = useState<any>(null);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedEmployee !== '_empty_' || selectedDesignation !== '_empty_' || selectedStatus !== '_empty_' || dateFrom !== undefined || dateTo !== undefined || searchTerm !== '';
  };

  // Count active filters
  const activeFilterCount = () => {
    return (selectedEmployee !== '_empty_' ? 1 : 0) +
      (selectedDesignation !== '_empty_' ? 1 : 0) +
      (selectedStatus !== '_empty_' ? 1 : 0) +
      (dateFrom ? 1 : 0) +
      (dateTo ? 1 : 0) +
      (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.promotions.index'), {
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      designation_id: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
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
    router.get(route('hr.promotions.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      designation_id: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
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

    router.get(route('hr.promotions.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
      designation_id: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
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
        setViewingItem(item);
        break;
      case 'edit':
        setFormMode('edit');
        setIsFormModalOpen(true);
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'update-status':
        setIsStatusModalOpen(true);
        break;
      case 'download-document':
        window.open(route('hr.promotions.download-document', item.id), '_blank');
        break;
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    const data = formData;

    if (formMode === 'create') {
      toast.loading(t('Creating promotion...'));

      router.post(route('hr.promotions.store'), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(t('Failed to create promotion: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    } else if (formMode === 'edit') {
      toast.loading(t('Updating promotion...'));

      router.put(route('hr.promotions.update', currentItem.id), data, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
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
            toast.error(t('Failed to update promotion: {{errors}}', { errors: Object.values(errors).join(', ') }));
          }
        }
      });
    }
  };

  const handleStatusUpdate = (status: string) => {
    toast.loading(t('Updating promotion status...'));

    router.put(route('hr.promotions.update-status', currentItem.id), { status }, {
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
          toast.error(t('Failed to update promotion status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting promotion...'));

    router.delete(route('hr.promotions.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
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
          toast.error(t('Failed to delete promotion: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.promotions.index'));
  };

  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [selectedEmployee, selectedDesignation, selectedStatus, dateFrom, dateTo]);

  // Define page actions
  const pageActions = [];

  // Add the "Add New Promotion" button if user has permission
  if (hasPermission(permissions, 'create-promotions')) {
    pageActions.push({
      label: t('Add Promotion'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employee Lifecycle') },
    { title: t('Promotions') }
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
      key: 'previous_designation',
      label: t('Previous Designation'),
      render: (_, row) => row.prev_designation?.name || row.previous_designation || '-'
    },
    {
      key: 'designation.name',
      label: t('New Designation'),
      render: (_, row) => row.designation?.name || '-'
    },
    {
      key: 'promotion_date',
      label: t('Promotion Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'effective_date',
      label: t('Effective Date'),
      sortable: true,
      type: 'date'
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => {
        let badgeClass = '';
        switch (value) {
          case 'pending':
            badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            break;
          case 'approved':
            badgeClass = 'bg-green-100 text-green-800 border-green-200';
            break;
          case 'rejected':
            badgeClass = 'bg-red-100 text-red-800 border-red-200';
            break;
          default:
            badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
        }

        return (
          <Badge className={`${badgeClass} capitalize`}>
            {value}
          </Badge>
        );
      }
    },
    {
      key: 'document',
      label: t('Document'),
      render: (value, row) => value && value.trim() !== '' ? (
        <a
          href={getImagePath(value)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center text-blue-700 hover:text-blue-900 transition-colors"
          title={t('View Document')}
        >
          <FileText className="h-4 w-4" />
        </a>
      ) : '-'
    }
  ];

  // Define table actions
  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-promotions'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-promotions'
    },
    {
      label: t('Update Status'),
      icon: 'RefreshCw',
      action: 'update-status',
      className: 'text-green-500',
      requiredPermission: ['approve-promotions','reject-promotions']
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-promotions'
    }
  ];

  // Prepare employee options for filter
  const employeeOptions = [
    { value: '_empty_', label: t('All Employees') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} (${emp.employee_id})`
    }))
  ];

  // Prepare designation options for filter
  const designationOptions = [
    { value: '_empty_', label: t('All Designations') },
    ...(designations || []).map((des: any) => ({
      value: des.id.toString(),
      label: `${des.name} - ${des.department?.name || ''} (${des.department?.branch?.name || ''})`
    }))
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? 0 },
    { value: 'pending', label: t('Pending'), icon: <Clock className="h-4 w-4" />, count: statusCounts.pending ?? 0 },
    { value: 'approved', label: t('Approved'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.approved ?? 0 },
    { value: 'rejected', label: t('Rejected'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.rejected ?? 0 },
  ];

  return (
    <PageTemplate
      title={t("Promotions")}
      description={t("Manage employee promotions and career advancements.")}
      url="/hr/promotions"
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
            // ...(hasPermission(permissions, 'manage-any-promotions') ? [{
            //   name: 'employee_id',
            //   label: t('Employee'),
            //   type: 'select',
            //   value: selectedEmployee,
            //   onChange: setSelectedEmployee,
            //   options: employeeOptions,
            //   searchable: true,
            // }] : []),
            {
              name: 'designation_id',
              label: t('Designation'),
              type: 'select',
              value: selectedDesignation,
              onChange: setSelectedDesignation,
              options: designationOptions,
              searchable: true,
            },
            {
              name: 'date_from',
              label: t('Date From'),
              type: 'date',
              value: dateFrom,
              onChange: setDateFrom
            },
            {
              name: 'date_to',
              label: t('Date To'),
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
          data={promotions?.data || []}
          from={promotions?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-promotions',
            create: 'create-promotions',
            edit: 'edit-promotions',
            delete: 'delete-promotions'
          }}
        />

        {/* Pagination section */}
        <Pagination
          from={promotions?.from || 0}
          to={promotions?.to || 0}
          total={promotions?.total || 0}
          links={promotions?.links}
          entityName={t("promotions")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.promotions.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              employee_id: selectedEmployee !== '_empty_' ? selectedEmployee : undefined,
              designation_id: selectedDesignation !== '_empty_' ? selectedDesignation : undefined,
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
            {
              name: 'employee_selection',
              type: 'dependent-dropdown',
              showWhen: (formData) => !formData.is_company_wide,
              dependentConfig: [
                {
                    name: 'employee_id',
                    label: t('Employee'),
                    type: 'select',
                    required: true,
                    placeholder: t('Select Employee'),
                    options: employeeOptions.filter(opt => opt.value !== '_empty_')
                },
                ...(formMode === 'create'
                ? [{
                    name: 'previous_designation_id',
                    label: t('Previous Designation'),
                    required: true,
                    showCurrentValue: true,
                    disabled: true,
                    selectFirstOption: true,
                    apiEndpoint: '/hr/promotions/get-employee-current-designation/{employee_id}'
                }]
                : [])
              ]
            },
            {
              name: 'designation_id',
              label: t('New Designation'),
              type: 'select',
              required: true,
              searchable: true,
              placeholder: t('Select New Designation'),
              options: (designations || []).map((des: any) => ({
                value: des.id.toString(),
                label: `${des.name} - ${des.department?.name || ''} (${des.department?.branch?.name || ''})`
              }))
            },
            {
              name: 'promotion_date',
              label: t('Promotion Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Promotion Date')
            },
            {
              name: 'effective_date',
              label: t('Effective Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Effective Date')
            },
            {
              name: 'reason',
              label: t('Reason for Promotion'),
              type: 'textarea',
              placeholder: t('e.g. Exceptional performance and leadership skills...')
            },
            {
              name: 'document',
              label: t('Document'),
              type: 'custom',
              render: (field, formData, handleChange) => (
                <MediaPicker
                  value={String(formData[field.name] || '')}
                  onChange={(url) => handleChange(field.name, url)}
                  placeholder={t('Select document file...')}
                />
              )
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'rejected', label: t('Rejected') }
              ],
              defaultValue: 'pending'
            }
          ],
          modalSize: 'lg'
        }}
        initialData={currentItem}
        title={
          formMode === 'create'
            ? t('Add New Promotion')
            : t('Edit Promotion')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={`${currentItem?.employee?.name || ''} - ${currentItem?.designation?.name || ''}`}
        entityName="promotion"
      />
      {/* View Modal */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        {viewingItem && <View promotion={viewingItem} />}
      </Dialog>

      {/* Status Update Modal */}
      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={(data) => handleStatusUpdate(data.status)}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'pending', label: t('Pending') },
                { value: 'approved', label: t('Approved') },
                { value: 'rejected', label: t('Rejected') }
              ],
              defaultValue: currentItem?.status || 'pending'
            }
          ],
          modalSize: 'sm'
        }}
        initialData={currentItem ? { status: currentItem.status } : { status: 'pending' }}
        title={t('Update Promotion Status')}
        mode="edit"
      />
    </PageTemplate>
  );
}
