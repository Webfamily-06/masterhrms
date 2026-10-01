
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Calendar, Plus, LayoutGrid, FileText, Send, CheckCircle2, MessageSquare, XCircle, Clock, Kanban } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import UserInitials from '@/components/user-initials';

export default function Offers() {
  const { t } = useTranslation();
  const { auth, offers, candidates, departments, employees, jobPostings, currentUser, filters: pageFilters = {}, globalSettings, statusCounts = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [statusFilter, setStatusFilter] = useState(pageFilters.status || '_empty_');
  const [candidateFilter, setCandidateFilter] = useState(pageFilters.candidate_id || '_empty_');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  const hasActiveFilters = () => {
    return statusFilter !== '_empty_' || candidateFilter !== '_empty_' || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return (statusFilter !== '_empty_' ? 1 : 0) + (candidateFilter !== '_empty_' ? 1 : 0) + (searchTerm !== '' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('hr.recruitment.offers.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handlePageChange = (url: string) => {
    const pageNum = new URL(url).searchParams.get('page') || '1';
    router.get(route('hr.recruitment.offers.index'), {
      page: pageNum,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined,
      per_page: pageFilters.per_page,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    router.get(route('hr.recruitment.offers.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      status: statusFilter !== '_empty_' ? statusFilter : undefined,
      candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);

    switch (action) {
      case 'view':
        router.get(route('hr.recruitment.offers.show', item.id));
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
    }
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      if (!globalSettings?.is_demo) toast.loading(t('Creating offer...'));

      router.post(route('hr.recruitment.offers.store'), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Offer created successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to create offer: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    } else if (formMode === 'edit') {
      if (!globalSettings?.is_demo) toast.loading(t('Updating offer...'));

      router.put(route('hr.recruitment.offers.update', currentItem.id), formData, {
        onSuccess: (page) => {
          setIsFormModalOpen(false);
          if (!globalSettings?.is_demo) toast.dismiss();
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          } else {
            toast.success(t('Offer updated successfully'));
          }
        },
        onError: (errors) => {
          if (!globalSettings?.is_demo) toast.dismiss();
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to update offer: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) toast.loading(t('Deleting offer...'));

    router.delete(route('hr.recruitment.offers.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Offer deleted successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to delete offer: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleStatusUpdate = (formData: any) => {
    if (!globalSettings?.is_demo) toast.loading(t('Updating status...'));

    router.put(route('hr.recruitment.offers.update-status', currentItem.id), formData, {
      onSuccess: (page) => {
        setIsStatusModalOpen(false);
        if (!globalSettings?.is_demo) toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Status updated successfully'));
        }
      },
      onError: (errors) => {
        if (!globalSettings?.is_demo) toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to update status: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };

  const handleResetFilters = () => {
    router.get(route('hr.recruitment.offers.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'create-offers')) {
    pageActions.push({
      label: t('Create Offer'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  pageActions.push({
    icon: <Kanban className="h-4 w-4" />,
    variant: 'outline' as const,
    tooltip: t('Kanban View'),
    onClick: () => router.get(route('hr.recruitment.offers.kanban'))
  });

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Recruitment') },
    { title: t('Offers') }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-50 text-gray-600 ring-gray-500/10';
      case 'Sent': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'Accepted': return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'Negotiating': return 'bg-yellow-50 text-yellow-800 ring-yellow-600/20';
      case 'Declined': return 'bg-red-50 text-red-700 ring-red-600/10';
      case 'Expired': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
  };

  const columns = [
    {
      key: 'candidate.full_name',
      label: t('Candidate'),
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <UserInitials name={`${row.candidate?.first_name} ${row.candidate?.last_name}`} />
          <div>
            <div className="font-medium">{row.candidate?.first_name} {row.candidate?.last_name}</div>
            <div className="text-xs text-gray-500">{row.job?.title}</div>
          </div>
        </div>
      )
    },
    {
      key: 'salary',
      label: t('Salary'),
      render: (value, row) => (
        <div>
          <div className="font-medium font-mono">{window.appSettings?.formatCurrency(value)}</div>
        </div>
      )
    },
    {
      key: 'start_date',
      label: t('Start Date'),
      sortable: false,
      type: 'date'
    },
    {
      key: 'expiration_date',
      label: t('Expires'),
      sortable: false,
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        const isExpired = date < new Date();
        return (
          <div className={isExpired ? 'text-red-600' : 'text-gray-500'}>
            <div className="flex items-left gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
              {value && <Calendar className="h-4 w-4" />}
              <span>{window.appSettings?.formatDateTimeSimple(value, false) || '-'}</span>
            </div>
            {isExpired && <div className="text-xs">Expired</div>}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: t('Status'),
      render: (value) => (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(value)}`}>
          {t(value)}
        </span>
      )
    },
    {
      key: 'offer_date',
      label: t('Offer Date'),
      sortable: false,
      type: 'date'
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-offers'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-offers',
      condition: (item: any) => !['Accepted', 'Declined'].includes(item.status)
    },
    {
      label: t('Update Status'),
      icon: 'RefreshCw',
      action: 'update-status',
      className: 'text-green-500',
      requiredPermission: 'approve-offers',
      condition: (item: any) => !['Accepted', 'Declined'].includes(item.status)
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-offers'
    }
  ];

  const statusTabs = [
    { value: '_empty_', label: t('All'), icon: <LayoutGrid className="h-4 w-4" />, count: statusCounts.all ?? (offers?.total || 0) },
    { value: 'Draft', label: t('Draft'), icon: <FileText className="h-4 w-4" />, count: statusCounts.Draft ?? 0 },
    { value: 'Sent', label: t('Sent'), icon: <Send className="h-4 w-4" />, count: statusCounts.Sent ?? 0 },
    { value: 'Accepted', label: t('Accepted'), icon: <CheckCircle2 className="h-4 w-4" />, count: statusCounts.Accepted ?? 0 },
    { value: 'Negotiating', label: t('Negotiating'), icon: <MessageSquare className="h-4 w-4" />, count: statusCounts.Negotiating ?? 0 },
    { value: 'Declined', label: t('Declined'), icon: <XCircle className="h-4 w-4" />, count: statusCounts.Declined ?? 0 },
    { value: 'Expired', label: t('Expired'), icon: <Clock className="h-4 w-4" />, count: statusCounts.Expired ?? 0 },
  ];

  const statusOptions = [
    { value: '_empty_', label: t('All Statuses'), disabled: true },
    { value: 'Draft', label: t('Draft') },
    { value: 'Sent', label: t('Sent') },
    { value: 'Accepted', label: t('Accepted') },
    { value: 'Negotiating', label: t('Negotiating') },
    { value: 'Declined', label: t('Declined') },
    { value: 'Expired', label: t('Expired') }
  ];

  const [pageInitialState, setPageInitialState] = useState(true);
  useEffect(() => {
    if (!pageInitialState) applyFilters();
    setPageInitialState(false);
  }, [searchTerm, statusFilter, candidateFilter]);

  const candidateOptions = [
    { value: '_empty_', label: t('All Candidates'), disabled: true },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const candidateSelectOptions = [
    { value: '_empty_', label: t('Select Candidate') },
    ...(candidates || []).map((candidate: any) => ({
      value: candidate.id.toString(),
      label: `${candidate.first_name} ${candidate.last_name}`
    }))
  ];

  const departmentOptions = [
    ...(departments || []).map((dept: any) => ({
      value: dept.id.toString(),
      label: `${dept.name} - ${dept.branch?.name || 'No Branch'}`
    }))
  ];

  const employeeOptions = [
    { value: '_empty_', label: t('Select Approver') },
    ...(employees || []).map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.name} - ${auth?.user?.name || 'Company'}`
    }))
  ];

  return (
    <PageTemplate
      title={t("Offers")}
      description={t("Manage job offers sent to candidates.")}
      url="/hr/recruitment/offers"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'candidate_id',
              label: t('Candidate'),
              type: 'select',
              value: candidateFilter,
              onChange: setCandidateFilter,
              options: candidateOptions,
              searchable: true
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          statusTabs={statusTabs}
          activeStatusTab={statusFilter}
          onStatusTabChange={setStatusFilter}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={offers?.data || []}
          from={offers?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-offers',
            create: 'create-offers',
            edit: 'edit-offers',
            delete: 'delete-offers'
          }}
        />

        <Pagination
          from={offers?.from || 0}
          to={offers?.to || 0}
          total={offers?.total || 0}
          links={offers?.links}
          entityName={t("offers")}
          onPageChange={handlePageChange}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.recruitment.offers.index'), {
              page: 1,
              per_page: parseInt(value),
              search: searchTerm || undefined,
              status: statusFilter !== '_empty_' ? statusFilter : undefined,
              candidate_id: candidateFilter !== '_empty_' ? candidateFilter : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        formConfig={{
          fields: [
            {
              name: 'candidate_id',
              type: 'dependent-dropdown',
              dependentConfig: [
                {
                  name: 'candidate_id',
                  label: t('Candidate'),
                  required: true,
                  placeholder: t('Select Candidate'),
                  searchable: true,
                  options: candidateSelectOptions.filter(opt => opt.value !== '_empty_')
                },
                {
                  name: 'position',
                  label: t('Position'),
                  required: true,
                  placeholder: t('Select Position'),
                  apiEndpoint: '/hr/recruitment/offers/candidate/{candidate_id}/job',
                  showCurrentValue: true,
                  searchable: true
                },
                {
                  name: 'department_id',
                  label: t('Department'),
                  required: false,
                  placeholder: t('Auto-filled from position'),
                  apiEndpoint: '/hr/recruitment/offers/job/{position}/departments',
                  searchable: false,
                  disabled: true,
                  selectFirstOption: true
                }
              ]
            },
            {
              name: 'salary',
              label: t('Salary'),
              type: 'number',
              required: true,
              min: 0,
              step: 0.01,
              placeholder: t('e.g. 5000.00')
            },
            {
              name: 'start_date',
              label: t('Start Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Start Date')
            },
            {
              name: 'expiration_date',
              label: t('Expiration Date'),
              type: 'date',
              required: true,
              placeholder: t('Select Expiration Date')
            },
            {
              name: 'approved_by',
              label: t('Approved By'),
              type: 'select',
              required: true,
              placeholder: t('Select Approver'),
              options: employeeOptions.filter(opt => opt.value !== '_empty_'),
              defaultValue: currentUser?.id?.toString()
            },
            {
              name: 'benefits',
              label: t('Benefits'),
              type: 'textarea',
              placeholder: t('e.g. Health insurance, 20 days annual leave, remote work...')
            }
          ],
          modalSize: 'xl'
        }}
        initialData={formMode === 'create' ? {} : formMode === 'view' ? {
          ...currentItem,
          candidate_id: currentItem?.candidate ? `${currentItem.candidate.first_name} ${currentItem.candidate.last_name}` : currentItem?.candidate_id,
          start_date: currentItem?.start_date ? new Date(currentItem.start_date).toISOString().split('T')[0] : currentItem?.start_date,
          expiration_date: currentItem?.expiration_date ? new Date(currentItem.expiration_date).toISOString().split('T')[0] : currentItem?.expiration_date
        } : {
          ...currentItem,
          start_date: currentItem?.start_date ? new Date(currentItem.start_date).toISOString().split('T')[0] : currentItem?.start_date,
          expiration_date: currentItem?.expiration_date ? new Date(currentItem.expiration_date).toISOString().split('T')[0] : currentItem?.expiration_date
        }}
        title={
          formMode === 'create'
            ? t('Create New Offer')
            : formMode === 'edit'
              ? t('Edit Offer')
              : t('View Offer')
        }
        mode={formMode}
      />

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem ? `${currentItem.candidate?.first_name} ${currentItem.candidate?.last_name} - ${currentItem.position}` : ''}
        entityName="offer"
      />

      <CrudFormModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleStatusUpdate}
        formConfig={{
          fields: [
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              required: true,
              placeholder: t('Select Status'),
              options: [
                { value: 'Draft', label: t('Draft') },
                { value: 'Sent', label: t('Sent') },
                { value: 'Accepted', label: t('Accepted') },
                { value: 'Negotiating', label: t('Negotiating') },
                { value: 'Declined', label: t('Declined') },
                { value: 'Expired', label: t('Expired') }
              ]
            },

          ]
        }}
        initialData={currentItem ? { status: currentItem.status } : {}}
        title={t('Update Offer Status')}
        mode="edit"
      />
    </PageTemplate>
  );
}
